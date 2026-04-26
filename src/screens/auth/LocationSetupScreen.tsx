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
  PermissionsAndroid,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { useAuth } from '../../store/authStore';
import { Colors, Spacing, Radius, Typography, Shadow } from '../../utils/theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';

type Props = NativeStackScreenProps<AuthStackParamList, 'LocationSetup'>;

export default function LocationSetupScreen({ navigation: _navigation }: Props) {
  const { completeLocation, isLoading, error, clearError } = useAuth();

  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [landmark, setLandmark] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState<number | undefined>(undefined);
  const [lng, setLng] = useState<number | undefined>(undefined);
  const [gpsLoading, setGpsLoading] = useState(false);

  const captureGPS = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'BioDigital needs your location for pickup scheduling.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Deny',
            buttonPositive: 'Allow',
          },
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permission denied', 'Please enter your location manually.');
          return;
        }
      }

      setGpsLoading(true);
      Geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude);
          setLng(pos.coords.longitude);
          setGpsLoading(false);
          Alert.alert('Location captured', `GPS coordinates saved.\nLat: ${pos.coords.latitude.toFixed(5)}, Lng: ${pos.coords.longitude.toFixed(5)}`);
        },
        (err) => {
          setGpsLoading(false);
          Alert.alert('GPS unavailable', `${err.message}\nPlease enter your location manually or try again.`);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
      );
    } catch {
      setGpsLoading(false);
      Alert.alert('GPS unavailable', 'Please enter your location manually.');
    }
  };

  const handleSubmit = async () => {
    if (!country.trim() || !city.trim() || !address.trim()) {
      Alert.alert('Missing fields', 'Country, city, and address are required.');
      return;
    }
    try {
      await completeLocation({
        country: country.trim(),
        city: city.trim(),
        address: address.trim(),
        landmark: landmark.trim() || undefined,
        lat,
        lng,
      });
      // RootNavigator will automatically redirect to the correct role navigator
      // because user.onboardingStep is now 'COMPLETE'
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
          <Text style={styles.icon}>📍</Text>
        </View>

        <Text style={styles.title}>Set Your Location</Text>
        <Text style={styles.subtitle}>
          This helps us schedule pickups and deliveries efficiently.
        </Text>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={clearError}>
              <Text style={styles.errorDismiss}>✕</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* GPS capture */}
        <TouchableOpacity
          style={[styles.gpsBtn, (gpsLoading || isLoading) && styles.btnDisabled]}
          onPress={captureGPS}
          disabled={gpsLoading || isLoading}>
          {gpsLoading ? (
            <ActivityIndicator color={Colors.primary} size="small" />
          ) : (
            <Text style={styles.gpsBtnIcon}>📡</Text>
          )}
          <Text style={styles.gpsBtnText}>
            {lat && lng ? '✓ GPS Captured — Re-capture' : 'Auto-Capture GPS Location'}
          </Text>
        </TouchableOpacity>

        {lat && lng ? (
          <View style={styles.gpsTag}>
            <Text style={styles.gpsTagText}>
              📌 {lat.toFixed(5)}, {lng.toFixed(5)}
            </Text>
          </View>
        ) : null}

        <Text style={styles.orDivider}>— or enter manually —</Text>

        <View style={styles.card}>
          <Field
            label="Country *"
            value={country}
            onChange={setCountry}
            placeholder="e.g. Ghana"
          />
          <Field
            label="City / Town *"
            value={city}
            onChange={setCity}
            placeholder="e.g. Accra"
          />
          <Field
            label="Address / Street *"
            value={address}
            onChange={setAddress}
            placeholder="e.g. 12 Independence Ave"
          />
          <Field
            label="Landmark (optional)"
            value={landmark}
            onChange={setLandmark}
            placeholder="e.g. Near Kotoka Airport"
          />

          <TouchableOpacity
            style={[styles.primaryBtn, isLoading && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Save Location & Finish</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.stepsRow}>
          <View style={[styles.step, styles.stepDone]} />
          <View style={[styles.step, styles.stepDone]} />
          <View style={[styles.step, styles.stepActive]} />
        </View>
        <Text style={styles.stepsLabel}>Step 3 of 3 — Location Setup</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label, value, onChange, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={Colors.textLight}
        value={value}
        onChangeText={onChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1, padding: Spacing.lg, alignItems: 'center' },

  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryLight + '22',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  icon: { fontSize: 36 },

  title: { ...Typography.h2, color: Colors.textPrimary, textAlign: 'center', marginBottom: Spacing.sm },
  subtitle: {
    ...Typography.body1,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
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

  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm + 4,
    paddingHorizontal: Spacing.lg,
    width: '100%',
    backgroundColor: Colors.surface,
    marginBottom: Spacing.sm,
  },
  gpsBtnIcon: { fontSize: 18 },
  gpsBtnText: { color: Colors.primary, fontWeight: '600', fontSize: 15 },

  gpsTag: {
    backgroundColor: Colors.successLight,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  gpsTagText: { color: Colors.success, fontSize: 13, fontWeight: '500' },

  orDivider: {
    color: Colors.textLight,
    fontSize: 13,
    marginVertical: Spacing.md,
  },

  card: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    ...Shadow.md,
    marginBottom: Spacing.xl,
  },

  fieldGroup: { marginBottom: Spacing.md },
  label: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: Spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    fontSize: 15,
    color: Colors.textPrimary,
    backgroundColor: Colors.surfaceAlt,
  },

  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  stepsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xs },
  step: { width: 32, height: 4, borderRadius: 2, backgroundColor: Colors.border },
  stepDone: { backgroundColor: Colors.primaryLight },
  stepActive: { backgroundColor: Colors.primary },
  stepsLabel: { fontSize: 12, color: Colors.textLight, marginBottom: Spacing.xl },
});
