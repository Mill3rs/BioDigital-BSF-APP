import { Model } from '@nozbe/watermelondb';

export default class WasteRecord extends Model {
  static table = 'waste_records';

  get serverId():        string | null  { return this._getRaw('server_id') as string | null; }
  get sourceName():      string         { return this._getRaw('source_name') as string; }
  get sourceType():      string         { return this._getRaw('source_type') as string; }
  get quantity():        number         { return this._getRaw('quantity') as number; }
  get unit():            string         { return this._getRaw('unit') as string; }
  get recordDate():      number         { return this._getRaw('date') as number; }
  get status():          string         { return this._getRaw('status') as string; }
  get description():     string | null  { return this._getRaw('description') as string | null; }
  get notes():           string | null  { return this._getRaw('notes') as string | null; }
  get locationLat():     number | null  { return this._getRaw('location_lat') as number | null; }
  get locationLng():     number | null  { return this._getRaw('location_lng') as number | null; }
  get locationAddress(): string | null  { return this._getRaw('location_address') as string | null; }
  get farmId():          string | null  { return this._getRaw('farm_id') as string | null; }
  get supplierId():      string | null  { return this._getRaw('supplier_id') as string | null; }
  get driverId():        string | null  { return this._getRaw('driver_id') as string | null; }
  get carbonSaved():     number | null  { return this._getRaw('carbon_saved') as number | null; }
  get pointsAwarded():   number | null  { return this._getRaw('points_awarded') as number | null; }
  get isSynced():        boolean        { return this._getRaw('is_synced') as boolean; }
  get createdAt():       Date           { return new Date(this._getRaw('created_at') as number); }
  get updatedAt():       Date           { return new Date(this._getRaw('updated_at') as number); }
}
