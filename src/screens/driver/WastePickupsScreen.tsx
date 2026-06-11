import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, StatusBar,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { driverAPI } from '../../api/driver';
import type { WasteRecord } from '../../types';
import type { DriverStackParamList } from '../../navigation/DriverNavigator';

type DriverNav = NativeStackNavigationProp<DriverStackParamList>;

type FilterTab = 'All' | 'Pending' | 'Active' | 'Completed';
const FILTER_TABS: FilterTab[] = ['All', 'Pending', 'Active', 'Completed'];

const FILTER_STATUS_MAP: Record<FilterTab, string[]> = {
  All: [],
  Pending: ['PENDING', 'SCHEDULED'],
  Active: ['COLLECTED', 'IN_TRANSIT'],
  Completed: ['PROCESSING', 'PROCESSED', 'COMPLETED', 'ACKNOWLEDGED'],
};

const STATUS_META: Record<string, { label: string; bg: string; text: string }> = {
  PENDING:    { label: 'Pending',     bg: '#FFF3E0', text: '#F57C00' },
  SCHEDULED:  { label: 'Pending',     bg: '#FFF3E0', text: '#F57C00' },
  COLLECTED:  { label: 'Active',      bg: '#E8F5E9', text: '#1B5E20' },
  IN_TRANSIT: { label: 'In Progress', bg: '#E3F2FD', text: '#1565C0' },
  PROCESSING: { label: 'In Progress', bg: '#E3F2FD', text: '#1565C0' },
  ACKNOWLEDGED: { label: 'Delivered',   bg: '#1B5E20', text: '#FFFFFF' },
  PROCESSED:  { label: 'Completed',   bg: '#1B5E20', text: '#FFFFFF' },
  COMPLETED:  { label: 'Completed',   bg: '#1B5E20', text: '#FFFFFF' },
  CANCELLED:  { label: 'Cancelled',   bg: '#FFEBEE', text: '#C62828' },
  REJECTED:   { label: 'Rejected',    bg: '#FFEBEE', text: '#C62828' },
};

const GREEN = '#1B5E20';
const ACCENT = '#2E7D32';
const BG = '#F7F8F5';

export default function WastePickupsScreen() {
  const navigation = useNavigation<DriverNav>();
  const [pickups, setPickups] = useState<WasteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('All');
  const [collecting, setCollecting] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await driverAPI.getWastePickups();
      setPickups(res.data ?? []);
    } catch {
      // keep existing
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  const filtered = activeTab === 'All'
    ? pickups
    : pickups.filter(p => FILTER_STATUS_MAP[activeTab].includes(p.status));

  const applyCollected = useCallback((id: string) => {
    setPickups(prev => prev.map(p =>
      p.id === id ? { ...p, status: 'COLLECTED' as const } : p,
    ));
  }, []);

  const handleCollect = (item: WasteRecord) => {
    Alert.alert(
      'Mark as Collected',
      `Confirm collection of ${item.quantity} ${item.unit} from "${item.sourceName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setCollecting(item.id);
            try {
              await driverAPI.markWasteCollected(item.id);
              applyCollected(item.id);
            } catch {
              Alert.alert('Error', 'Failed to update collection status. Please try again.');
            } finally {
              setCollecting(null);
            }
          },
        },
      ],
    );
  };

  const getAddressText = (item: WasteRecord): string => {
    const addr =
      (item as any).supplier?.supplierProfile?.collectionAddress ??
      item.location ??
      item.collectionAddress;
    if (!addr) return item.sourceName;
    return [addr.address, addr.city].filter(Boolean).join(', ');
  };

  const getDistance = (item: WasteRecord): string | null => {
    const addr =
      (item as any).supplier?.supplierProfile?.collectionAddress ??
      item.location ??
      item.collectionAddress;
    if (addr?.distance) return `${addr.distance} km`;
    return null;
  };

  const getTime = (item: WasteRecord): string | null => {
    if (!item.date) return null;
    const d = new Date(item.date);
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  const wasteLabel = (item: WasteRecord): string =>
    item.sourceType.split('_').map((w: string) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');

  const openMap = async (item: WasteRecord) => {
    try {
      const res = await driverAPI.getWasteById(item.id);
      navigation.navigate('WastePickupMap', { item: res.data ?? item });
    } catch {
      navigation.navigate('WastePickupMap', { item });
    }
  };

  const renderItem = ({ item }: { item: WasteRecord }) => {
    const m = STATUS_META[item.status] ?? { label: item.status, bg: '#F5F5F5', text: '#666' };
    const addr = getAddressText(item);
    const dist = getDistance(item);
    const time = getTime(item);
    const isCollecting = collecting === item.id;
    const isActionable = ['PENDING', 'SCHEDULED'].includes(item.status);
    const isDone = ['PROCESSING', 'PROCESSED', 'COMPLETED', 'ACKNOWLEDGED'].includes(item.status);

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={isDone ? 1 : 0.85}
        disabled={isDone}
        onPress={() => openMap(item)}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.sourceName}</Text>
          <View style={[styles.badge, { backgroundColor: m.bg }]}>
            <Text style={[styles.badgeText, { color: m.text }]}>{m.label}</Text>
          </View>
        </View>

        {/* Address */}
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>📍</Text>
          <Text style={styles.infoText} numberOfLines={1}>{addr}</Text>
        </View>

        {/* Distance */}
        {dist ? (
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>↕</Text>
            <Text style={styles.infoText}>{dist}</Text>
          </View>
        ) : null}

        {/* Meta row */}
        <View style={styles.metaRow}>
          <Text style={styles.metaItem}>♻️ {wasteLabel(item)}</Text>
          <Text style={styles.metaItem}>⚖️ {item.quantity} {item.unit}</Text>
          {time ? <Text style={styles.metaItem}>⏰ {time}</Text> : null}
        </View>

        {/* Actions */}
        {isActionable ? (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.mapBtn}
              onPress={() => openMap(item)}>
              <Text style={styles.mapBtnText}>🗺️  View Map</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.collectBtn, isCollecting && styles.collectBtnDisabled]}
              onPress={() => handleCollect(item)}
              disabled={isCollecting}>
              {isCollecting
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.collectBtnText}>Mark Collected</Text>}
            </TouchableOpacity>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pickups</Text>
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

      {/* List */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              colors={[ACCENT]}
              tintColor={ACCENT}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyTitle}>No pickups</Text>
              <Text style={styles.emptySub}>
                {activeTab === 'All'
                  ? 'Assigned pickups will appear here'
                  : `No ${activeTab.toLowerCase()} pickups`}
              </Text>
            </View>
          }
          renderItem={renderItem}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  header: {
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 12,
    backgroundColor: BG,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#111', letterSpacing: -0.3 },

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

  card: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EEF0EC',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111', flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: '600' },

  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  infoIcon: { fontSize: 13, marginRight: 6 },
  infoText: { fontSize: 13, color: '#555', flex: 1 },

  metaRow: { flexDirection: 'row', gap: 12, marginTop: 4, flexWrap: 'wrap' },
  metaItem: { fontSize: 12, color: '#666' },

  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  mapBtn: {
    flex: 1,
    backgroundColor: '#F0F7F0',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  mapBtnText: { fontSize: 13, color: ACCENT, fontWeight: '600' },
  collectBtn: {
    flex: 1,
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  collectBtnDisabled: { opacity: 0.6 },
  collectBtnText: { fontSize: 13, color: '#FFF', fontWeight: '600' },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 60 },
  emptyWrap: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 52, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111', marginBottom: 6 },
  emptySub: { fontSize: 14, color: '#888', textAlign: 'center' },
});
