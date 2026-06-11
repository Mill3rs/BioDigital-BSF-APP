import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Modal, FlatList, StatusBar, Image,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../store/authStore';
import { usersAPI } from '../../api/users';
import { driverAPI } from '../../api/driver';
import { COUNTRY_CODES, type CountryCode } from '../../utils/countryCodes';
import type { DriverProfile } from '../../types';

// ── Constants ─────────────────────────────────────────────────────────────

const GREEN = '#1B5E20';
const BG = '#F7F8F5';
const CARD = '#FFFFFF';
const BORDER = '#EEF0EC';
const TEXT_PRIMARY = '#111111';
const TEXT_SECONDARY = '#666666';
const TEXT_MUTED = '#999999';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#2E7D32',
  PENDING: '#F57C00',
  SUSPENDED: '#C62828',
  INACTIVE: '#888',
};

const ROLE_LABELS: Record<string, string> = {
  BUYER: 'Buyer',
  DRIVER: 'Delivery Driver',
  SUPPLIER: 'Waste Supplier',
};

const DEFAULT_COUNTRY = COUNTRY_CODES.find((c) => c.code === 'GH') ?? COUNTRY_CODES[0];

// ── Module-level helpers ──────────────────────────────────────────────────

function formatDuration(totalSecs: number): string {
  if (totalSecs < 60) return `${Math.round(totalSecs)}s`;
  const m = Math.floor(totalSecs / 60);
  const s = Math.round(totalSecs % 60);
  if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

type AvgTiming = { pickup: number; delivery: number; count: number };

async function loadTimingData(): Promise<AvgTiming | null> {
  const keys = await AsyncStorage.getAllKeys();
  const timingKeys = keys.filter(k => k.startsWith('waste_timing_'));
  if (timingKeys.length === 0) return null;
  const pairs = await AsyncStorage.multiGet(timingKeys);
  let totalPickup = 0;
  let totalDelivery = 0;
  let count = 0;
  for (const [, raw] of pairs) {
    if (!raw) continue;
    try {
      const t = JSON.parse(raw) as { pickup: number; delivery: number };
      totalPickup += t.pickup;
      totalDelivery += t.delivery;
      count++;
    } catch { /* skip */ }
  }
  return count > 0 ? { pickup: totalPickup / count, delivery: totalDelivery / count, count } : null;
}

function parseStoredPhone(stored: string): { country: CountryCode; local: string } {
  const match = COUNTRY_CODES.find((c) => stored.startsWith(c.dial));
  if (match) {
    return { country: match, local: stored.slice(match.dial.length).replaceAll(/\D/g, '') };
  }
  return { country: DEFAULT_COUNTRY, local: stored.replaceAll(/\D/g, '') };
}

function validatePasswordChange(newPwd: string, confirmPwd: string): string | null {
  if (newPwd !== confirmPwd) return 'New passwords do not match.';
  if (newPwd.length < 8) return 'Password must be at least 8 characters.';
  return null;
}

// ── Reusable primitives ───────────────────────────────────────────────────

function SectionLabel({ label }: Readonly<{ label: string }>) {
  return <Text style={styles.sectionLabel}>{label}</Text>;
}

function InfoRow({
  icon, label, value, last,
}: Readonly<{ icon: string; label: string; value: string; last?: boolean }>) {
  return (
    <View style={[styles.infoRow, last ? styles.infoRowLast : null]}>
      <View style={styles.infoRowIcon}>
        <Text style={styles.infoRowIconText}>{icon}</Text>
      </View>
      <View style={styles.infoRowContent}>
        <Text style={styles.infoRowLabel}>{label}</Text>
        <Text style={styles.infoRowValue}>{value}</Text>
      </View>
    </View>
  );
}

function SettingsRow({
  icon, label, value, onPress, last, danger,
}: Readonly<{ icon: string; label: string; value?: string; onPress?: () => void; last?: boolean; danger?: boolean }>) {
  return (
    <TouchableOpacity
      style={[styles.settingsRow, last ? styles.settingsRowLast : null]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}>
      <View style={[styles.settingsRowIcon, danger ? styles.settingsRowIconDanger : null]}>
        <Text style={styles.settingsRowIconText}>{icon}</Text>
      </View>
      <Text style={[styles.settingsRowLabel, danger ? styles.settingsRowLabelDanger : null]}>
        {label}
      </Text>
      {value ? <Text style={styles.settingsRowValue}>{value}</Text> : null}
      {onPress && !danger ? <Text style={styles.chevron}>›</Text> : null}
    </TouchableOpacity>
  );
}

// ── Driver stats section ──────────────────────────────────────────────────

interface DriverStatsSectionProps {
  driverProfile: DriverProfile;
  avgTiming: AvgTiming | null;
}

function DriverStatsSection({ driverProfile, avgTiming }: Readonly<DriverStatsSectionProps>) {
  const color = STATUS_COLORS[driverProfile.status] ?? '#888';
  return (
    <>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{driverProfile.rating.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
        <View style={[styles.statCard, styles.statCardDark]}>
          <Text style={[styles.statValue, styles.statValueLight]}>{driverProfile.totalDeliveries}</Text>
          <Text style={[styles.statLabel, styles.statLabelLight]}>Deliveries</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statusPill, { backgroundColor: color + '18' }]}>
            <View style={[styles.statusDot, { backgroundColor: color }]} />
            <Text style={[styles.statusPillText, { color }]}>{driverProfile.status}</Text>
          </View>
          <Text style={styles.statLabel}>Status</Text>
        </View>
      </View>
      <View style={[styles.statsRow, { marginTop: 0 }]}>
        <View style={[styles.statCard, styles.statCardDark]}>
          <Text style={[styles.statValue, styles.statValueLight]}>{driverProfile.totalWasteDelivered ?? 0}</Text>
          <Text style={[styles.statLabel, styles.statLabelLight]}>Waste Delivered</Text>
        </View>
      </View>
      {avgTiming ? (
        <View style={styles.timingCard}>
          <Text style={styles.timingCardTitle}>
            Avg. Trip Times · {avgTiming.count} trip{avgTiming.count === 1 ? '' : 's'}
          </Text>
          <View style={styles.timingRow}>
            <View style={[styles.timingCell, styles.timingCellBorder]}>
              <Text style={styles.timingIcon}>🚗</Text>
              <Text style={styles.timingValue}>{formatDuration(avgTiming.pickup)}</Text>
              <Text style={styles.timingLabel}>Avg Pickup</Text>
            </View>
            <View style={styles.timingCell}>
              <Text style={styles.timingIcon}>🏭</Text>
              <Text style={styles.timingValue}>{formatDuration(avgTiming.delivery)}</Text>
              <Text style={styles.timingLabel}>Avg Delivery</Text>
            </View>
          </View>
        </View>
      ) : null}
    </>
  );
}

// ── Supplier stats section ───────────────────────────────────────────────

function SupplierStatsSection({ profile }: Readonly<{ profile: SupplierProfileData | undefined }>) {
  if (!profile) return null;
  const color = STATUS_COLORS[profile.status ?? ''] ?? '#888';
  return (
    <View style={styles.statsRow}>
      <View style={[styles.statCard, styles.statCardDark]}>
        <Text style={[styles.statValue, styles.statValueLight]}>
          {(profile.totalWasteSupplied ?? 0).toFixed(1)}
        </Text>
        <Text style={[styles.statLabel, styles.statLabelLight]}>kg Supplied</Text>
      </View>
      {profile.rating == null ? null : (
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{profile.rating.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
      )}
      {profile.status ? (
        <View style={styles.statCard}>
          <View style={[styles.statusPill, { backgroundColor: color + '18' }]}>
            <View style={[styles.statusDot, { backgroundColor: color }]} />
            <Text style={[styles.statusPillText, { color }]}>{profile.status}</Text>
          </View>
          <Text style={styles.statLabel}>Status</Text>
        </View>
      ) : null}
    </View>
  );
}

// ── Driver details card ───────────────────────────────────────────────────

function DriverDetailsCard({ driverProfile }: Readonly<{ driverProfile: DriverProfile }>) {
  const vehicle = [driverProfile.vehicleType, driverProfile.vehicleModel].filter(Boolean).join(' · ');
  const noExtras = !driverProfile.vehicleType && !driverProfile.vehicleModel &&
    !driverProfile.vehiclePlateNumber && !driverProfile.verifiedAt;
  return (
    <>
      <SectionLabel label="Driver Details" />
      <View style={styles.card}>
        <InfoRow icon="🪪" label="License Number" value={driverProfile.licenseNumber ?? '—'} last={noExtras} />
        {driverProfile.licenseExpiry ? (
          <InfoRow icon="📅" label="License Expiry" value={new Date(driverProfile.licenseExpiry).toLocaleDateString()} />
        ) : null}
        {vehicle ? <InfoRow icon="🚐" label="Vehicle" value={vehicle} /> : null}
        {driverProfile.vehiclePlateNumber ? (
          <InfoRow icon="🔖" label="Plate Number" value={driverProfile.vehiclePlateNumber} />
        ) : null}
        {driverProfile.verifiedAt ? (
          <InfoRow icon="✅" label="Verified On" value={new Date(driverProfile.verifiedAt).toLocaleDateString()} last />
        ) : null}
      </View>
    </>
  );
}

// ── Supplier info card ────────────────────────────────────────────────────

interface SupplierProfileData {
  supplierType?: string;
  organizationName?: string;
  status?: string;
  rating?: number | null;
  totalWasteSupplied?: number | null;
  pointsBalance?: number | null;
}

function SupplierInfoCard({ profile }: Readonly<{ profile: SupplierProfileData | undefined }>) {
  if (!profile) return null;
  const typeLabel = profile.supplierType === 'COMPANY' ? '🏢 Company' : '🌾 Farmer';
  const orgLabel = profile.supplierType === 'COMPANY' ? 'Company Name' : 'Farm Name';
  return (
    <>
      <SectionLabel label="Supplier Information" />
      <View style={styles.card}>
        <InfoRow icon="🏷️" label="Type" value={typeLabel} />
        {profile.organizationName ? (
          <InfoRow icon="🏢" label={orgLabel} value={profile.organizationName} />
        ) : null}
        {profile.status ? <InfoRow icon="📊" label="Status" value={profile.status} /> : null}
        {profile.rating == null ? null : (
          <InfoRow icon="⭐" label="Rating" value={`${profile.rating.toFixed(1)} ★`} />
        )}
        {(profile.pointsBalance ?? 0) > 0 ? (
          <InfoRow icon="🏆" label="Points Balance" value={`${(profile.pointsBalance ?? 0).toLocaleString()} pts`} last />
        ) : null}
      </View>
    </>
  );
}

// ── Security card ─────────────────────────────────────────────────────────

interface SecurityCardProps {
  pwdForm: { currentPassword: string; newPassword: string; confirmPassword: string };
  onPwdChange: (key: string) => (val: string) => void;
  showSection: boolean;
  onToggle: () => void;
  onSubmit: () => void;
  loading: boolean;
}

function SecurityCard({
  pwdForm, onPwdChange, showSection, onToggle, onSubmit, loading,
}: Readonly<SecurityCardProps>) {
  return (
    <View style={styles.card}>
      <SettingsRow icon="🔒" label="Change Password" onPress={onToggle} last={!showSection} />
      {showSection ? (
        <View style={styles.pwdForm}>
          <Text style={styles.editLabel}>Current Password</Text>
          <TextInput
            style={styles.editInput}
            secureTextEntry
            value={pwdForm.currentPassword}
            onChangeText={onPwdChange('currentPassword')}
            placeholder="••••••••"
            placeholderTextColor={TEXT_MUTED}
          />
          <Text style={styles.editLabel}>New Password</Text>
          <TextInput
            style={styles.editInput}
            secureTextEntry
            value={pwdForm.newPassword}
            onChangeText={onPwdChange('newPassword')}
            placeholder="Min. 8 characters"
            placeholderTextColor={TEXT_MUTED}
          />
          <Text style={styles.editLabel}>Confirm New Password</Text>
          <TextInput
            style={styles.editInput}
            secureTextEntry
            value={pwdForm.confirmPassword}
            onChangeText={onPwdChange('confirmPassword')}
            placeholder="Repeat new password"
            placeholderTextColor={TEXT_MUTED}
          />
          <TouchableOpacity style={styles.saveBtn} onPress={onSubmit} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.saveBtnText}>Update Password</Text>}
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { user, logout, updateUser } = useAuth();
  const navigation = useNavigation<any>();
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [avgTiming, setAvgTiming] = useState<AvgTiming | null>(null);

  const [phoneCountry, setPhoneCountry] = useState<CountryCode>(DEFAULT_COUNTRY);
  const [phoneLocal, setPhoneLocal] = useState('');
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [showPwdSection, setShowPwdSection] = useState(false);

  const filteredCountries = countrySearch.trim()
    ? COUNTRY_CODES.filter(
        (c) =>
          c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
          c.dial.includes(countrySearch),
      )
    : COUNTRY_CODES;

  const [form, setForm] = useState({ fullName: '', location: '' });
  const [pwdForm, setPwdForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (user) {
      setForm({ fullName: user.fullName ?? '', location: user.location ?? '' });
      const stored = user.phoneNumber ?? '';
      if (stored) {
        const parsed = parseStoredPhone(stored);
        setPhoneCountry(parsed.country);
        setPhoneLocal(parsed.local);
      }
    }
    if (user?.role === 'DRIVER') {
      driverAPI.getProfile().then(res => setDriverProfile(res.data ?? null)).catch(() => {});
      loadTimingData().then(t => { if (t) setAvgTiming(t); }).catch(() => {});
    }
  }, [user]);

  const set = (key: string) => (val: string) => setForm(prev => ({ ...prev, [key]: val }));
  const setPwd = (key: string) => (val: string) => setPwdForm(prev => ({ ...prev, [key]: val }));

  const saveProfile = async () => {
    setSaving(true);
    try {
      const phoneNumber = phoneLocal.trim() ? phoneCountry.dial + phoneLocal.trim() : '';
      await usersAPI.updateProfile({ fullName: form.fullName, phoneNumber, location: form.location });
      setEditMode(false);
      Alert.alert('Success', 'Profile updated!');
    } catch {
      Alert.alert('Error', 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    const validationError = validatePasswordChange(pwdForm.newPassword, pwdForm.confirmPassword);
    if (validationError) { Alert.alert('Error', validationError); return; }
    setChangingPwd(true);
    try {
      await usersAPI.changePassword(pwdForm.currentPassword, pwdForm.newPassword);
      setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPwdSection(false);
      Alert.alert('Success', 'Password changed!');
    } catch {
      Alert.alert('Error', 'Failed to change password. Check your current password.');
    } finally {
      setChangingPwd(false);
    }
  };

  const [avatarUploading, setAvatarUploading] = useState(false);

  const handleAvatarPress = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.5, includeBase64: true }, async (response) => {
      if (response.didCancel || response.errorCode) return;
      const asset = response.assets?.[0];
      if (!asset?.base64) return;
      const mimeType = 'image/jpeg';
      setAvatarUploading(true);
      try {
        const result = await usersAPI.uploadProfilePicture(
          asset.base64,
          mimeType,
        );
        if (result.success && result.data) {
          await updateUser({ profileImage: (result.data as { profileImage?: string }).profileImage ?? undefined });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        Alert.alert('Upload failed', msg);
      } finally {
        setAvatarUploading(false);
      }
    });
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const initials = (user?.fullName ?? 'U')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const isDriver = user?.role === 'DRIVER' && driverProfile != null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={GREEN} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Hero */}
        <View style={styles.hero}>
          <TouchableOpacity style={styles.avatarWrap} onPress={handleAvatarPress} disabled={avatarUploading}>
            {user?.profileImage ? (
              <Image
                source={{ uri: `http://192.168.1.176:3000${user.profileImage}` }}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.avatarText}>{initials}</Text>
            )}
            {avatarUploading ? (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator color="#FFF" />
              </View>
            ) : (
              <View style={styles.avatarCamera}>
                <Text style={styles.avatarCameraIcon}>📷</Text>
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.heroName}>{user?.fullName ?? '—'}</Text>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>{ROLE_LABELS[user?.role ?? ''] ?? user?.role}</Text>
          </View>
          <Text style={styles.heroEmail}>{user?.email}</Text>
        </View>

        {/* Driver stats */}
        {isDriver ? <DriverStatsSection driverProfile={driverProfile} avgTiming={avgTiming} /> : null}

        {/* Supplier stats */}
        {user?.role === 'SUPPLIER' ? <SupplierStatsSection profile={user.supplierProfile} /> : null}

        {/* Personal info */}
        <SectionLabel label="Personal Information" />
        <View style={styles.card}>
          {editMode ? (
            <View style={styles.editForm}>
              <Text style={styles.editLabel}>Full Name</Text>
              <TextInput
                style={styles.editInput}
                value={form.fullName}
                onChangeText={set('fullName')}
                placeholder="Your full name"
                placeholderTextColor={TEXT_MUTED}
              />
              <Text style={styles.editLabel}>Phone Number</Text>
              <TouchableOpacity
                style={styles.countrySelector}
                onPress={() => setCountryPickerOpen(true)}
                activeOpacity={0.7}>
                <Text style={styles.countrySelectorText}>
                  {phoneCountry.flag}  {phoneCountry.name}  ·  {phoneCountry.dial}
                </Text>
                <Text style={styles.chevronDark}>▾</Text>
              </TouchableOpacity>
              <TextInput
                style={[styles.editInput, { marginTop: 8 }]}
                value={phoneLocal}
                onChangeText={(t) => setPhoneLocal(t.replaceAll(/\D/g, ''))}
                keyboardType="number-pad"
                placeholder="000 000 0000"
                placeholderTextColor={TEXT_MUTED}
              />
              <Text style={styles.editLabel}>Location</Text>
              <TextInput
                style={styles.editInput}
                value={form.location}
                onChangeText={set('location')}
                placeholder="e.g. Accra, Ghana"
                placeholderTextColor={TEXT_MUTED}
              />
              <Text style={styles.editLabel}>Email Address</Text>
              <Text style={styles.editReadOnly}>{user?.email ?? '—'}</Text>
              <View style={styles.editActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditMode(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={saveProfile} disabled={saving}>
                  {saving
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.saveBtnText}>Save Changes</Text>}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <InfoRow icon="👤" label="Full Name" value={user?.fullName ?? '—'} />
              <InfoRow icon="📞" label="Phone" value={user?.phoneNumber ?? '—'} />
              <InfoRow icon="📍" label="Location" value={user?.location ?? '—'} />
              <InfoRow icon="✉️" label="Email" value={user?.email ?? '—'} last />
              <TouchableOpacity style={styles.editProfileBtn} onPress={() => setEditMode(true)}>
                <Text style={styles.editProfileBtnText}>Edit Profile</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Driver details */}
        {isDriver ? <DriverDetailsCard driverProfile={driverProfile} /> : null}

        {/* Supplier info */}
        {user?.role === 'SUPPLIER' ? <SupplierInfoCard profile={user.supplierProfile} /> : null}

        {/* Security */}
        <SectionLabel label="Security" />
        <SecurityCard
          pwdForm={pwdForm}
          onPwdChange={setPwd}
          showSection={showPwdSection}
          onToggle={() => setShowPwdSection(v => !v)}
          onSubmit={changePassword}
          loading={changingPwd}
        />

        {/* About */}
        <SectionLabel label="About" />
        <View style={styles.card}>
          <SettingsRow icon="📱" label="Version" value="1.0.0" />
          <SettingsRow icon="🌿" label="BioDigital BSF Farm" last />
        </View>

        {/* Support */}
        <SectionLabel label="Support" />
        <View style={styles.card}>
          <SettingsRow
            icon="🆘"
            label="Report an Issue"
            onPress={() => navigation.navigate('ReportIssue')}
            last
          />
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Country picker modal */}
      <Modal
        visible={countryPickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setCountryPickerOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country</Text>
              <TouchableOpacity onPress={() => { setCountryPickerOpen(false); setCountrySearch(''); }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Search country or code…"
              placeholderTextColor={TEXT_MUTED}
              value={countrySearch}
              onChangeText={setCountrySearch}
              autoCapitalize="none"
            />
            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.code}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.countryItem,
                    item.code === phoneCountry.code && styles.countryItemActive,
                  ]}
                  onPress={() => {
                    setPhoneCountry(item);
                    setCountryPickerOpen(false);
                    setCountrySearch('');
                  }}>
                  <Text style={styles.countryItemText}>{item.flag}  {item.name}</Text>
                  <Text style={styles.countryDial}>{item.dial}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  scrollContent: { paddingBottom: 20 },

  // Hero
  hero: {
    backgroundColor: GREEN,
    alignItems: 'center',
    paddingTop: 52,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  avatarWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 32, fontWeight: '800', color: '#FFF' },
  avatarImage: { width: 84, height: 84, borderRadius: 42 },
  avatarOverlay: {
    position: 'absolute', top: 0, left: 0, width: 84, height: 84,
    borderRadius: 42, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center',
  },
  avatarCamera: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: GREEN, borderRadius: 12, padding: 3,
  },
  avatarCameraIcon: { fontSize: 12 },
  heroName: { fontSize: 22, fontWeight: '800', color: '#FFF', marginBottom: 6 },
  heroBadge: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 8,
  },
  heroBadgeText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.9)' },
  heroEmail: { fontSize: 13, color: 'rgba(255,255,255,0.6)' },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 16,
    marginTop: -20,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: CARD,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  statCardDark: { backgroundColor: GREEN, borderColor: GREEN },
  statValue: { fontSize: 24, fontWeight: '800', color: TEXT_PRIMARY },
  statValueLight: { color: '#FFF' },
  statLabel: { fontSize: 11, color: TEXT_MUTED, fontWeight: '500' },
  statLabelLight: { color: 'rgba(255,255,255,0.7)' },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusPillText: { fontSize: 11, fontWeight: '700' },

  // Timing
  timingCard: {
    backgroundColor: CARD,
    borderRadius: 18,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  timingCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: TEXT_MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  timingRow: { flexDirection: 'row' },
  timingCell: { flex: 1, alignItems: 'center', gap: 3 },
  timingCellBorder: { borderRightWidth: 1, borderRightColor: BORDER },
  timingIcon: { fontSize: 18 },
  timingValue: { fontSize: 20, fontWeight: '800', color: GREEN },
  timingLabel: { fontSize: 11, color: TEXT_MUTED },

  // Section label
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: TEXT_MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 8,
  },

  // Card
  card: {
    backgroundColor: CARD,
    borderRadius: 18,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },

  // Info row
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  infoRowLast: { borderBottomWidth: 0 },
  infoRowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F0F7F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoRowIconText: { fontSize: 16 },
  infoRowContent: { flex: 1 },
  infoRowLabel: { fontSize: 11, color: TEXT_MUTED, fontWeight: '500', marginBottom: 2 },
  infoRowValue: { fontSize: 15, fontWeight: '600', color: TEXT_PRIMARY },

  // Edit profile button
  editProfileBtn: {
    marginHorizontal: 16,
    marginVertical: 14,
    backgroundColor: '#F0F7F0',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  editProfileBtnText: { fontSize: 14, fontWeight: '700', color: '#2E7D32' },

  // Edit form
  editForm: { padding: 16 },
  editLabel: { fontSize: 12, fontWeight: '600', color: TEXT_MUTED, marginBottom: 6, marginTop: 14 },
  editInput: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: TEXT_PRIMARY,
    backgroundColor: BG,
  },
  editReadOnly: { fontSize: 15, color: TEXT_MUTED, paddingVertical: 4 },
  editActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: TEXT_SECONDARY },
  saveBtn: {
    flex: 1,
    backgroundColor: GREEN,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },

  // Country picker
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: BG,
  },
  countrySelectorText: { fontSize: 14, color: TEXT_PRIMARY, flex: 1 },
  chevronDark: { color: TEXT_MUTED, fontSize: 14, marginLeft: 4 },

  // Settings row
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  settingsRowLast: { borderBottomWidth: 0 },
  settingsRowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F0F7F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingsRowIconDanger: { backgroundColor: '#FFEBEE' },
  settingsRowIconText: { fontSize: 16 },
  settingsRowLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: TEXT_PRIMARY },
  settingsRowLabelDanger: { color: '#C62828' },
  settingsRowValue: { fontSize: 13, color: TEXT_MUTED, marginRight: 6 },
  chevron: { fontSize: 20, color: TEXT_MUTED, marginLeft: 4 },

  // Password form
  pwdForm: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },

  // Logout
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 24,
    backgroundColor: '#FFEBEE',
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  logoutIcon: { fontSize: 18 },
  logoutText: { fontSize: 16, fontWeight: '700', color: '#C62828' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: CARD,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '75%',
    paddingBottom: 32,
  },
  modalHandle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: BORDER,
    marginTop: 10,
    marginBottom: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: TEXT_PRIMARY },
  modalClose: { fontSize: 18, color: TEXT_MUTED, padding: 4 },
  searchInput: {
    margin: 16,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: TEXT_PRIMARY,
    backgroundColor: BG,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  countryItemActive: { backgroundColor: '#F0F9F0' },
  countryItemText: { fontSize: 15, color: TEXT_PRIMARY, flex: 1 },
  countryDial: { fontSize: 14, color: TEXT_MUTED },
});
