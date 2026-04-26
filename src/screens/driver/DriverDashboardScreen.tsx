import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { driverAPI } from '../../api/driver';
import { useAuth } from '../../store/authStore';
import type { WasteRecord } from '../../types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { DriverStackParamList } from '../../navigation/DriverNavigator';

type Props = NativeStackScreenProps<DriverStackParamList, 'Deliveries'>;

type FilterTab = 'All' | 'Pending' | 'Active' | 'Completed';
const FILTER_TABS: FilterTab[] = ['All', 'Pending', 'Active', 'Completed'];

// Map display filter → actual backend status values
const FILTER_STATUS_MAP: Record<FilterTab, string[]> = {
  All: [],
  Pending: ['PENDING', 'SCHEDULED'],
  Active: ['COLLECTED', 'IN_TRANSIT'],
  Completed: ['PROCESSING', 'PROCESSED', 'COMPLETED'],
};

const STATUS_META: Record<string, { label: string; bg: string; text: string }> = {
  PENDING:    { label: 'Pending',     bg: '#FFF3E0', text: '#F57C00' },
  SCHEDULED:  { label: 'Pending',     bg: '#FFF3E0', text: '#F57C00' },
  COLLECTED:  { label: 'Active',      bg: '#E8F5E9', text: '#1B5E20' },
  IN_TRANSIT: { label: 'In Progress', bg: '#E3F2FD', text: '#1565C0' },
  PROCESSING:   { label: 'In Progress', bg: '#E3F2FD', text: '#1565C0' },
  ACKNOWLEDGED: { label: 'Delivered',   bg: '#1B5E20', text: '#FFFFFF' },
  PROCESSED:    { label: 'Completed',   bg: '#1B5E20', text: '#FFFFFF' },
  COMPLETED:  { label: 'Completed',   bg: '#1B5E20', text: '#FFFFFF' },
  CANCELLED:  { label: 'Cancelled',   bg: '#FFEBEE', text: '#C62828' },
  REJECTED:   { label: 'Rejected',    bg: '#FFEBEE', text: '#C62828' },
};

const GREEN = '#1B5E20';
const ACCENT = '#2E7D32';
const BG = '#F7F8F5';

export default function DriverDashboardScreen({ navigation }: Readonly<Props>) {
  const { user } = useAuth();
  const firstName = user?.fullName?.split(' ')[0] ?? 'Driver';

  const [pickups, setPickups] = useState<WasteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('All');

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

  const todayCount = pickups.filter(p => {
    const d = new Date(p.date);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;

  const completedCount = pickups.filter(p =>
    ['PROCESSING', 'PROCESSED', 'COMPLETED'].includes(p.status),
  ).length;
  const successRate = pickups.length > 0
    ? Math.round((completedCount / pickups.length) * 100)
    : 95;

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
    item.sourceType
      .split('_')
      .map((w: string) => w.charAt(0) + w.slice(1).toLowerCase())
      .join(' ');

  const meta = (item: WasteRecord) =>
    STATUS_META[item.status] ?? { label: item.status, bg: '#F5F5F5', text: '#666' };

  const isActionable = (item: WasteRecord) =>
    ['PENDING', 'SCHEDULED'].includes(item.status);

  const renderItem = ({ item, index }: { item: WasteRecord; index: number }) => {
    const m = meta(item);
    const addr = getAddressText(item);
    const dist = getDistance(item);
    const time = getTime(item);
    const showBtn = isActionable(item) && index === 0;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={async () => {
          try {
            const res = await driverAPI.getWasteById(item.id);
            navigation.navigate('WastePickupMap', { item: res.data ?? item });
          } catch {
            navigation.navigate('WastePickupMap', { item });
          }
        }}>
        {/* Card header */}
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

        {/* Action button */}
        {showBtn ? (
          <TouchableOpacity
            style={styles.startBtn}
            activeOpacity={0.85}
            onPress={async () => {
              try {
                const res = await driverAPI.getWasteById(item.id);
                navigation.navigate('WastePickupMap', { item: res.data ?? item });
              } catch {
                navigation.navigate('WastePickupMap', { item });
              }
            }}>
            <Text style={styles.startBtnText}>Start Pickup  ↗</Text>
          </TouchableOpacity>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Driver Dashboard</Text>
          <Text style={styles.headerSub}>Welcome back, {firstName} 👋</Text>
        </View>
        <TouchableOpacity
          style={styles.bellBtn}
          onPress={() => navigation.navigate('Notifications')}>
          <Text style={styles.bellIcon}>🔔</Text>
        </TouchableOpacity>
      </View>

      {/* Stat cards */}
      <View style={styles.statsRow}>
        <View style={styles.statDark}>
          <View style={styles.statDarkTop}>
            <Text style={styles.statDarkLabel}>Today's{'\n'}Pickups</Text>
            <View style={styles.statArrowCircle}>
              <Text style={styles.statArrow}>↗</Text>
            </View>
          </View>
          <Text style={styles.statDarkValue}>{todayCount}</Text>
        </View>
        <View style={styles.statLight}>
          <Text style={styles.statLightLabel}>Success{'\n'}Rate</Text>
          <View style={styles.statLightValueRow}>
            <Text style={styles.statLightValue}>{successRate}</Text>
            <Text style={styles.statLightSup}>%</Text>
          </View>
        </View>
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
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyIcon}>🚛</Text>
              <Text style={styles.emptyTitle}>No pickups</Text>
              <Text style={styles.emptySub}>Assigned pickups will appear here</Text>
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

  /* Header */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 16,
    backgroundColor: BG,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#111', letterSpacing: -0.3 },
  headerSub: { fontSize: 13, color: '#555', marginTop: 2 },
  bellBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8EBE4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  bellIcon: { fontSize: 16 },

  /* Stats */
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 16,
  },
  statDark: {
    flex: 1,
    backgroundColor: GREEN,
    borderRadius: 20,
    padding: 18,
    minHeight: 120,
    justifyContent: 'space-between',
  },
  statDarkTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statDarkLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 20 },
  statArrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statArrow: { fontSize: 14, color: '#FFF' },
  statDarkValue: { fontSize: 44, fontWeight: '800', color: '#FFF', lineHeight: 48 },

  statLight: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 18,
    minHeight: 120,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E8EBE4',
  },
  statLightLabel: { fontSize: 14, color: '#555', lineHeight: 20 },
  statLightValueRow: { flexDirection: 'row', alignItems: 'flex-start' },
  statLightValue: { fontSize: 44, fontWeight: '800', color: '#111', lineHeight: 48 },
  statLightSup: { fontSize: 18, fontWeight: '700', color: '#111', marginTop: 8 },

  /* Filter tabs */
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
  tabActive: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  tabText: { fontSize: 13, fontWeight: '500', color: '#555' },
  tabTextActive: { color: '#FFF', fontWeight: '600' },

  /* List */
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },

  /* Card */
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

  metaRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  metaItem: { fontSize: 12, color: '#666' },

  startBtn: {
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 12,
  },
  startBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },

  /* Empty */
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 60 },
  emptyWrap: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 52, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111', marginBottom: 6 },
  emptySub: { fontSize: 14, color: '#888', textAlign: 'center' },
});
