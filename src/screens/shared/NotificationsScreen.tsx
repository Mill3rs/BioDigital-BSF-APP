import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, SectionList, TouchableOpacity,
  ActivityIndicator, RefreshControl, StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { notificationsAPI } from '../../api/notifications';
import type { Notification } from '../../types';

const GREEN = '#1B5E20';
const ACCENT = '#2E7D32';
const BG = '#F7F8F5';

type FilterTab = 'All' | 'Today' | '7 Days' | '30 Days';
const FILTER_TABS: FilterTab[] = ['All', 'Today', '7 Days', '30 Days'];

function getDaysBucket(dateStr: string): 'today' | '7days' | '30days' | 'older' {
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now.getTime() - d.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (d.toDateString() === now.toDateString()) return 'today';
  if (diffDays <= 7) return '7days';
  if (diffDays <= 30) return '30days';
  return 'older';
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function getNotifIcon(title: string): string {
  if (title.includes('New Pickup Assigned')) return '📦';
  if (title.includes('Driver Assigned')) return '🚗';
  if (title.includes('Delivery Logged')) return '✅';
  if (title.includes('Delivery Verified')) return '🎉';
  if (title.includes('Collected')) return '✅';
  if (title.includes('Processing')) return '🏭';
  if (title.includes('Delivery Confirmed')) return '🎉';
  if (title.includes('Points')) return '⭐';
  if (title.includes('Order')) return '📦';
  return '🔔';
}

type Section = { title: string; data: Notification[] };

function buildSections(items: Notification[], tab: FilterTab): Section[] {
  if (tab !== 'All') {
    const filtered = items.filter(n => {
      const bucket = getDaysBucket(n.createdAt);
      if (tab === 'Today') return bucket === 'today';
      if (tab === '7 Days') return bucket === '7days';
      return bucket === '30days';
    });
    return filtered.length > 0 ? [{ title: tab, data: filtered }] : [];
  }
  const todayItems = items.filter(n => getDaysBucket(n.createdAt) === 'today');
  const sevenItems = items.filter(n => getDaysBucket(n.createdAt) === '7days');
  const thirtyItems = items.filter(n => getDaysBucket(n.createdAt) === '30days');
  const olderItems = items.filter(n => getDaysBucket(n.createdAt) === 'older');
  const result: Section[] = [];
  if (todayItems.length > 0) result.push({ title: 'Today', data: todayItems });
  if (sevenItems.length > 0) result.push({ title: '7 Days Ago', data: sevenItems });
  if (thirtyItems.length > 0) result.push({ title: '30 Days Ago', data: thirtyItems });
  if (olderItems.length > 0) result.push({ title: 'Older', data: olderItems });
  return result;
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('All');

  const load = useCallback(async () => {
    try {
      const res = await notificationsAPI.getAll();
      setNotifications(res.data);
    } catch {
      // keep existing
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  const markRead = async (id: string) => {
    try {
      await notificationsAPI.markRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch {
      // silent
    }
  };

  const markAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch {
      // silent
    }
  };

  const deleteNotif = async (id: string) => {
    try {
      await notificationsAPI.delete(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch {
      // silent
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const sections = buildSections(notifications, activeTab);

  const renderItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[styles.notifRow, !item.read && styles.notifRowUnread]}
      onPress={() => !item.read && markRead(item.id)}
      activeOpacity={0.75}>
      <View style={[styles.bellWrap, !item.read && styles.bellWrapUnread]}>
        <Text style={styles.bellIcon}>{getNotifIcon(item.title)}</Text>
        {!item.read && <View style={styles.unreadDot} />}
      </View>
      <View style={styles.notifContent}>
        <Text style={[styles.notifTitle, !item.read && styles.notifTitleUnread]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.notifBody} numberOfLines={2}>{item.message}</Text>
      </View>
      <View style={styles.notifRight}>
        <Text style={styles.notifTime}>{formatRelativeTime(item.createdAt)}</Text>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteNotif(item.id)}>
          <Text style={styles.deleteBtnText}>✕</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderSectionHeader = ({ section }: { section: Section }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{section.title}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllRead}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filter tabs */}
      <View style={styles.tabsRow}>
        {FILTER_TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      ) : null}
      {!loading && sections.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIconWrap}>
            <Text style={styles.emptyIconText}>🔕</Text>
          </View>
          <Text style={styles.emptyTitle}>No notifications</Text>
          <Text style={styles.emptySub}>You're all caught up!</Text>
        </View>
      ) : null}
      {!loading && sections.length > 0 ? (
        <SectionList
          sections={sections}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              colors={[ACCENT]}
              tintColor={ACCENT}
            />
          }
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#111', letterSpacing: -0.3 },
  markAllText: { fontSize: 13, fontWeight: '600', color: ACCENT },

  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 12,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E3DC',
    backgroundColor: '#FFF',
  },
  tabActive: { backgroundColor: GREEN, borderColor: GREEN },
  tabText: { fontSize: 13, fontWeight: '500', color: '#555' },
  tabTextActive: { color: '#FFF', fontWeight: '600' },

  listContent: { paddingHorizontal: 20, paddingBottom: 20 },

  sectionHeader: { paddingVertical: 8, paddingTop: 12 },
  sectionHeaderText: { fontSize: 12, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.6 },

  notifRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#EEF0EC',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  notifRowUnread: { borderLeftWidth: 3, borderLeftColor: GREEN },

  bellWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    flexShrink: 0,
    position: 'relative',
  },
  bellWrapUnread: { backgroundColor: '#E8F5E9' },
  bellIcon: { fontSize: 18 },
  unreadDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ACCENT,
    borderWidth: 1.5,
    borderColor: '#FFF',
  },

  notifContent: { flex: 1, paddingRight: 6 },
  notifTitle: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 2 },
  notifTitleUnread: { fontWeight: '700', color: '#111' },
  notifBody: { fontSize: 13, color: '#666', lineHeight: 18 },

  notifRight: { alignItems: 'flex-end', gap: 6 },
  notifTime: { fontSize: 11, color: '#999', fontWeight: '500' },
  deleteBtn: { padding: 4 },
  deleteBtnText: { fontSize: 12, color: '#BBBBBB' },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyIconText: { fontSize: 36 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111', marginBottom: 6 },
  emptySub: { fontSize: 14, color: '#888' },
});
