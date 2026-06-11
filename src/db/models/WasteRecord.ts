import { Model } from '@nozbe/watermelondb';
import type { Database } from '@nozbe/watermelondb';

export interface WasteRecordCreateData {
  sourceName:      string;
  sourceType:      string;
  quantity:        number;
  unit:            string;
  date:            number;   // unix ms
  status?:         string;
  description?:    string | null;
  notes?:          string | null;
  locationLat?:    number | null;
  locationLng?:    number | null;
  locationAddress?: string | null;
  farmId?:         string | null;
  supplierId?:     string | null;
}

export default class WasteRecord extends Model {
  static readonly table = 'waste_records';

  // ── Getters (read raw SQLite values) ────────────────────────────────────────
  get serverId():        string | null  { return this._getRaw('server_id')        as string | null; }
  get sourceName():      string         { return this._getRaw('source_name')       as string; }
  get sourceType():      string         { return this._getRaw('source_type')       as string; }
  get quantity():        number         { return this._getRaw('quantity')           as number; }
  get unit():            string         { return this._getRaw('unit')              as string; }
  get recordDateMs():    number         { return this._getRaw('date')              as number; }
  get recordDate():      Date           { return new Date(this.recordDateMs); }
  get status():          string         { return this._getRaw('status')            as string; }
  get description():     string | null  { return this._getRaw('description')       as string | null; }
  get notes():           string | null  { return this._getRaw('notes')            as string | null; }
  get locationLat():     number | null  { return this._getRaw('location_lat')      as number | null; }
  get locationLng():     number | null  { return this._getRaw('location_lng')      as number | null; }
  get locationAddress(): string | null  { return this._getRaw('location_address')  as string | null; }
  get farmId():          string | null  { return this._getRaw('farm_id')           as string | null; }
  get supplierId():      string | null  { return this._getRaw('supplier_id')       as string | null; }
  get driverId():        string | null  { return this._getRaw('driver_id')         as string | null; }
  get carbonSaved():     number | null  { return this._getRaw('carbon_saved')      as number | null; }
  get pointsAwarded():   number         { return (this._getRaw('points_awarded') as number) ?? 0; }
  get isSynced():        boolean        { return this._getRaw('is_synced')         as boolean; }
  get createdAtMs():     number         { return this._getRaw('created_at')        as number; }
  get updatedAtMs():     number         { return this._getRaw('updated_at')        as number; }
  get createdAt():       Date           { return new Date(this.createdAtMs); }
  get updatedAt():       Date           { return new Date(this.updatedAtMs); }

  // ── Computed helpers ─────────────────────────────────────────────────────────

  /** True while WatermelonDB has not yet confirmed sync with the server */
  get isPendingSync(): boolean {
    return (this._raw as any)._status !== 'synced';
  }

  get location(): { lat: number | null; lng: number | null; address: string | null } {
    return { lat: this.locationLat, lng: this.locationLng, address: this.locationAddress };
  }

  // ── Write helpers (call via database.write()) ────────────────────────────────

  /** Update notes on an existing record. Must be called inside database.write(). */
  async updateNotes(notes: string) {
    await this.update(record => {
      (record as any)._setRaw('notes', notes);
      (record as any)._setRaw('updated_at', Date.now());
    });
  }

  /** Mark a PENDING record as cancelled locally (before sync). */
  async cancelLocally() {
    await this.update(record => {
      (record as any)._setRaw('status', 'CANCELLED');
      (record as any)._setRaw('updated_at', Date.now());
    });
  }

  // ── Static factory ────────────────────────────────────────────────────────────

  /** Prepare a new WasteRecord for insertion. Pass to database.batch(). */
  static prepareCreate(
    db: Database,
    data: WasteRecordCreateData,
  ) {
    const collection = db.get<WasteRecord>('waste_records');
    const now = Date.now();
    return collection.prepareCreate(record => {
      const r = record as any;
      r._setRaw('source_name',      data.sourceName);
      r._setRaw('source_type',      data.sourceType);
      r._setRaw('quantity',         data.quantity);
      r._setRaw('unit',             data.unit);
      r._setRaw('date',             data.date);
      r._setRaw('status',           data.status ?? 'PENDING');
      r._setRaw('description',      data.description   ?? null);
      r._setRaw('notes',            data.notes         ?? null);
      r._setRaw('location_lat',     data.locationLat   ?? null);
      r._setRaw('location_lng',     data.locationLng   ?? null);
      r._setRaw('location_address', data.locationAddress ?? null);
      r._setRaw('farm_id',          data.farmId        ?? null);
      r._setRaw('supplier_id',      data.supplierId    ?? null);
      r._setRaw('is_synced',        false);
      r._setRaw('created_at',       now);
      r._setRaw('updated_at',       now);
    });
  }
}
