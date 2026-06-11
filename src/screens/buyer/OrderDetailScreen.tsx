import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ordersAPI } from '../../api/orders';
import { Colors, Spacing, Radius, Typography, Shadow } from '../../utils/theme';
import type { Order } from '../../types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BuyerStackParamList } from '../../navigation/BuyerNavigator';

type Props = NativeStackScreenProps<BuyerStackParamList, 'OrderDetail'>;

const STATUS_STEPS = [
  { key: 'PENDING', label: 'Order Placed', icon: '📝' },
  { key: 'CONFIRMED', label: 'Confirmed', icon: '✅' },
  { key: 'PROCESSING', label: 'Processing', icon: '⚙️' },
  { key: 'READY_FOR_PICKUP', label: 'Ready', icon: '📦' },
  { key: 'OUT_FOR_DELIVERY', label: 'On the Way', icon: '🚚' },
  { key: 'DELIVERED', label: 'Delivered', icon: '🎉' },
  { key: 'COMPLETED', label: 'Completed', icon: '🏆' },
];

export default function OrderDetailScreen({ route, navigation }: Props) {
  const { orderId, submittedReview } = route.params;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  const fetchOrder = useCallback(() => {
    setLoading(true);
    ordersAPI.getById(orderId)
      .then(res => setOrder(res.data))
      .catch(() => Alert.alert('Error', 'Could not load order'))
      .finally(() => setLoading(false));
  }, [orderId]);

  useFocusEffect(fetchOrder);

  const handleCancel = () => {
    Alert.alert('Cancel Order', 'Are you sure you want to cancel this order?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel', style: 'destructive',
        onPress: async () => {
          setCancelling(true);
          try {
            const res = await ordersAPI.cancel(orderId);
            setOrder(res.data);
          } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.message ?? 'Could not cancel order');
          } finally {
            setCancelling(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator color={Colors.primary} size="large" /></View>;
  }
  if (!order) {
    return <View style={styles.centered}><Text>Order not found</Text></View>;
  }

  const currentStep = STATUS_STEPS.findIndex(s => s.key === order.status);
  const canCancel = order.status === 'PENDING';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      {/* Header */}
      <View style={styles.headerCard}>
        <Text style={styles.orderNumber}>Order #{order.orderNumber}</Text>
        <Text style={styles.orderDate}>{new Date(order.createdAt).toLocaleDateString('en-GH', { dateStyle: 'long' })}</Text>
        <Text style={styles.paymentTag}>{order.paymentMethod.replace(/_/g, ' ')}</Text>
      </View>

      {/* Status timeline */}
      {order.status !== 'CANCELLED' && order.status !== 'REFUNDED' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Status</Text>
          {STATUS_STEPS.map((step, i) => {
            const done = i <= currentStep;
            const active = i === currentStep;
            return (
              <View key={step.key} style={styles.timelineRow}>
                <View style={[styles.timelineDot, done ? styles.timelineDotDone : styles.timelineDotPending, active && styles.timelineDotActive]}>
                  <Text style={styles.timelineDotIcon}>{done ? '✓' : ''}</Text>
                </View>
                {i < STATUS_STEPS.length - 1 && (
                  <View style={[styles.timelineLine, done && i < currentStep && styles.timelineLineDone]} />
                )}
                <View style={styles.timelineContent}>
                  <Text style={[styles.timelineLabel, active && styles.timelineLabelActive]}>
                    {step.icon} {step.label}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {order.status === 'CANCELLED' && (
        <View style={[styles.statusBanner, { backgroundColor: Colors.errorLight }]}>
          <Text style={[styles.statusBannerText, { color: Colors.error }]}>❌ Order Cancelled</Text>
        </View>
      )}

      {/* Items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Items</Text>
        {order.items.map(item => (
          <View key={item.id} style={styles.itemRow}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.variant.product.name}</Text>
              <Text style={styles.itemVariant}>{item.variant.name} × {item.quantity}</Text>
            </View>
            <Text style={styles.itemPrice}>GHS {item.subtotal.toFixed(2)}</Text>
          </View>
        ))}
        <View style={styles.divider} />
        <SummaryRow label="Subtotal" value={`GHS ${order.subtotal.toFixed(2)}`} />
        <SummaryRow label="Tax" value={`GHS ${order.tax.toFixed(2)}`} />
        <SummaryRow label="Delivery" value="Free" valueColor={Colors.success} />
        <SummaryRow label="Total" value={`GHS ${order.total.toFixed(2)}`} bold />
      </View>

      {/* Delivery address */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📍 Delivery Address</Text>
        <Text style={styles.addressLine}>{order.deliveryAddress?.street}</Text>
        <Text style={styles.addressLine}>{order.deliveryAddress?.city}{order.deliveryAddress?.region ? `, ${order.deliveryAddress.region}` : ''}</Text>
        <Text style={styles.addressLine}>{order.deliveryAddress?.country}</Text>
        {order.deliveryInstructions ? <Text style={styles.addressNotes}>{order.deliveryInstructions}</Text> : null}
      </View>

      {/* Driver info */}
      {order.driver && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚚 Your Driver</Text>
          <Text style={styles.driverName}>{order.driver.fullName}</Text>
          <Text style={styles.driverPhone}>{order.driver.phoneNumber}</Text>
        </View>
      )}

      {canCancel && (
        <TouchableOpacity
          style={[styles.cancelBtn, cancelling && styles.btnDisabled]}
          onPress={handleCancel}
          disabled={cancelling}>
          {cancelling ? <ActivityIndicator color={Colors.error} /> : <Text style={styles.cancelBtnText}>Cancel Order</Text>}
        </TouchableOpacity>
      )}

      {order.status === 'DELIVERED' && !submittedReview && (
        <TouchableOpacity
          style={styles.reviewBtn}
          onPress={() => navigation.navigate('Review', { orderId: order.id })}>
          <Text style={styles.reviewBtnText}>⭐  Confirm Delivery &amp; Leave Reviews</Text>
        </TouchableOpacity>
      )}

      {order.status === 'COMPLETED' && (() => {
        // Prefer API-returned reviews (item.review); fall back to navigation params
        const apiReviews = order.items
          .filter(i => i.review)
          .map(i => ({
            productId: i.variant.product.id,
            productName: i.variant.product.name,
            rating: i.review!.rating,
            comment: i.review!.comment,
          }));
        const displayReviews = apiReviews.length > 0
          ? apiReviews
          : (submittedReview?.productReviews ?? []);
        const driverRating = submittedReview?.driverRating;
        const driverComment = submittedReview?.driverComment;

        if (displayReviews.length === 0 && driverRating === undefined) return null;
        return (
          <View style={[styles.section, styles.reviewSection]}>
            <Text style={styles.sectionTitle}>⭐ Your Reviews</Text>

            {driverRating !== undefined && (
              <View style={styles.reviewItem}>
                <Text style={styles.reviewItemTitle}>🚗 Driver</Text>
                <Text style={styles.reviewStars}>
                  {'★'.repeat(driverRating)}{'☆'.repeat(5 - driverRating)}
                </Text>
                {driverComment ? (
                  <Text style={styles.reviewComment}>"{driverComment}"</Text>
                ) : null}
              </View>
            )}

            {displayReviews.map(r => (
              <View key={r.productId} style={styles.reviewItem}>
                <Text style={styles.reviewItemTitle}>{r.productName}</Text>
                <Text style={styles.reviewStars}>
                  {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                </Text>
                {r.comment ? <Text style={styles.reviewComment}>"{r.comment}"</Text> : null}
              </View>
            ))}
          </View>
        );
      })()}
    </ScrollView>
  );
}

function SummaryRow({ label, value, bold, valueColor }: { label: string; value: string; bold?: boolean; valueColor?: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, bold && { fontWeight: '700', color: Colors.textPrimary }]}>{label}</Text>
      <Text style={[styles.summaryValue, bold && { fontWeight: '700', color: Colors.primary }, valueColor ? { color: valueColor } : null]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerCard: { backgroundColor: Colors.primary, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md },
  orderNumber: { ...Typography.h3, color: '#fff' },
  orderDate: { ...Typography.body2, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  paymentTag: { marginTop: Spacing.sm, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: 4, ...Typography.caption, color: '#fff' },
  section: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md, ...Shadow.sm },
  sectionTitle: { ...Typography.h4, color: Colors.textPrimary, marginBottom: Spacing.md },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 0, position: 'relative' },
  timelineDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  timelineDotPending: { backgroundColor: Colors.border },
  timelineDotDone: { backgroundColor: Colors.primaryLight },
  timelineDotActive: { backgroundColor: Colors.primary },
  timelineDotIcon: { color: '#fff', fontSize: 12, fontWeight: '700' },
  timelineLine: { position: 'absolute', left: 11, top: 24, width: 2, height: 28, backgroundColor: Colors.border },
  timelineLineDone: { backgroundColor: Colors.primaryLight },
  timelineContent: { marginLeft: Spacing.md, paddingBottom: Spacing.lg },
  timelineLabel: { ...Typography.body2, color: Colors.textSecondary },
  timelineLabelActive: { color: Colors.primary, fontWeight: '600' },
  statusBanner: { borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.md, alignItems: 'center' },
  statusBannerText: { ...Typography.body1, fontWeight: '600' },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  itemInfo: { flex: 1 },
  itemName: { ...Typography.body2, color: Colors.textPrimary, fontWeight: '500' },
  itemVariant: { ...Typography.caption, color: Colors.textSecondary },
  itemPrice: { ...Typography.label, color: Colors.textPrimary },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  summaryLabel: { ...Typography.body2, color: Colors.textSecondary },
  summaryValue: { ...Typography.body2, color: Colors.textPrimary },
  addressLine: { ...Typography.body1, color: Colors.textPrimary, marginBottom: 2 },
  addressNotes: { ...Typography.body2, color: Colors.textSecondary, marginTop: Spacing.sm },
  driverName: { ...Typography.body1, color: Colors.textPrimary, fontWeight: '600' },
  driverPhone: { ...Typography.body2, color: Colors.textSecondary },
  cancelBtn: { borderWidth: 1, borderColor: Colors.error, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.sm },
  btnDisabled: { opacity: 0.5 },
  cancelBtnText: { ...Typography.button, color: Colors.error },
  reviewBtn: { backgroundColor: Colors.primary, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.sm },
  reviewBtnText: { ...Typography.button, color: '#fff' },
  reviewSection: { borderLeftWidth: 3, borderLeftColor: Colors.accent },
  reviewItem: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm, marginTop: Spacing.sm },
  reviewItemTitle: { ...Typography.label, color: Colors.textPrimary, marginBottom: 2 },
  reviewStars: { fontSize: 20, color: Colors.accent, letterSpacing: 2, marginBottom: 2 },
  reviewComment: { ...Typography.body2, color: Colors.textSecondary, fontStyle: 'italic' },
});
