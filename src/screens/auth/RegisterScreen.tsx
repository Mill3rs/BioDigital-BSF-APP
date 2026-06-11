import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  StatusBar,
} from 'react-native';
import { useAuth } from '../../store/authStore';
import { COUNTRY_CODES, type CountryCode } from '../../utils/countryCodes';
import { apiClient } from '../../api/client';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';

const BG = '#0B1E10';
const INPUT_BG = '#0F2216';
const INPUT_BORDER = '#1D3828';
const ACCENT = '#4ADE80';
const TEXT = '#FFFFFF';
const SUBTEXT = 'rgba(255,255,255,0.5)';
const PLACEHOLDER = 'rgba(255,255,255,0.3)';
const TAB_BG = '#1A3425';

const ROLE_LABELS: Record<string, string> = {
  DRIVER: 'Driver',
  SUPPLIER: 'Bio Supplier',
  BUYER: 'Buyer',
};

const DEFAULT_COUNTRY = COUNTRY_CODES.find((c) => c.code === 'GH') ?? COUNTRY_CODES[0];

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export default function RegisterScreen({ navigation, route }: Readonly<Props>) {
  const { register, isLoading, error, clearError } = useAuth();
  const initialRole = route.params?.role ?? 'BUYER';

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(DEFAULT_COUNTRY);
  const [phoneLocal, setPhoneLocal] = useState('');
  const [location, setLocation] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [supplierType, setSupplierType] = useState<'FARMER' | 'COMPANY'>('FARMER');
  const [organizationName, setOrganizationName] = useState('');
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [phoneAuthEnabled, setPhoneAuthEnabled] = useState(false);

  useEffect(() => {
    apiClient
      .get<{ success: boolean; data: { phoneAuthEnabled: boolean } }>('/auth/public-settings')
      .then((res) => { if (res.data.success) setPhoneAuthEnabled(res.data.data.phoneAuthEnabled); })
      .catch(() => { /* default to false */ });
  }, []);

  const filteredCountries = countrySearch.trim()
    ? COUNTRY_CODES.filter(
        (c) =>
          c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
          c.dial.includes(countrySearch),
      )
    : COUNTRY_CODES;

  const handleRegister = async () => {
    const phoneNumber = phoneLocal.trim()
      ? selectedCountry.dial + phoneLocal.trim()
      : undefined;
    if (!fullName.trim() || (!email.trim() && (!phoneAuthEnabled || !phoneNumber))) {
      Alert.alert(
        'Missing fields',
        phoneAuthEnabled
          ? 'Please provide your full name and at least an email or phone number.'
          : 'Please provide your full name and email address.',
      );
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password mismatch', 'Passwords do not match.');
      return;
    }
    try {
      await register({
        fullName: fullName.trim(),
        email: email.trim() || undefined,
        password,
        phoneNumber,
        role: initialRole,
        ...(initialRole === 'SUPPLIER' && {
          supplierType,
          organizationName: organizationName.trim() || undefined,
        }),
      });
    } catch {
      // error surfaced via error state
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.pageHeader}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.pageTitle}>Create Your Account</Text>
            <Text style={styles.pageSubtitle}>
              Registering as:{' '}
              <Text style={styles.roleHighlight}>{ROLE_LABELS[initialRole]}</Text>
            </Text>
          </View>
        </View>

        {/* Error banner */}
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={clearError} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.errorDismiss}>✕</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Supplier type toggle */}
        {initialRole === 'SUPPLIER' && (
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, supplierType === 'FARMER' && styles.tabActive]}
              onPress={() => setSupplierType('FARMER')}>
              <Text style={[styles.tabText, supplierType === 'FARMER' && styles.tabTextActive]}>
                Farmer
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, supplierType === 'COMPANY' && styles.tabActive]}
              onPress={() => setSupplierType('COMPANY')}>
              <Text style={[styles.tabText, supplierType === 'COMPANY' && styles.tabTextActive]}>
                Agri-Company
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Form fields */}
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            placeholderTextColor={PLACEHOLDER}
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
          />
          <TextInput
            style={styles.input}
            placeholder={phoneAuthEnabled ? 'Email Address (optional if phone provided)' : 'Email Address'}
            placeholderTextColor={PLACEHOLDER}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          {/* Phone — only shown when phone auth is enabled */}
          {phoneAuthEnabled && (
            <TouchableOpacity
              style={styles.countryRow}
              onPress={() => setCountryPickerOpen(true)}
              activeOpacity={0.7}>
              <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
              <Text style={styles.countryDialText}>{selectedCountry.dial}</Text>
              <Text style={styles.countryChevron}>▾</Text>
              <TextInput
                style={styles.phoneInput}
                placeholder="Phone Number"
                placeholderTextColor={PLACEHOLDER}
                value={phoneLocal}
                onChangeText={(t) => setPhoneLocal(t.split('').filter(ch => ch >= '0' && ch <= '9').join(''))}
                keyboardType="number-pad"
              />
            </TouchableOpacity>
          )}

          <TextInput
            style={styles.input}
            placeholder="Location (City, State)"
            placeholderTextColor={PLACEHOLDER}
            value={location}
            onChangeText={setLocation}
          />

          {/* Supplier org/farm name */}
          {initialRole === 'SUPPLIER' && (
            <TextInput
              style={styles.input}
              placeholder={supplierType === 'COMPANY' ? 'Company Name' : 'Farm Name'}
              placeholderTextColor={PLACEHOLDER}
              value={organizationName}
              onChangeText={setOrganizationName}
            />
          )}

          {/* Password */}
          <View style={styles.passwordWrap}>
            <TextInput
              style={styles.passwordField}
              placeholder="Password"
              placeholderTextColor={PLACEHOLDER}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword((v) => !v)}
              style={styles.eyeBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.passwordWrap}>
            <TextInput
              style={styles.passwordField}
              placeholder="Confirm Password"
              placeholderTextColor={PLACEHOLDER}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirm}
            />
            <TouchableOpacity
              onPress={() => setShowConfirm((v) => !v)}
              style={styles.eyeBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.eyeIcon}>{showConfirm ? '🙈' : '👁'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.ctaBtn, isLoading && styles.ctaBtnDisabled]}
          onPress={handleRegister}
          disabled={isLoading}
          activeOpacity={0.85}>
          {isLoading ? (
            <ActivityIndicator color="#0B1E10" />
          ) : (
            <Text style={styles.ctaBtnText}>Create Account</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.footerLink}>Sign in</Text>
          </TouchableOpacity>
          <Text style={styles.footerDot}> · </Text>
          <TouchableOpacity onPress={() => navigation.navigate('RoleSelection')}>
            <Text style={styles.footerLink}>Learn more about roles</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Country picker modal */}
      <Modal
        visible={countryPickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setCountryPickerOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country</Text>
              <TouchableOpacity
                onPress={() => { setCountryPickerOpen(false); setCountrySearch(''); }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Search country or code…"
              placeholderTextColor={PLACEHOLDER}
              value={countrySearch}
              onChangeText={setCountrySearch}
              autoCapitalize="none"
            />
            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.countryItem,
                    item.code === selectedCountry.code && styles.countryItemActive,
                  ]}
                  onPress={() => {
                    setSelectedCountry(item);
                    setCountryPickerOpen(false);
                    setCountrySearch('');
                  }}>
                  <Text style={styles.countryItemText}>
                    {item.flag}  {item.name}
                  </Text>
                  <Text style={styles.countryItemDial}>{item.dial}</Text>
                </TouchableOpacity>
              )}
              keyboardShouldPersistTaps="handled"
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 56, paddingBottom: 40 },

  pageHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 28,
    gap: 12,
  },
  backBtn: {
    marginTop: 4,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: { fontSize: 18, color: TEXT, lineHeight: 22 },
  headerText: { flex: 1 },
  pageTitle: { fontSize: 24, fontWeight: '800', color: TEXT, marginBottom: 4 },
  pageSubtitle: { fontSize: 14, color: SUBTEXT },
  roleHighlight: { color: ACCENT, fontWeight: '600' },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { flex: 1, fontSize: 13, color: '#FCA5A5' },
  errorDismiss: { color: '#FCA5A5', fontWeight: '700', marginLeft: 8 },

  tabRow: {
    flexDirection: 'row',
    backgroundColor: TAB_BG,
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: TEXT },
  tabText: { fontSize: 14, fontWeight: '600', color: SUBTEXT },
  tabTextActive: { color: '#0B1E10' },

  form: { gap: 12 },
  input: {
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 15,
    color: TEXT,
  },

  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 6,
  },
  countryFlag: { fontSize: 20 },
  countryDialText: { fontSize: 14, color: TEXT, fontWeight: '500' },
  countryChevron: { fontSize: 11, color: SUBTEXT },
  phoneInput: {
    flex: 1,
    fontSize: 15,
    color: TEXT,
    paddingVertical: 11,
    paddingLeft: 4,
  },

  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    borderRadius: 14,
    paddingHorizontal: 16,
  },
  passwordField: { flex: 1, fontSize: 15, color: TEXT, paddingVertical: 15 },
  eyeBtn: { padding: 4 },
  eyeIcon: { fontSize: 18 },

  ctaBtn: {
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 28,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  ctaBtnDisabled: { opacity: 0.6 },
  ctaBtnText: { fontSize: 16, fontWeight: '700', color: '#0B1E10' },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
    gap: 4,
  },
  footerLink: { fontSize: 14, color: SUBTEXT },
  footerDot: { fontSize: 14, color: 'rgba(255,255,255,0.2)' },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalSheet: {
    backgroundColor: '#112318',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '75%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: INPUT_BORDER,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: TEXT },
  modalClose: { fontSize: 18, color: SUBTEXT, fontWeight: '600' },
  searchInput: {
    margin: 16,
    backgroundColor: INPUT_BG,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: TEXT,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
  },
  countryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(29,56,40,0.5)',
  },
  countryItemActive: { backgroundColor: 'rgba(74,222,128,0.08)' },
  countryItemText: { fontSize: 15, color: TEXT },
  countryItemDial: { fontSize: 14, color: SUBTEXT },
});
