import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import NetInfo from '@react-native-community/netinfo';
import { runSync, type SyncPhase } from '../services/syncService';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface SyncState {
  phase: SyncPhase;
  lastSyncedAt: Date | null;
  syncError: string | null;
  isOnline: boolean;
}

interface SyncContextValue extends SyncState {
  triggerSync: () => Promise<void>;
}

// ─── Context ───────────────────────────────────────────────────────────────────

const SyncContext = createContext<SyncContextValue | undefined>(undefined);

// Auto-sync interval: every 5 minutes while online
const AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000;

// ─── Provider ──────────────────────────────────────────────────────────────────

export function SyncProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SyncState>({
    phase: 'idle',
    lastSyncedAt: null,
    syncError: null,
    isOnline: true,
  });

  // Ref to track if sync is already running (avoid concurrent syncs)
  const syncingRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const performSync = useCallback(async () => {
    if (syncingRef.current) { return; }
    syncingRef.current = true;

    try {
      const result = await runSync((phase) => {
        setState((prev) => ({ ...prev, phase, syncError: null }));
      });

      setState((prev) => ({
        ...prev,
        phase: 'idle',
        lastSyncedAt: result.synced > 0 ? new Date() : prev.lastSyncedAt,
        syncError: result.error ?? null,
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setState((prev) => ({
        ...prev,
        phase: 'error',
        syncError: message,
      }));
    } finally {
      syncingRef.current = false;
    }
  }, []);

  // Network listener — sync whenever we come back online
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((netState) => {
      const isOnline = netState.isConnected === true && netState.isInternetReachable !== false;
      setState((prev) => {
        const wasOffline = !prev.isOnline;
        // Trigger sync on reconnect
        if (wasOffline && isOnline) {
          // Defer slightly so state update settles first
          setTimeout(performSync, 500);
        }
        return { ...prev, isOnline };
      });
    });

    return unsubscribe;
  }, [performSync]);

  // Periodic auto-sync while online
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (state.isOnline && state.phase === 'idle') {
        performSync();
      }
    }, AUTO_SYNC_INTERVAL_MS);

    return () => {
      if (intervalRef.current) { clearInterval(intervalRef.current); }
    };
  }, [state.isOnline, state.phase, performSync]);

  const triggerSync = useCallback(async () => {
    if (!state.isOnline) { return; }
    await performSync();
  }, [state.isOnline, performSync]);

  const value: SyncContextValue = { ...state, triggerSync };

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useSyncStore(): SyncContextValue {
  const ctx = useContext(SyncContext);
  if (!ctx) {
    throw new Error('useSyncStore must be used within a SyncProvider');
  }
  return ctx;
}
