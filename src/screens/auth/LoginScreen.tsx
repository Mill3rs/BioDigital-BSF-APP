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
  StatusBar,
  Image,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { useAuth } from '../../store/authStore';
import { COUNTRY_CODES, type CountryCode } from '../../utils/countryCodes';
import { apiClient } from '../../api/client';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';

GoogleSignin.configure({
  webClientId: '484345082412-4v6sr55etf3mmcclvh8ksi8ht59hrf0d.apps.googleusercontent.com',
  offlineAccess: true,
});

const BG = '#0B1E10';
const INPUT_BG = '#0F2216';
const INPUT_BORDER = '#1D3828';
const ACCENT = '#4ADE80';
const TEXT = '#FFFFFF';
const SUBTEXT = 'rgba(255,255,255,0.5)';
const PLACEHOLDER = 'rgba(255,255,255,0.3)';
const TAB_BG = '#1A3425';

const DEFAULT_COUNTRY = COUNTRY_CODES.find((c) => c.code === 'GH') ?? COUNTRY_CODES[0];

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Readonly<Props>) {
  const { login, googleSignIn, isLoading, error, clearError } = useAuth();
  const [loginMode, setLoginMode] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(DEFAULT_COUNTRY);
  const [phoneLocal, setPhoneLocal] = useState('');
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phoneAuthEnabled, setPhoneAuthEnabled] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [rolePicker, setRolePicker] = useState<{ open: boolean; idToken: string }>({ open: false, idToken: '' });

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

  const handleLogin = async () => {
    const identifier =
      loginMode === 'phone'
        ? selectedCountry.dial + phoneLocal.trim()
        : email.trim();
    if (!identifier || !password.trim()) return;
    try {
      await login(identifier, password);
    } catch {
      // error displayed via error state
    }
  };

  const handleGoogleSignIn = async (role?: string) => {
    setGoogleLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken ?? userInfo.idToken;
      if (!idToken) throw new Error('No ID token from Google');
      const result = await googleSignIn(idToken, role);
      if (result.roleRequired) {
        setRolePicker({ open: true, idToken });
      }
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (e.code === statusCodes.SIGN_IN_CANCELLED) return;
      if (e.code === statusCodes.IN_PROGRESS) return;
      Alert.alert('Google Sign-In failed', e.message ?? 'Something went wrong');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleRolePick = async (role: string) => {
    setRolePicker(p => ({ ...p, open: false }));
    setGoogleLoading(true);
    try {
      await googleSignIn(rolePicker.idToken, role);
    } catch (err: unknown) {
      const e = err as { message?: string };
      Alert.alert('Sign-In failed', e.message ?? 'Something went wrong');
    } finally {
      setGoogleLoading(false);
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

        {/* Brand */}
        <View style={styles.brand}>
          <Image
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            source={require('../../assets/BioDigitalBSFWhiteMono.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.brandTagline}>Sustainable Waste Solutions</Text>
        </View>

        {/* Heading */}
        <Text style={styles.heading}>Welcome back</Text>
        <Text style={styles.subheading}>Sign in to continue</Text>

        {/* Error */}
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={clearError} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.errorDismiss}>✕</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Login mode tabs — only shown when phone auth is enabled */}
        {phoneAuthEnabled && (
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, loginMode === 'email' && styles.tabActive]}
              onPress={() => setLoginMode('email')}>
              <Text style={[styles.tabText, loginMode === 'email' && styles.tabTextActive]}>Email</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, loginMode === 'phone' && styles.tabActive]}
              onPress={() => setLoginMode('phone')}>
              <Text style={[styles.tabText, loginMode === 'phone' && styles.tabTextActive]}>Phone</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Fields */}
        <View style={styles.form}>
          {loginMode === 'email' ? (
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor={PLACEHOLDER}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
          ) : (
            <View style={styles.phoneRow}>
              <TouchableOpacity
                style={styles.dialPicker}
                onPress={() => setCountryPickerOpen(true)}>
                <Text style={styles.dialText}>{selectedCountry.flag} {selectedCountry.dial}</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.phoneInput}
                placeholder="Phone Number"
                placeholderTextColor={PLACEHOLDER}
                value={phoneLocal}
                onChangeText={(t) => setPhoneLocal(t.replace(/\D/g, ''))}
                keyboardType="phone-pad"
                editable={!isLoading}
              />
            </View>
          )}

          <View style={styles.passwordWrap}>
            <TextInput
              style={styles.passwordField}
              placeholder="Password"
              placeholderTextColor={PLACEHOLDER}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              editable={!isLoading}
            />
            <TouchableOpacity
              onPress={() => setShowPassword((v) => !v)}
              style={styles.eyeBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Forgot */}
        <TouchableOpacity
          style={styles.forgotBtn}
          onPress={() => navigation.navigate('ForgotPassword')}>
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </TouchableOpacity>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.ctaBtn, isLoading && styles.ctaBtnDisabled]}
          onPress={handleLogin}
          disabled={isLoading}
          activeOpacity={0.85}>
          {isLoading ? (
            <ActivityIndicator color="#0B1E10" />
          ) : (
            <Text style={styles.ctaBtnText}>Sign In</Text>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Google Sign-In */}
        <TouchableOpacity
          style={[styles.googleBtn, googleLoading && styles.ctaBtnDisabled]}
          onPress={() => handleGoogleSignIn()}
          disabled={googleLoading}
          activeOpacity={0.85}>
          {googleLoading ? (
            <ActivityIndicator color="#444" />
          ) : (
            <>
              <Text style={styles.googleIcon}>G</Text>
              <Text style={styles.googleBtnText}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('RoleSelection')}>
            <Text style={styles.footerLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Role picker modal (for new Google users) */}
      <Modal
        visible={rolePicker.open}
        animationType="slide"
        transparent
        onRequestClose={() => setRolePicker(p => ({ ...p, open: false }))}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose your role</Text>
              <TouchableOpacity onPress={() => setRolePicker(p => ({ ...p, open: false }))}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginHorizontal: 16, marginBottom: 12 }}>
              Select how you'll use the app
            </Text>
            {(['BUYER', 'SUPPLIER', 'DRIVER'] as const).map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.countryItem]}
                onPress={() => handleRolePick(r)}>
                <Text style={styles.countryItemText}>
                  {r === 'BUYER' ? '🛒  Buyer' : r === 'SUPPLIER' ? '🧑‍🌾  Supplier' : '🚚  Driver'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Country picker modal */}
      <Modal
        visible={countryPickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setCountryPickerOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country Code</Text>
              <TouchableOpacity onPress={() => { setCountryPickerOpen(false); setCountrySearch(''); }}>
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
                  style={[styles.countryItem, item.code === selectedCountry.code && styles.countryItemActive]}
                  onPress={() => { setSelectedCountry(item); setCountryPickerOpen(false); setCountrySearch(''); }}>
                  <Text style={styles.countryItemText}>{item.flag}  {item.name}</Text>
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
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 60,
    paddingBottom: 40,
    justifyContent: 'center',
  },

  brand: { alignItems: 'center', marginBottom: 32 },
  logo: {
    width: 200,
    height: 72,
    marginBottom: 8,
  },
  brandTagline: { fontSize: 13, color: SUBTEXT },

  heading: { fontSize: 26, fontWeight: '800', color: TEXT, marginBottom: 6 },
  subheading: { fontSize: 14, color: SUBTEXT, marginBottom: 24 },

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

  form: { gap: 12, marginBottom: 8 },
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

  forgotBtn: { alignSelf: 'flex-end', marginBottom: 24 },
  forgotText: { fontSize: 13, color: ACCENT },

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

  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    borderRadius: 14,
    paddingHorizontal: 12,
    gap: 8,
  },
  dialPicker: {
    paddingVertical: 15,
    paddingRight: 8,
    borderRightWidth: 1,
    borderRightColor: INPUT_BORDER,
  },
  dialText: { fontSize: 14, color: TEXT },
  phoneInput: { flex: 1, fontSize: 15, color: TEXT, paddingVertical: 15 },

  ctaBtn: {
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  ctaBtnDisabled: { opacity: 0.6 },
  ctaBtnText: { fontSize: 16, fontWeight: '700', color: '#0B1E10' },

  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 18 },
  dividerLine: { flex: 1, height: 1, backgroundColor: INPUT_BORDER },
  dividerText: { color: SUBTEXT, fontSize: 13, marginHorizontal: 12 },

  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 14,
    gap: 10,
  },
  googleIcon: { fontSize: 18, fontWeight: '700', color: '#4285F4' },
  googleBtnText: { fontSize: 15, fontWeight: '600', color: '#333' },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 28,
  },
  footerText: { fontSize: 14, color: SUBTEXT },
  footerLink: { fontSize: 14, color: ACCENT, fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#0F2216', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '75%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: INPUT_BORDER },
  modalTitle: { fontSize: 16, fontWeight: '700', color: TEXT },
  modalClose: { fontSize: 18, color: SUBTEXT, padding: 4 },
  searchInput: { margin: 16, backgroundColor: INPUT_BG, borderWidth: 1, borderColor: INPUT_BORDER, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: TEXT },
  countryItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  countryItemActive: { backgroundColor: 'rgba(74,222,128,0.08)' },
  countryItemText: { fontSize: 15, color: TEXT },
  countryItemDial: { fontSize: 14, color: ACCENT, fontWeight: '600' },
});
