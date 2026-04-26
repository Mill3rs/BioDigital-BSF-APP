import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { driverAPI } from '../../api/driver';
import { Colors, Spacing, Radius, Typography, Shadow } from '../../utils/theme';
import type { Order } from '../../types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { DriverStackParamList } from '../../navigation/DriverNavigator';

type Props = NativeStackScreenProps<DriverStackParamList, 'DeliveryDetail'>;

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  PROCESSING: 'Processing',
  READY_FOR_PICKUP: 'Ready for Pickup',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: Colors.warning,
  CONFIRMED: Colors.info,
  PROCESSING: Colors.processing,
  READY_FOR_PICKUP: Colors.accent,
  OUT_FOR_DELIVERY: Colors.primaryLight,
  DELIVERED: Colors.success,
  CANCELLED: Colors.error,
};

export default function DeliveryDetailScreen({ route, navigation }: Props) {
  const { orderId } = route.params;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await driverAPI.getDeliveries({});
        const found = res.data.find((o: Order) => o.id === orderId) ?? null;
        setOrder(found);
      } catch {
        Alert.alert('Error', 'Failed to load delivery details.');
      } finally {
        setLoading(false);
      }
    })();
  }, [orderId]);

  const updateStatus = async (newStatus: string) => {
    if (!order) return;
    setUpdating(true);
    try {
      await driverAPI.updateDeliveryStatus(orderId, newStatus as any, notes || undefined);
      setOrder(prev => prev ? { ...prev, status: newStatus as any } : prev);
      Alert.alert('Success', `Status updated to ${STATUS_LABELS[newStatus] ?? newStatus}.`);
    } catch {
      Alert.alert('Error', 'Failed to update delivery status.');
    } finally {
      setUpdating(false);
    }
  };

  const confirmUpdate = (newStatus: string) => {
    Alert.alert(
      'Update Status',
      `Mark this delivery as "${STATUS_LABELS[newStatus]}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => updateStatus(newStatus) },
      ],
    );
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator color={Colors.primary} size="large" /></View>;
  }

  if (!order) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Delivery not found.</Text>
      </View>
    );
  }

  const addr = order.deliveryAddress as any;
  const isPickedUp = order.status === 'READY_FOR_PICKUP';
  const isEnRoute = order.status === 'OUT_FOR_DELIVERY';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Status Banner */}
      <View style={[styles.statusBanner, { backgroundColor: (STATUS_COLOR[order.status] ?? Colors.primary) }]}>
        <Text style={styles.statusBannerText}>{STATUS_LABELS[order.status] ?? order.status}</Text>
      </View>

      {/* Order Info */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Order Info</Text>
        <InfoRow label="Order #" value={`#${order.orderNumber}`} />
        <InfoRow label="Total" value={`GHS ${order.total.toFixed(2)}`} />
        <InfoRow label="Payment" value={String(order.paymentMethod ?? '').replace(/_/g, ' ')} />
      </View>

      {/* Customer Info */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Customer</Text>
        <InfoRow label="Name" value={order.customer?.fullName ?? '—'} />
        <InfoRow label="Phone" value={order.customer?.phoneNumber ?? '—'} />
      </View>

      {/* Delivery Address */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Delivery Address</Text>
        <InfoRow label="Street" value={addr?.street ?? '—'} />
        <InfoRow label="City" value={addr?.city ?? '—'} />
        <InfoRow label="Region" value={addr?.region ?? '—'} />
        {addr?.landmark && <InfoRow label="Landmark" value={addr.landmark} />}
      </View>

      {/* Items */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Items ({order.items?.length ?? 0})</Text>
        {order.items?.map((item, idx) => (
          <View key={idx} style={styles.itemRow}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.variant?.product?.name ?? 'Product'}</Text>
              {item.variant && <Text style={styles.itemVariant}>{item.variant.name}</Text>}
            </View>
            <Text style={styles.itemQty}>×{item.quantity}</Text>
            <Text style={styles.itemPrice}>GHS {item.price.toFixed(2)}</Text>
          </View>
        ))}
      </View>

      {/* Notes field */}
      {(isPickedUp || isEnRoute) && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Delivery Notes (optional)</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Add notes about this delivery..."
            placeholderTextColor={Colors.textSecondary}
            multiline
            numberOfLines={3}
            value={notes}
            onChangeText={setNotes}
          />
        </View>
      )}

      {/* Action Buttons */}
      {isPickedUp && (
        <TouchableOpacity
          style={[styles.actionBtn, styles.primaryBtn]}
          onPress={() => confirmUpdate('OUT_FOR_DELIVERY')}
          disabled={updating}>
          {updating ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionBtnText}>🚚  Mark as Out for Delivery</Text>}
        </TouchableOpacity>
      )}

      {isEnRoute && (
        <TouchableOpacity
          style={[styles.actionBtn, styles.successBtn]}
          onPress={() => confirmUpdate('DELIVERED')}
          disabled={updating}>
          {updating ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionBtnText}>✅  Mark as Delivered</Text>}
        </TouchableOpacity>
      )}

      {order.status === 'DELIVERED' && (
        <View style={styles.deliveredBanner}>
          <Text style={styles.deliveredText}>✅ Delivery Completed</Text>
        </View>
      )}
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { ...Typography.body1, color: Colors.error },

  statusBanner: { borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.md, alignItems: 'center' },
  statusBannerText: { ...Typography.h3, color: '#fff', fontWeight: '700' },

  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.md, ...Shadow.sm },
  sectionTitle: { ...Typography.label, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm },

  infoRow: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.border + '50' },
  infoLabel: { ...Typography.body2, color: Colors.textSecondary, width: 90 },
  infoValue: { ...Typography.body2, color: Colors.textPrimary, flex: 1, fontWeight: '500' },

  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border + '50' },
  itemInfo: { flex: 1 },
  itemName: { ...Typography.body2, color: Colors.textPrimary, fontWeight: '500' },
  itemVariant: { ...Typography.caption, color: Colors.textSecondary },
  itemQty: { ...Typography.body2, color: Colors.textSecondary, marginHorizontal: Spacing.sm },
  itemPrice: { ...Typography.body2, color: Colors.primary, fontWeight: '600' },

  notesInput: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
    padding: Spacing.sm, ...Typography.body2, color: Colors.textPrimary,
    textAlignVertical: 'top', minHeight: 80,
  },

  actionBtn: { borderRadius: Radius.lg, padding: Spacing.md + 2, alignItems: 'center', marginBottom: Spacing.sm },
  primaryBtn: { backgroundColor: Colors.primary },
  successBtn: { backgroundColor: Colors.success },
  actionBtnText: { ...Typography.button, color: '#fff' },

  deliveredBanner: { backgroundColor: Colors.success + '22', borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center' },
  deliveredText: { ...Typography.label, color: Colors.success, fontWeight: '700' },
});
