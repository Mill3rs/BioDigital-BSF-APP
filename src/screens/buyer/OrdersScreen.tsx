import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ordersAPI } from '../../api/orders';
import { Colors, Spacing, Radius, Typography, Shadow } from '../../utils/theme';
import type { Order, OrderStatus } from '../../types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BuyerStackParamList } from '../../navigation/BuyerNavigator';

type Props = NativeStackScreenProps<BuyerStackParamList, 'Orders'>;

const STATUS_FILTERS: { label: string; value: OrderStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Processing', value: 'PROCESSING' },
  { label: 'Delivered', value: 'DELIVERED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING: Colors.warning,
  CONFIRMED: Colors.info,
  PROCESSING: Colors.processing,
  READY_FOR_PICKUP: Colors.accentLight,
  OUT_FOR_DELIVERY: Colors.accent,
  DELIVERED: Colors.success,
  CANCELLED: Colors.error,
  REFUNDED: Colors.textSecondary,
};

export default function OrdersScreen({ navigation }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');

  const load = useCallback(async () => {
    try {
      const res = await ordersAPI.getAll({ status: statusFilter || undefined });
      setOrders(res.data);
    } catch {
      // keep existing
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter]);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  const renderOrder = ({ item }: { item: Order }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderNumber}>#{item.orderNumber}</Text>
        <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[item.status] ?? Colors.textSecondary) + '22' }]}>
          <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] ?? Colors.textSecondary }]}>
            {item.status.replace(/_/g, ' ')}
          </Text>
        </View>
      </View>
      <Text style={styles.orderDate}>{new Date(item.createdAt).toLocaleDateString('en-GH')}</Text>
      <Text style={styles.orderItems} numberOfLines={1}>
        {item.items?.map(i => i.variant.product.name).join(', ') ?? '...'}
      </Text>
      <View style={styles.orderFooter}>
        <Text style={styles.orderTotal}>GHS {item.total.toFixed(2)}</Text>
        <Text style={styles.orderArrow}>→</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={STATUS_FILTERS}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={i => i.value}
        style={styles.filterList}
        contentContainerStyle={{ paddingHorizontal: Spacing.md }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.filterChip, statusFilter === item.value && styles.filterChipActive]}
            onPress={() => { setStatusFilter(item.value as OrderStatus | ''); setLoading(true); }}>
            <Text style={[styles.filterLabel, statusFilter === item.value && styles.filterLabelActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={Colors.primary} size="large" /></View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={o => o.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[Colors.primary]} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyTitle}>No orders yet</Text>
              <Text style={styles.emptySubtitle}>Your orders will appear here</Text>
            </View>
          }
          renderItem={renderOrder}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  filterList: { maxHeight: 50, paddingTop: Spacing.sm },
  filterChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.full, backgroundColor: Colors.surface, marginRight: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterLabel: { ...Typography.label, color: Colors.textSecondary },
  filterLabelActive: { color: '#fff' },
  listContent: { padding: Spacing.md },
  orderCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadow.sm },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  orderNumber: { ...Typography.label, color: Colors.textPrimary, fontWeight: '700' },
  statusBadge: { borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  statusText: { ...Typography.caption, fontWeight: '600', textTransform: 'capitalize' },
  orderDate: { ...Typography.caption, color: Colors.textLight, marginBottom: Spacing.xs },
  orderItems: { ...Typography.body2, color: Colors.textSecondary, marginBottom: Spacing.sm },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderTotal: { ...Typography.label, color: Colors.primary, fontWeight: '700' },
  orderArrow: { color: Colors.primary, fontSize: 18 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl, marginTop: Spacing.xxl },
  emptyIcon: { fontSize: 56, marginBottom: Spacing.md },
  emptyTitle: { ...Typography.h3, color: Colors.textPrimary, marginBottom: Spacing.sm },
  emptySubtitle: { ...Typography.body1, color: Colors.textSecondary, textAlign: 'center' },
});
