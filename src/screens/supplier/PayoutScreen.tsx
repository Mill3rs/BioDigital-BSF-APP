import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  FlatList,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { payoutAPI, type PayoutRequest } from '../../api/payout';

// ── Constants ─────────────────────────────────────────────────────────────
const GREEN = '#1B5E20';
const GREEN_LIGHT = '#E8F5E9';
const BG = '#F7F8F5';
const CARD = '#FFFFFF';
const BORDER = '#EEF0EC';
const TEXT_PRIMARY = '#111111';
const TEXT_SECONDARY = '#666666';
const TEXT_MUTED = '#999999';
const ORANGE = '#F57C00';
const RED = '#C62828';

const STATUS_COLORS: Record<string, string> = {
  PENDING: ORANGE,
  APPROVED: '#2E7D32',
  REJECTED: RED,
  PAID: GREEN,
};

// ── All known payment method labels ────────────────────────────────────────────
const PAYMENT_METHOD_LABELS: Record<string, string> = {
  mobile_money: '📱 Mobile Money',
  fertilizer: '🌱 Fertilizer',
  animal_feed: '🐄 Animal Feed',
};

// ── Subcomponents ──────────────────────────────────────────────────────────────────
function SectionLabel({ label }: Readonly<{ label: string }>) {
  return <Text style={styles.sectionLabel}>{label}</Text>;
}

function StatusBadge({ status }: Readonly<{ status: string }>) {
  const color = STATUS_COLORS[status] ?? TEXT_MUTED;
  return (
    <View style={[styles.badge, { backgroundColor: color + '18' }]}>
      <Text style={[styles.badgeText, { color }]}>{status}</Text>
    </View>
  );
}

function RequestCard({ item }: Readonly<{ item: PayoutRequest }>) {
  const methodLabel = item.paymentMethod ? (PAYMENT_METHOD_LABELS[item.paymentMethod] ?? item.paymentMethod.replace('_', ' ')) : null;
  return (
    <View style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <Text style={styles.requestPoints}>{item.points.toLocaleString()} pts</Text>
        <StatusBadge status={item.status} />
      </View>
      <Text style={styles.requestAmount}>GHS {item.amountGhs.toFixed(2)}</Text>
      {methodLabel ? (
        <Text style={styles.requestMeta}>via {methodLabel}</Text>
      ) : null}
      {item.notes ? <Text style={styles.requestNotes}>{item.notes}</Text> : null}
      <Text style={styles.requestDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
    </View>
  );
}

function PointsInputCard({
  pointsInput,
  setPointsInput,
  pointsBalance,
  minimumPoints,
  ratePerPoint,
  estimatedGhs,
  pointsNum,
  meetsMinimum,
}: Readonly<{
  pointsInput: string;
  setPointsInput: (v: string) => void;
  pointsBalance: number;
  minimumPoints: number;
  ratePerPoint: number;
  estimatedGhs: number;
  pointsNum: number;
  meetsMinimum: boolean;
}>) {
  const overBalance = pointsNum > pointsBalance;
  const belowMin = pointsNum > 0 && !meetsMinimum;
  return (
    <View style={styles.card}>
      {minimumPoints > 0 && (
        <View style={styles.minimumHint}>
          <Text style={styles.minimumHintText}>
            Minimum: {minimumPoints.toLocaleString()} pts required
            {ratePerPoint > 0 ? ` (≈ GHS ${(minimumPoints * ratePerPoint).toFixed(2)})` : ''}
          </Text>
        </View>
      )}
      <TextInput
        style={styles.input}
        placeholder={`Min ${minimumPoints > 0 ? minimumPoints.toLocaleString() : '1'} · Max ${pointsBalance.toLocaleString()} pts`}
        placeholderTextColor={TEXT_MUTED}
        keyboardType="number-pad"
        value={pointsInput}
        onChangeText={setPointsInput}
      />
      {pointsNum > 0 ? (
        <View style={styles.estimateRow}>
          <Text style={styles.estimateLabel}>You will receive</Text>
          <Text style={styles.estimateValue}>GHS {estimatedGhs.toFixed(2)}</Text>
        </View>
      ) : null}
      {overBalance ? (
        <Text style={styles.errorText}>Exceeds your balance of {pointsBalance.toLocaleString()} pts</Text>
      ) : null}
      {belowMin ? (
        <Text style={styles.errorText}>
          Minimum {minimumPoints.toLocaleString()} pts required. Add {(minimumPoints - pointsNum).toLocaleString()} more pts.
        </Text>
      ) : null}
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────
export default function PayoutScreen() {
  const [ratePerPoint, setRatePerPoint] = useState(0);
  const [pointsBalance, setPointsBalance] = useState(0);
  const [pointsRewardEnabled, setPointsRewardEnabled] = useState(true);
  const [enabledPayoutMethods, setEnabledPayoutMethods] = useState<string[]>(['mobile_money']);
  const [minimumPoints, setMinimumPoints] = useState(0);
  const [requests, setRequests] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [pointsInput, setPointsInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('mobile_money');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [tab, setTab] = useState<'request' | 'history'>('request');

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [settingsRes, requestsRes] = await Promise.all([
        payoutAPI.getSettings(),
        payoutAPI.getMyRequests(),
      ]);
      if (settingsRes.success && settingsRes.data) {
        setRatePerPoint(settingsRes.data.ratePerPoint);
        setPointsBalance(settingsRes.data.pointsBalance);
        setPointsRewardEnabled(settingsRes.data.pointsRewardEnabled ?? true);
        const methods = settingsRes.data.enabledPayoutMethods ?? ['mobile_money'];
        setEnabledPayoutMethods(methods);
        setPaymentMethod(methods[0] ?? 'mobile_money');
        setMinimumPoints(settingsRes.data.minimumPoints ?? 0);
      }
      if (requestsRes.success && requestsRes.data) {
        setRequests(requestsRes.data.requests);
      }
    } catch {
      Alert.alert('Error', 'Failed to load payout information');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const pointsNum = Number.parseInt(pointsInput, 10) || 0;
  const estimatedGhs = Number.parseFloat((pointsNum * ratePerPoint).toFixed(2));
  const needsAccountDetails = paymentMethod === 'mobile_money';
  const meetsMinimum = minimumPoints === 0 || pointsNum >= minimumPoints;
  const canSubmit =
    pointsRewardEnabled &&
    pointsNum > 0 &&
    pointsNum <= pointsBalance &&
    meetsMinimum &&
    (!needsAccountDetails || (accountName.trim().length > 0 && accountNumber.trim().length > 0));

  async function handleSubmit() {
    if (!canSubmit) return;
    Alert.alert(
      'Confirm Payout Request',
      `Redeem ${pointsNum.toLocaleString()} pts for GHS ${estimatedGhs.toFixed(2)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          style: 'default',
          onPress: async () => {
            setSubmitting(true);
            try {
              const res = await payoutAPI.submitRequest({
                points: pointsNum,
                paymentMethod,
                paymentDetails: needsAccountDetails
                  ? { accountName: accountName.trim(), accountNumber: accountNumber.trim() }
                  : {},
              });
              if (res.success) {
                Alert.alert('Success', 'Your payout request has been submitted!');
                setPointsInput('');
                setAccountName('');
                setAccountNumber('');
                setTab('history');
                await fetchData(true);
              } else {
                Alert.alert('Error', (res as { message?: string }).message ?? 'Failed to submit request');
              }
            } catch (err: unknown) {
              const msg =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
                'Failed to submit request';
              Alert.alert('Error', msg);
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={GREEN} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Points Payout</Text>
        <View style={styles.balanceChip}>
          <Text style={styles.balanceChipLabel}>Balance</Text>
          <Text style={styles.balanceChipValue}>{pointsBalance.toLocaleString()} pts</Text>
        </View>
      </View>

      {/* Rate Info */}
      <View style={styles.rateCard}>
        <Text style={styles.rateLabel}>Current Rate</Text>
        <Text style={styles.rateValue}>
          GHS {ratePerPoint.toFixed(4)} <Text style={styles.rateSub}>/ point</Text>
        </Text>
        <Text style={styles.rateHint}>
          Your {pointsBalance.toLocaleString()} pts ≈ GHS {(pointsBalance * ratePerPoint).toFixed(2)}
        </Text>
      </View>

      {!pointsRewardEnabled && (
        <View style={styles.disabledBanner}>
          <Text style={styles.disabledBannerText}>
            ⚠️ The points reward system is currently disabled. Contact your admin for more information.
          </Text>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabRow}>
        {(['request', 'history'] as const).map((t) => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'request' ? '💰 Request Payout' : '📋 History'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'request' ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} />}
        >
          <SectionLabel label="Points to Redeem" />
          <PointsInputCard
            pointsInput={pointsInput}
            setPointsInput={setPointsInput}
            pointsBalance={pointsBalance}
            minimumPoints={minimumPoints}
            ratePerPoint={ratePerPoint}
            estimatedGhs={estimatedGhs}
            pointsNum={pointsNum}
            meetsMinimum={meetsMinimum}
          />

          <SectionLabel label="Payment Method" />
          <View style={styles.card}>
            {enabledPayoutMethods.map((key) => (
              <TouchableOpacity
                key={key}
                style={[styles.methodRow, paymentMethod === key && styles.methodRowActive]}
                onPress={() => setPaymentMethod(key)}
              >
                <Text style={styles.methodLabel}>{PAYMENT_METHOD_LABELS[key] ?? key.replace('_', ' ')}</Text>
                {paymentMethod === key ? <Text style={styles.methodCheck}>✓</Text> : null}
              </TouchableOpacity>
            ))}
          </View>

          {needsAccountDetails && (
            <>
              <SectionLabel label="Account Details" />
              <View style={styles.card}>
                <TextInput
                  style={[styles.input, styles.inputBorder]}
                  placeholder="Account / Wallet Name"
                  placeholderTextColor={TEXT_MUTED}
                  value={accountName}
                  onChangeText={setAccountName}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Mobile Number (e.g. 024XXXXXXX)"
                  placeholderTextColor={TEXT_MUTED}
                  keyboardType="phone-pad"
                  value={accountNumber}
                  onChangeText={setAccountNumber}
                />
              </View>
            </>
          )}

          <TouchableOpacity
            style={[styles.submitBtn, (!canSubmit || submitting) && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit || submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>Submit Payout Request</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <RequestCard item={item} />}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>💳</Text>
              <Text style={styles.emptyText}>No payout requests yet</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    backgroundColor: CARD,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: TEXT_PRIMARY },
  balanceChip: {
    backgroundColor: GREEN_LIGHT,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
  },
  balanceChipLabel: { fontSize: 10, color: GREEN, fontWeight: '600' },
  balanceChipValue: { fontSize: 14, color: GREEN, fontWeight: '700' },
  rateCard: {
    backgroundColor: GREEN,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 14,
    padding: 16,
  },
  rateLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 2 },
  rateValue: { fontSize: 22, fontWeight: '700', color: '#fff' },
  rateSub: { fontSize: 13, fontWeight: '400' },
  rateHint: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  tabRow: { flexDirection: 'row', marginHorizontal: 16, marginTop: 14, backgroundColor: CARD, borderRadius: 10, padding: 4 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: GREEN },
  tabText: { fontSize: 13, fontWeight: '600', color: TEXT_SECONDARY },
  tabTextActive: { color: '#fff' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  listContent: { padding: 16, paddingBottom: 40 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 16 },
  card: { backgroundColor: CARD, borderRadius: 12, borderWidth: 1, borderColor: BORDER, overflow: 'hidden' },
  input: { padding: 14, fontSize: 15, color: TEXT_PRIMARY },
  inputBorder: { borderBottomWidth: 1, borderBottomColor: BORDER },
  estimateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: GREEN_LIGHT, borderTopWidth: 1, borderTopColor: BORDER },
  estimateLabel: { fontSize: 13, color: GREEN },
  estimateValue: { fontSize: 16, fontWeight: '700', color: GREEN },
  errorText: { fontSize: 12, color: RED, padding: 10 },
  minimumHint: { backgroundColor: '#E8F5E9', borderRadius: 6, padding: 8, marginBottom: 4 },
  minimumHintText: { fontSize: 12, color: '#2E7D32' },
  disabledBanner: { backgroundColor: '#FFF3E0', borderRadius: 10, margin: 16, padding: 14, borderWidth: 1, borderColor: '#FFB74D' },
  disabledBannerText: { fontSize: 13, color: '#E65100', lineHeight: 19 },
  methodRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderBottomColor: BORDER },
  methodRowActive: { backgroundColor: GREEN_LIGHT },
  methodLabel: { fontSize: 15, color: TEXT_PRIMARY },
  methodCheck: { fontSize: 16, color: GREEN, fontWeight: '700' },
  submitBtn: { backgroundColor: GREEN, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24 },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  requestCard: { backgroundColor: CARD, borderRadius: 12, borderWidth: 1, borderColor: BORDER, padding: 14, marginBottom: 10 },
  requestHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  requestPoints: { fontSize: 16, fontWeight: '700', color: TEXT_PRIMARY },
  requestAmount: { fontSize: 20, fontWeight: '700', color: GREEN, marginBottom: 4 },
  requestMeta: { fontSize: 12, color: TEXT_SECONDARY, marginBottom: 2 },
  requestNotes: { fontSize: 12, color: TEXT_MUTED, fontStyle: 'italic', marginTop: 4 },
  requestDate: { fontSize: 11, color: TEXT_MUTED, marginTop: 6 },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 15, color: TEXT_MUTED },
});
