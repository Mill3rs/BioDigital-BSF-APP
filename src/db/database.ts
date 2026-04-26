import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import { dbSchema } from './schema';
import WasteRecord from './models/WasteRecord';
import LocalNotification from './models/LocalNotification';

// ── SQLite adapter ─────────────────────────────────────────────────────────────
const adapter = new SQLiteAdapter({
  schema: dbSchema,
  dbName: 'biodigital_bsf',
  jsi: true,          // Use JSI for better performance (requires rebuild on native)
  onSetUpError: (error) => {
    console.error('[WatermelonDB] Adapter setup error:', error);
  },
});

// ── Database singleton ─────────────────────────────────────────────────────────
export const database = new Database({
  adapter,
  modelClasses: [WasteRecord, LocalNotification],
});
