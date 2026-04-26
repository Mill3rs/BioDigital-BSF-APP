import { synchronize } from '@nozbe/watermelondb/sync';
import { Database } from '@nozbe/watermelondb';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../api/client';

const LAST_PULLED_KEY = 'wdb_last_pulled_at';

// ─── Types matching the WatermelonDB sync protocol ─────────────────────────────

export type SyncPhase = 'idle' | 'pulling' | 'pushing' | 'error';

export interface SyncResult {
  success: boolean;
  error?: string;
  pulledAt?: number;
}

// ─── Pull: fetch server changes since lastPulledAt ────────────────────────────

async function pullChanges({ lastPulledAt }: { lastPulledAt?: number | null }) {
  const ts = lastPulledAt ?? 0;
  const { data } = await apiClient.get('/sync', {
    params: { lastPulledAt: ts },
  });

  if (!data.success) {
    throw new Error(data.message ?? 'Pull failed');
  }

  return {
    changes: data.changes as Record<
      string,
      { created: unknown[]; updated: unknown[]; deleted: string[] }
    >,
    timestamp: data.timestamp as number,
  };
}

// ─── Push: send local unsynced changes to server ─────────────────────────────

async function pushChanges({
  changes,
  lastPulledAt,
}: {
  changes: Record<string, { created: unknown[]; updated: unknown[]; deleted: string[] }>;
  lastPulledAt: number;
}) {
  const { data } = await apiClient.post('/sync', { changes, lastPulledAt });
  if (!data.success) {
    throw new Error(data.message ?? 'Push failed');
  }
}

// ─── Main sync function ───────────────────────────────────────────────────────

export async function runSync(
  db: Database,
  onPhaseChange?: (phase: SyncPhase) => void,
): Promise<SyncResult> {
  try {
    onPhaseChange?.('pulling');

    await synchronize({
      database: db,
      pullChanges,
      pushChanges: async (args) => {
        onPhaseChange?.('pushing');
        await pushChanges(args);
      },
      migrationsEnabledAtVersion: 1,
      sendCreatedAsUpdated: false,

    });

    onPhaseChange?.('idle');

    const pulledAt = Date.now();
    await AsyncStorage.setItem(LAST_PULLED_KEY, String(pulledAt));

    return { success: true, pulledAt };
  } catch (err) {
    onPhaseChange?.('error');
    const message = err instanceof Error ? err.message : 'Unknown sync error';
    console.warn('[Sync] Failed:', message);
    return { success: false, error: message };
  }
}

// ─── Last synced timestamp helper ─────────────────────────────────────────────

export async function getLastSyncedAt(): Promise<Date | null> {
  const raw = await AsyncStorage.getItem(LAST_PULLED_KEY);
  return raw ? new Date(parseInt(raw, 10)) : null;
}

export async function clearSyncState(): Promise<void> {
  await AsyncStorage.removeItem(LAST_PULLED_KEY);
}
