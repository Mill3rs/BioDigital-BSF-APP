import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { driverAPI } from '../../api/driver';
import { Colors, Spacing, Radius, Typography, Shadow } from '../../utils/theme';
import type { Order, OrderStatus, WasteRecord } from '../../types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { DriverStackParamList } from '../../navigation/DriverNavigator';

type Props = NativeStackScreenProps<DriverStackParamList, 'Deliveries'>;

type ListItem =
  | { kind: 'order'; data: Order }
  | { kind: 'waste'; data: WasteRecord };

const FILTER_TABS = ['All', 'Assigned', 'En Route', 'Delivered'] as const;
type FilterTab = typeof FILTER_TABS[number];

const ORDER_STATUS_MAP: Record<FilterTab, OrderStatus | undefined> = {
  All: undefined,
  Assigned: 'READY_FOR_PICKUP',
  'En Route': 'OUT_FOR_DELIVERY',
  Delivered: 'DELIVERED',
};

// Waste statuses shown under each tab
const WASTE_STATUS_MAP: Record<FilterTab, string[]> = {
  All: [],           // empty = show all
  Assigned: ['SCHEDULED'],
  'En Route': ['COLLECTED'],
  Delivered: ['PROCESSING', 'PROCESSED', 'ACKNOWLEDGED'],
};

// Statuses that are considered "delivered" — show detail view, not map
const DELIVERED_WASTE_STATUSES = new Set(['PROCESSING', 'PROCESSED', 'ACKNOWLEDGED']);

const ORDER_STATUS_COLOR: Record<string, string> = {
  PENDING: Colors.warning,
  CONFIRMED: Colors.info,
  PROCESSING: Colors.processing,
  READY_FOR_PICKUP: Colors.accent,
  OUT_FOR_DELIVERY: Colors.primaryLight,
  DELIVERED: Colors.success,
  CANCELLED: Colors.error,
};

const WASTE_STATUS_COLOR: Record<string, string> = {
  PENDING: Colors.warning,
  SCHEDULED: Colors.accent,
  COLLECTED: Colors.primaryLight,
  PROCESSING: Colors.success,
  PROCESSED: Colors.success,
  ACKNOWLEDGED: Colors.success,
  CANCELLED: Colors.error,
  REJECTED: Colors.error,
};

export default function DeliveriesScreen({ navigation }: Readonly<Props>) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [wastePickups, setWastePickups] = useState<WasteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('All');

  const load = useCallback(async () => {
    try {
      const [ordersRes, wasteRes] = await Promise.allSettled([
        driverAPI.getDeliveries({ status: ORDER_STATUS_MAP[activeTab] }),
        driverAPI.getWastePickups(),
      ]);
      if (ordersRes.status === 'fulfilled') setOrders(ordersRes.value.data);
      if (wasteRes.status === 'fulfilled') setWastePickups(wasteRes.value.data);
    } catch {
      // keep existing
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  const filteredWaste =
    activeTab === 'All'
      ? wastePickups
      : wastePickups.filter(w => WASTE_STATUS_MAP[activeTab].includes(w.status));

  const listData: ListItem[] = [
    ...orders.map(o => ({ kind: 'order' as const, data: o })),
    ...filteredWaste.map(w => ({ kind: 'waste' as const, data: w })),
  ];

  const renderOrder = (item: Order) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('DeliveryDetail', { orderId: item.id })}>
      <View style={styles.cardHeader}>
        <Text style={styles.title}>#{item.orderNumber}</Text>
        <View style={[styles.badge, { backgroundColor: (ORDER_STATUS_COLOR[item.status] ?? Colors.textSecondary) + '22' }]}>
          <Text style={[styles.badgeText, { color: ORDER_STATUS_COLOR[item.status] ?? Colors.textSecondary }]}>
            {item.status.replaceAll('_', ' ')}
          </Text>
        </View>
      </View>
      <View style={styles.row}>
        <Text style={styles.rowIcon}>👤</Text>
        <Text style={styles.rowMain}>{item.customer?.fullName ?? 'Customer'}</Text>
        <Text style={styles.rowSub}>{item.customer?.phoneNumber}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.rowIcon}>📍</Text>
        <Text style={styles.rowMain} numberOfLines={2}>
          {(item.deliveryAddress as any)?.street}, {(item.deliveryAddress as any)?.city}
        </Text>
      </View>
      <View style={styles.footer}>
        <Text style={styles.footerMain}>GHS {item.total.toFixed(2)}</Text>
        <Text style={styles.footerSub}>{item.items?.length ?? 0} item(s)</Text>
        <Text style={styles.arrow}>→</Text>
      </View>
    </TouchableOpacity>
  );

  const renderWaste = (item: WasteRecord) => {
    const addr = (item as any).supplier?.supplierProfile?.collectionAddress
      ?? item.location
      ?? (item as any).collectionAddress;
    const addressText = addr
      ? [addr.address, addr.city, addr.country].filter(Boolean).join(', ')
      : 'No address on record';
    const statusColor = WASTE_STATUS_COLOR[item.status] ?? Colors.textSecondary;
    const statusLabel = (item.status === 'PROCESSING' || item.status === 'ACKNOWLEDGED') ? 'Delivered' : item.status.replaceAll('_', ' ');
    return (
      <TouchableOpacity
        style={[styles.card, styles.wasteCard]}
        onPress={() =>
          DELIVERED_WASTE_STATUSES.has(item.status)
            ? navigation.navigate('WasteDetail', { item })
            : navigation.navigate('WastePickupMap', { item })
        }>
        <View style={styles.cardHeader}>
          <View style={styles.wasteTitleRow}>
            <Text style={styles.wasteIcon}>♻️</Text>
            <Text style={styles.title} numberOfLines={1}>{item.sourceName}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: statusColor + '22' }]}>
            <Text style={[styles.badgeText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowIcon}>👤</Text>
          <Text style={styles.rowMain}>{item.supplier?.fullName ?? item.sourceName}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowIcon}>📍</Text>
          <Text style={styles.rowMain} numberOfLines={2}>{addressText}</Text>
        </View>
        <View style={styles.footer}>
          <Text style={[styles.footerMain, { color: Colors.textSecondary }]}>
            ⚖️ {item.quantity} {item.unit}
          </Text>
          <Text style={styles.footerSub}>{item.sourceType.replaceAll('_', ' ')}</Text>
          <Text style={styles.arrow}>→</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        {FILTER_TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.chip, activeTab === tab && styles.chipActive]}
            onPress={() => { setActiveTab(tab); setLoading(true); }}>
            <Text style={[styles.chipText, activeTab === tab && styles.chipTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={Colors.primary} size="large" /></View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(d, i) => `${d.kind}-${d.data.id}-${i}`}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              colors={[Colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🚚</Text>
              <Text style={styles.emptyTitle}>No deliveries</Text>
              <Text style={styles.emptySubtitle}>Assigned deliveries will appear here</Text>
            </View>
          }
          renderItem={({ item }) =>
            item.kind === 'order' ? renderOrder(item.data) : renderWaste(item.data)
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { ...Typography.label, color: Colors.textSecondary },
  chipTextActive: { color: '#fff' },
  listContent: { padding: Spacing.md },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  wasteCard: { borderLeftWidth: 3, borderLeftColor: Colors.primary },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  wasteTitleRow: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  wasteIcon: { fontSize: 16, marginRight: 6 },
  title: { ...Typography.label, color: Colors.textPrimary, fontWeight: '700', flex: 1 },
  badge: { borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  badgeText: { ...Typography.caption, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  rowIcon: { fontSize: 14, marginRight: 6 },
  rowMain: { ...Typography.body2, color: Colors.textPrimary, fontWeight: '500', flex: 1 },
  rowSub: { ...Typography.caption, color: Colors.textSecondary },
  footer: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 2 },
  footerMain: { ...Typography.label, color: Colors.primary, fontWeight: '700', flex: 1 },
  footerSub: { ...Typography.caption, color: Colors.textSecondary },
  arrow: { color: Colors.primary, fontSize: 18 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
    marginTop: Spacing.xxl,
  },
  emptyIcon: { fontSize: 56, marginBottom: Spacing.md },
  emptyTitle: { ...Typography.h3, color: Colors.textPrimary, marginBottom: Spacing.sm },
  emptySubtitle: { ...Typography.body1, color: Colors.textSecondary, textAlign: 'center' },
});
