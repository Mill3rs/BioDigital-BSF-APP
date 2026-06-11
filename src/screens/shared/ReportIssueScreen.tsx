import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supportAPI } from '../../api/support';

// ── Constants ─────────────────────────────────────────────────────────────

const GREEN = '#1B5E20';
const BG = '#F7F8F5';
const CARD = '#FFFFFF';
const BORDER = '#EEF0EC';
const TEXT_PRIMARY = '#111111';
const TEXT_SECONDARY = '#666666';
const TEXT_MUTED = '#999999';
const RED = '#C62828';

const CATEGORIES = [
  { value: 'ORDER_ISSUE', label: 'Order Issue' },
  { value: 'DELIVERY_ISSUE', label: 'Delivery Issue' },
  { value: 'PAYMENT_ISSUE', label: 'Payment Issue' },
  { value: 'PRODUCT_ISSUE', label: 'Product Issue' },
  { value: 'ACCOUNT_ISSUE', label: 'Account Issue' },
  { value: 'APP_BUG', label: 'App Bug / Technical' },
  { value: 'OTHER', label: 'Other' },
];

const PRIORITIES = [
  { value: 'LOW', label: 'Low', color: '#388E3C' },
  { value: 'MEDIUM', label: 'Medium', color: '#F57C00' },
  { value: 'HIGH', label: 'High', color: '#E64A19' },
  { value: 'URGENT', label: 'Urgent', color: '#C62828' },
];

const STATUS_COLORS: Record<string, string> = {
  OPEN: '#1565C0',
  IN_PROGRESS: '#F57C00',
  RESOLVED: '#2E7D32',
  CLOSED: '#555555',
};

// ── Component ─────────────────────────────────────────────────────────────

export default function ReportIssueScreen() {
  const navigation = useNavigation();

  const [category, setCategory] = useState('ORDER_ISSUE');
  const [priority, setPriority] = useState('MEDIUM');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<{ ticketNumber: string; status: string } | null>(null);

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Missing field', 'Please enter a title for your issue.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Missing field', 'Please describe your issue.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await supportAPI.create({ category, title, description, priority });
      if (res.success && res.data) {
        setSubmittedTicket({ ticketNumber: res.data.ticketNumber, status: res.data.status });
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Could not submit ticket. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedTicket) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor={BG} />
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>✅</Text>
          <Text style={styles.successTitle}>Ticket Submitted</Text>
          <Text style={styles.successSubtitle}>
            Our support team will review your issue and get back to you.
          </Text>
          <View style={styles.ticketCard}>
            <Text style={styles.ticketLabel}>Ticket Number</Text>
            <Text style={styles.ticketNumber}>{submittedTicket.ticketNumber}</Text>
            <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[submittedTicket.status] ?? '#888' }]}>
              <Text style={styles.statusBadgeText}>{submittedTicket.status.replace('_', ' ')}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionLabel}>Category</Text>
        <View style={styles.chipRow}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c.value}
              style={[styles.chip, category === c.value && styles.chipActive]}
              onPress={() => setCategory(c.value)}
            >
              <Text style={[styles.chipText, category === c.value && styles.chipTextActive]}>
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Priority</Text>
        <View style={styles.priorityRow}>
          {PRIORITIES.map((p) => (
            <TouchableOpacity
              key={p.value}
              style={[
                styles.priorityChip,
                priority === p.value && { backgroundColor: p.color, borderColor: p.color },
              ]}
              onPress={() => setPriority(p.value)}
            >
              <Text style={[styles.priorityChipText, priority === p.value && { color: '#fff' }]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Title</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Brief summary of the issue"
          placeholderTextColor={TEXT_MUTED}
          maxLength={120}
          returnKeyType="next"
        />

        <Text style={styles.sectionLabel}>Description</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe your issue in detail..."
          placeholderTextColor={TEXT_MUTED}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          maxLength={1000}
        />
        <Text style={styles.charCount}>{description.length}/1000</Text>

        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Submit Ticket</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_SECONDARY,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD,
  },
  chipActive: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  chipText: {
    fontSize: 13,
    color: TEXT_SECONDARY,
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD,
    alignItems: 'center',
  },
  priorityChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
  input: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: TEXT_PRIMARY,
  },
  textarea: {
    minHeight: 120,
    paddingTop: 12,
  },
  charCount: {
    fontSize: 11,
    color: TEXT_MUTED,
    textAlign: 'right',
    marginTop: 4,
  },
  submitBtn: {
    backgroundColor: GREEN,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 28,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  // ── Success screen ──
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  successIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 15,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  ticketCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 32,
  },
  ticketLabel: {
    fontSize: 12,
    color: TEXT_MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  ticketNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: GREEN,
    letterSpacing: 1,
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  doneBtn: {
    backgroundColor: GREEN,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 40,
  },
  doneBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
