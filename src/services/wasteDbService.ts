/**
 * wasteDbService — offline-first CRUD for WasteRecord.
 *
 * Strategy: try the API directly; if offline or the call fails, save to
 * an AsyncStorage queue. The SyncProvider drains the queue automatically
 * when connectivity is restored.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { wasteAPI } from '../api/waste';
import type { CreateWastePayload } from '../types';

const QUEUE_KEY = '@biodigital:pending_waste';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateWasteInput {
  sourceName:   string;
  sourceType:   string;
  quantity:     number;
  unit:         string;
  date:         string;       // ISO date string 'YYYY-MM-DD'
  description?: string | null;
  notes?:       string | null;
  location?: {
    lat?:     number;
    lng?:     number;
    address?: string;
  } | null;
  farmId?:      string | null;
  supplierId?:  string | null;
}

interface QueuedRecord extends CreateWasteInput {
  _queueId:  string;
  _queuedAt: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function readQueue(): Promise<QueuedRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedRecord[]) : [];
  } catch {
    return [];
  }
}

async function writeQueue(queue: QueuedRecord[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

function toPayload(input: CreateWasteInput): CreateWastePayload {
  return {
    sourceName:  input.sourceName,
    sourceType:  input.sourceType as CreateWastePayload['sourceType'],
    quantity:    input.quantity,
    unit:        input.unit,
    date:        input.date,
    description: input.description ?? undefined,
    notes:       input.notes       ?? undefined,
    farmId:      input.farmId      ?? undefined,
    location:    input.location
      ? { lat: input.location.lat, lng: input.location.lng, address: input.location.address }
      : undefined,
  };
}

// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * Try to POST the waste record to the server immediately.
 * If offline (or the call fails), saves to AsyncStorage for later retry.
 */
export async function createWasteRecord(input: CreateWasteInput): Promise<void> {
  const net = await NetInfo.fetch();
  const online = net.isConnected === true && net.isInternetReachable !== false;

  if (online) {
    try {
      await wasteAPI.create(toPayload(input));
      return;
    } catch {
      // Fall through — queue it so it retries on next sync
    }
  }

  const queue = await readQueue();
  queue.push({ ...input, _queueId: uid(), _queuedAt: Date.now() });
  await writeQueue(queue);
}

// ─── Queue management ─────────────────────────────────────────────────────────

/** Number of records waiting to be sent to the server. */
export async function getPendingCount(): Promise<number> {
  const queue = await readQueue();
  return queue.length;
}

/**
 * Attempt to flush all queued records to the server.
 * Records that succeed are removed; failures remain for the next attempt.
 */
export async function drainQueue(): Promise<{ synced: number; failed: number }> {
  const queue = await readQueue();
  if (queue.length === 0) { return { synced: 0, failed: 0 }; }

  let synced = 0;
  const remaining: QueuedRecord[] = [];

  for (const record of queue) {
    try {
      await wasteAPI.create(toPayload(record));
      synced++;
    } catch {
      remaining.push(record);
    }
  }

  await writeQueue(remaining);
  return { synced, failed: remaining.length };
}
