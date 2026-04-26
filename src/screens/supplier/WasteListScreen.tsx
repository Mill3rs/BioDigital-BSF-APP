import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { wasteAPI } from '../../api/waste';
import { Colors, Spacing, Radius, Typography, Shadow } from '../../utils/theme';
import type { WasteRecord } from '../../types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SupplierStackParamList } from '../../navigation/SupplierNavigator';

type Props = NativeStackScreenProps<SupplierStackParamList, 'WasteList'>;

type FilterTab = 'All' | 'Pending' | 'Collected' | 'Verified';
const FILTER_TABS: FilterTab[] = ['All', 'Pending', 'Collected', 'Verified'];

const FILTER_STATUS_MAP: Record<FilterTab, string[]> = {
  All:       [],
  Pending:   ['PENDING', 'SCHEDULED'],
  Collected: ['COLLECTED', 'IN_TRANSIT'],
  Verified:  ['PROCESSING', 'PROCESSED', 'ACKNOWLEDGED', 'COMPLETED'],
};

const STATUS_LABEL: Record<string, string> = {
  PENDING:     'Pending',
  SCHEDULED:   'Scheduled',
  COLLECTED:   'Collected',
  IN_TRANSIT:  'In Transit',
  PROCESSING:  'In Progress',
  ACKNOWLEDGED:'Delivered',
  PROCESSED:   'Processed',
  COMPLETED:   'Completed',
  CANCELLED:   'Cancelled',
  REJECTED:    'Rejected',
};

const STATUS_CONFIG: Record<string, { bg: string; text: string }> = {
  PENDING:     { bg: '#FFF3E0', text: '#E65100' },
  SCHEDULED:   { bg: '#E8F5E9', text: '#2E7D32' },
  COLLECTED:   { bg: '#E3F2FD', text: '#1565C0' },
  IN_TRANSIT:  { bg: '#EDE7F6', text: '#4527A0' },
  PROCESSING:  { bg: '#EDE7F6', text: '#4527A0' },
  ACKNOWLEDGED:{ bg: '#E8F5E9', text: '#1B5E20' },
  PROCESSED:   { bg: '#E8F5E9', text: '#1B5E20' },
  COMPLETED:   { bg: '#E8F5E9', text: '#1B5E20' },
  CANCELLED:   { bg: '#FFEBEE', text: '#B71C1C' },
  REJECTED:    { bg: '#FFEBEE', text: '#B71C1C' },
};

const SOURCE_TYPE_EMOJI: Record<string, string> = {
  AGRICULTURAL: '🌾',
  FOOD_WASTE:   '🍎',
  MARKET_WASTE: '🛒',
  BREWERY:      '🍺',
  HOUSEHOLD:    '🏠',
  INDUSTRIAL:   '🏭',
  MUNICIPAL:    '🏙️',
  COMMERCIAL:   '💼',
  OTHER:        '♻️',
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function WasteListScreen({ navigation }: Props) {
  const [records, setRecords] = useState<WasteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('All');

  const load = useCallback(async () => {
    try {
      const res = await wasteAPI.getAll({ limit: 100 });
      const all: WasteRecord[] = (res.data as any) ?? [];
      const allowed = FILTER_STATUS_MAP[activeTab];
      setRecords(allowed.length === 0 ? all : all.filter(r => allowed.includes(r.status)));
    } catch {
      // keep existing
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  const renderRecord = ({ item }: { item: WasteRecord }) => {
    const cfg = STATUS_CONFIG[item.status] ?? { bg: '#F5F5F5', text: '#666' };
    const label = STATUS_LABEL[item.status] ?? item.status.replace(/_/g, ' ');
    const pts = (item as any).pointsAwarded ?? 0;

    return (
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={styles.iconCircle}>
            <Text style={styles.cardEmoji}>{SOURCE_TYPE_EMOJI[item.sourceType] ?? '♻️'}</Text>
          </View>
          <View style={styles.cardMid}>
            <Text style={styles.cardName} numberOfLines={1}>{item.sourceName}</Text>
            <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.statusText, { color: cfg.text }]}>{label}</Text>
          </View>
        </View>
        <View style={styles.cardFooter}>
          <View style={styles.weightPill}>
            <Text style={styles.weightText}>♻️  {item.quantity} {item.unit}</Text>
          </View>
          {pts > 0 && (
            <View style={styles.pointsPill}>
              <Text style={styles.pointsText}>+{pts} pts</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F8F5" />

      {/* Filter Tabs */}
      <View style={styles.tabBar}>
        {FILTER_TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => { setActiveTab(tab); setLoading(true); }}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={r => r.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              colors={[Colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🌿</Text>
              <Text style={styles.emptyTitle}>No records yet</Text>
              <Text style={styles.emptySubtitle}>Tap + to submit your first waste record</Text>
            </View>
          }
          renderItem={renderRecord}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => (navigation as any).navigate('SubmitWasteTab')}
        activeOpacity={0.85}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#F7F8F5' },
  tabBar:           { flexDirection: 'row', paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.sm, gap: Spacing.xs },
  tab:              { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full, backgroundColor: '#fff', borderWidth: 1, borderColor: Colors.border },
  tabActive:        { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText:          { ...Typography.label, color: Colors.textSecondary },
  tabTextActive:    { color: '#fff', fontWeight: '600' },
  listContent:      { paddingHorizontal: Spacing.md, paddingBottom: 100 },
  card:             { backgroundColor: '#fff', borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadow.sm },
  cardRow:          { flexDirection: 'row', alignItems: 'center' },
  iconCircle:       { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary + '18', alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm },
  cardEmoji:        { fontSize: 20 },
  cardMid:          { flex: 1 },
  cardName:         { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  cardDate:         { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  statusBadge:      { borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  statusText:       { fontSize: 11, fontWeight: '700' },
  cardFooter:       { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm },
  weightPill:       { flexDirection: 'row', alignItems: 'center' },
  weightText:       { ...Typography.caption, color: Colors.textSecondary, fontWeight: '500' },
  pointsPill:       { backgroundColor: '#FFF3E0', borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  pointsText:       { fontSize: 11, fontWeight: '700', color: '#E65100' },
  centered:         { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState:       { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIcon:        { fontSize: 56, marginBottom: Spacing.md },
  emptyTitle:       { ...Typography.h3, color: Colors.textPrimary, marginBottom: Spacing.sm },
  emptySubtitle:    { ...Typography.body2, color: Colors.textSecondary, textAlign: 'center' },
  fab:              { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', ...Shadow.md },
  fabText:          { fontSize: 30, color: '#fff', lineHeight: 34, fontWeight: '300' },
});
