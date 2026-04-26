import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, Radius, Typography, Shadow } from '../../utils/theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { DriverStackParamList } from '../../navigation/DriverNavigator';

type Props = NativeStackScreenProps<DriverStackParamList, 'WasteDetail'>;

interface TripTiming { pickup: number; delivery: number }

function formatDuration(totalSecs: number): string {
  if (totalSecs < 60) return `${totalSecs}s`;
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending',
  SCHEDULED: 'Scheduled',
  COLLECTED: 'Collected',
  PROCESSING: 'Delivered',
  ACKNOWLEDGED: 'Delivered',
  PROCESSED: 'Processed',
  CANCELLED: 'Cancelled',
  REJECTED: 'Rejected',
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: Colors.warning,
  SCHEDULED: Colors.accent,
  COLLECTED: Colors.primaryLight,
  PROCESSING: Colors.success,
  ACKNOWLEDGED: Colors.success,
  PROCESSED: Colors.success,
  CANCELLED: Colors.error,
  REJECTED: Colors.error,
};

function DetailRow({ icon, label, value }: Readonly<{ icon: string; label: string; value?: string | null }>) {
  if (!value) return null;
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailIcon}>{icon}</Text>
      <View style={styles.detailText}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function WasteDetailScreen({ route }: Readonly<Props>) {
  const { item } = route.params;
  const [timing, setTiming] = useState<TripTiming | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(`waste_timing_${item.id}`)
      .then(raw => { if (raw) setTiming(JSON.parse(raw) as TripTiming); })
      .catch(() => {});
  }, [item.id]);

  const addr =
    (item as any).supplier?.supplierProfile?.collectionAddress ??
    item.location ??
    (item as any).collectionAddress;

  const addressText = addr
    ? [addr.address, addr.city, addr.country].filter(Boolean).join(', ')
    : null;

  const farmAddr = item.farm
    ? [
        (item.farm.location as any)?.address,
        item.farm.city,
        item.farm.country,
      ]
        .filter(Boolean)
        .join(', ')
    : null;

  const statusColor = STATUS_COLOR[item.status] ?? Colors.textSecondary;
  const statusLabel = STATUS_LABEL[item.status] ?? item.status.replaceAll('_', ' ');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Status Banner */}
      <View style={[styles.banner, { backgroundColor: statusColor }]}>
        <Text style={styles.bannerStatus}>{statusLabel}</Text>
        <Text style={styles.bannerType}>
          ♻️ {item.sourceType.replaceAll('_', ' ')}
        </Text>
      </View>

      {/* Source */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Waste Source</Text>
        <DetailRow icon="🏷️" label="Source Name" value={item.sourceName} />
        <DetailRow icon="📦" label="Quantity" value={`${item.quantity} ${item.unit}`} />
        <DetailRow icon="📍" label="Pickup Address" value={addressText} />
        <DetailRow icon="📝" label="Description" value={item.description} />
        <DetailRow icon="🗒️" label="Notes" value={item.notes} />
      </View>

      {/* Supplier */}
      {item.supplier ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Supplier</Text>
          <DetailRow icon="👤" label="Name" value={item.supplier.fullName} />
          <DetailRow icon="📞" label="Phone" value={item.supplier.phoneNumber} />
          <DetailRow icon="✉️" label="Email" value={item.supplier.email} />
        </View>
      ) : null}

      {/* Processing Centre */}
      {item.farm ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Processing Centre</Text>
          <DetailRow icon="🏭" label="Name" value={item.farm.name} />
          <DetailRow icon="📍" label="Address" value={farmAddr} />
        </View>
      ) : null}

      {/* Trip Timing */}
      {timing ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trip Timing</Text>
          <View style={styles.timingRow}>
            <View style={[styles.timingCard, styles.timingCardBordered]}>
              <Text style={styles.timingIcon}>🚗</Text>
              <Text style={styles.timingValue}>{formatDuration(timing.pickup)}</Text>
              <Text style={styles.timingLabel}>Pickup</Text>
            </View>
            <View style={styles.timingCard}>
              <Text style={styles.timingIcon}>🏭</Text>
              <Text style={styles.timingValue}>{formatDuration(timing.delivery)}</Text>
              <Text style={styles.timingLabel}>Delivery</Text>
            </View>
          </View>
        </View>
      ) : null}

      {/* Summary stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{item.quantity}</Text>
          <Text style={styles.statLabel}>{item.unit}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {item.carbonSaved == null ? '—' : item.carbonSaved.toFixed(2)}
          </Text>
          <Text style={styles.statLabel}>kg CO₂ saved</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: Spacing.xxl },
  banner: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
  },
  bannerStatus: {
    ...Typography.h3,
    color: '#fff',
    fontWeight: '700',
    marginBottom: 4,
  },
  bannerType: {
    ...Typography.body2,
    color: 'rgba(255,255,255,0.85)',
  },
  section: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    ...Shadow.sm,
  },
  sectionTitle: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  detailIcon: { fontSize: 16, marginRight: Spacing.sm, marginTop: 2 },
  detailText: { flex: 1 },
  detailLabel: { ...Typography.caption, color: Colors.textSecondary, marginBottom: 2 },
  detailValue: { ...Typography.body2, color: Colors.textPrimary },
  timingRow: {
    flexDirection: 'row',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  timingCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: 2,
  },
  timingCardBordered: {
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  timingIcon: { fontSize: 18 },
  timingValue: { ...Typography.h3, color: Colors.primary, fontWeight: '700' },
  timingLabel: { ...Typography.caption, color: Colors.textSecondary },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    ...Shadow.sm,
  },
  statValue: { ...Typography.h2, color: Colors.primary, fontWeight: '700' },
  statLabel: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2, textAlign: 'center' },
});
