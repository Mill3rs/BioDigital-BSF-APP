/**
 * Sync Service
 * ────────────
 * Drains the offline waste queue (AsyncStorage) by sending each pending
 * record to the server. Simple and reliable — no custom sync protocol needed.
 */
import { drainQueue } from './wasteDbService';

export type SyncPhase = 'idle' | 'syncing' | 'error';

export interface SyncResult {
  success: boolean;
  synced:  number;
  failed:  number;
  error?:  string;
}

export async function runSync(
  onPhaseChange?: (phase: SyncPhase) => void,
): Promise<SyncResult> {
  onPhaseChange?.('syncing');
  try {
    const { synced, failed } = await drainQueue();
    onPhaseChange?.('idle');
    return { success: true, synced, failed };
  } catch (err) {
    onPhaseChange?.('error');
    const message = err instanceof Error ? err.message : 'Sync failed';
    console.warn('[Sync] Failed:', message);
    return { success: false, synced: 0, failed: 0, error: message };
  }
}


