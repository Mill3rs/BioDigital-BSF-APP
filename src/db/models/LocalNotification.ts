import { Model } from '@nozbe/watermelondb';

export default class LocalNotification extends Model {
  static table = 'notifications';

  get serverId():  string | null { return this._getRaw('server_id') as string | null; }
  get title():     string        { return this._getRaw('title') as string; }
  get message():   string        { return this._getRaw('message') as string; }
  get notifType(): string        { return this._getRaw('type') as string; }
  get read():      boolean       { return this._getRaw('read') as boolean; }
  get metadata():  string | null { return this._getRaw('metadata') as string | null; }
  get createdAt(): Date          { return new Date(this._getRaw('created_at') as number); }
}
