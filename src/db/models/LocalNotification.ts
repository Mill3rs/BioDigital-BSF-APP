import { Model } from '@nozbe/watermelondb';

export default class LocalNotification extends Model {
  static readonly table = 'notifications';

  // ── Getters ──────────────────────────────────────────────────────────────────
  get serverId():   string | null { return this._getRaw('server_id') as string | null; }
  get title():      string        { return this._getRaw('title')     as string; }
  get message():    string        { return this._getRaw('message')   as string; }
  get notifType():  string        { return this._getRaw('type')      as string; }
  get read():       boolean       { return this._getRaw('read')      as boolean; }
  get metadata():   string | null { return this._getRaw('metadata')  as string | null; }
  get createdAtMs(): number        { return this._getRaw('created_at') as number; }
  get createdAt():  Date          { return new Date(this.createdAtMs); }

  /** Parsed metadata object (null-safe). */
  get parsedMetadata(): Record<string, unknown> | null {
    const raw = this.metadata;
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  // ── Write helpers (call inside database.write()) ──────────────────────────────

  /** Mark this notification as read. */
  async markRead() {
    if (this.read) return;
    await this.update(n => {
      (n as any)._setRaw('read', true);
    });
  }
}
