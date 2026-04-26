import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSyncStore } from '../store/syncStore';

function formatRelative(date: Date | null): string {
  if (!date) { return 'Never synced'; }
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) { return 'Just now'; }
  if (diffMin < 60) { return `${diffMin}m ago`; }
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) { return `${diffHr}h ago`; }
  return date.toLocaleDateString();
}

export default function SyncStatusBar() {
  const { phase, lastSyncedAt, syncError, isOnline, triggerSync } = useSyncStore();

  const isActiveSync = phase === 'pulling' || phase === 'pushing';

  // ── Determine bar style ──────────────────────────────────────────────────────
  let backgroundColor = '#2d7a4f'; // default green (synced)
  let statusText = `Synced ${formatRelative(lastSyncedAt)}`;

  if (!isOnline) {
    backgroundColor = '#6b7280';
    statusText = 'Offline — changes saved locally';
  } else if (isActiveSync) {
    backgroundColor = '#1e6091';
    statusText = phase === 'pulling' ? 'Pulling updates…' : 'Uploading changes…';
  } else if (phase === 'error') {
    backgroundColor = '#b91c1c';
    statusText = syncError ?? 'Sync failed';
  }

  return (
    <View style={[styles.bar, { backgroundColor }]}>
      <Text style={styles.text} numberOfLines={1}>
        {statusText}
      </Text>

      {isActiveSync ? (
        <ActivityIndicator size="small" color="#fff" style={styles.spinner} />
      ) : isOnline ? (
        <TouchableOpacity
          onPress={triggerSync}
          disabled={isActiveSync}
          style={styles.button}
          accessibilityLabel="Sync now"
        >
          <Text style={styles.buttonText}>
            {phase === 'error' ? 'Retry' : 'Sync'}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 6,
    minHeight: 32,
  },
  text: {
    flex: 1,
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  spinner: {
    marginLeft: 8,
  },
  button: {
    marginLeft: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  buttonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
});
