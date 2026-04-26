import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { useAuth } from '../../store/authStore';
import { Colors, Spacing, Radius, Typography, Shadow } from '../../utils/theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';

type Props = NativeStackScreenProps<AuthStackParamList, 'CompanyCode'>;

export default function CompanyCodeScreen({ navigation }: Props) {
  const { verifyCompanyCode, isLoading, error, clearError } = useAuth();
  const [code, setCode] = useState('');

  const handleSubmit = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      Alert.alert('Required', 'Please enter the company invite code');
      return;
    }
    try {
      const companyName = await verifyCompanyCode(trimmed);
      Alert.alert(
        'Company Linked!',
        `You are now associated with ${companyName}. Next, set your location.`,
        [{ text: 'Continue', onPress: () => navigation.replace('LocationSetup') }],
      );
    } catch {
      // error shown via context
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>🏢</Text>
        </View>

        <Text style={styles.title}>Enter Company Code</Text>
        <Text style={styles.subtitle}>
          Your company admin will provide a unique invite code to link your account to their
          organisation.
        </Text>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={clearError}>
              <Text style={styles.errorDismiss}>✕</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.label}>Invite Code</Text>
          <TextInput
            style={styles.codeInput}
            placeholder="e.g. A1B2C3D4"
            placeholderTextColor={Colors.textLight}
            value={code}
            onChangeText={v => setCode(v.toUpperCase())}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={16}
            editable={!isLoading}
          />
          <Text style={styles.hint}>
            Contact your company administrator if you don't have a code.
          </Text>

          <TouchableOpacity
            style={[styles.primaryBtn, isLoading && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Verify Code</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.stepsRow}>
          <View style={[styles.step, styles.stepDone]} />
          <View style={[styles.step, styles.stepActive]} />
          <View style={styles.step} />
        </View>
        <Text style={styles.stepsLabel}>Step 2 of 3 — Company Association</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1, padding: Spacing.lg, alignItems: 'center', justifyContent: 'center' },

  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryLight + '22',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  icon: { fontSize: 36 },

  title: { ...Typography.h2, color: Colors.textPrimary, textAlign: 'center', marginBottom: Spacing.sm },
  subtitle: {
    ...Typography.body1,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.errorLight,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    width: '100%',
  },
  errorText: { flex: 1, color: Colors.error, fontSize: 14 },
  errorDismiss: { color: Colors.error, fontSize: 16, marginLeft: Spacing.sm },

  card: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    ...Shadow.md,
    marginBottom: Spacing.xl,
  },

  label: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: Spacing.sm },

  codeInput: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 4,
    backgroundColor: Colors.surfaceAlt,
    marginBottom: Spacing.sm,
  },
  hint: { fontSize: 12, color: Colors.textLight, textAlign: 'center', marginBottom: Spacing.lg },

  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  stepsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xs },
  step: { width: 32, height: 4, borderRadius: 2, backgroundColor: Colors.border },
  stepDone: { backgroundColor: Colors.primaryLight },
  stepActive: { backgroundColor: Colors.primary },
  stepsLabel: { fontSize: 12, color: Colors.textLight },
});
