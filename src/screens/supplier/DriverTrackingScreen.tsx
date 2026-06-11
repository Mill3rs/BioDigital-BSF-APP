import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  StatusBar,
  Dimensions,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SupplierStackParamList } from '../../navigation/SupplierNavigator';
import { driverAPI } from '../../api/driver';
import { Colors, Spacing, Radius, Shadow } from '../../utils/theme';

type Props = NativeStackScreenProps<SupplierStackParamList, 'DriverTracking'>;

interface Coords {
  latitude: number;
  longitude: number;
}

const POLL_INTERVAL_MS = 5000;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Uber-style minimal map style
const MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.arterial', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#dadada' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9c9c9' }] },
];

export default function DriverTrackingScreen({ route, navigation }: Readonly<Props>) {
  const { wasteId, supplierCoords, supplierAddress, driverName: initialDriverName } = route.params;

  const [driverCoords, setDriverCoords] = useState<Coords | null>(null);
  const [driverName, setDriverName] = useState(initialDriverName ?? 'Driver');
  const [loading, setLoading] = useState(true);
  const [noDriver, setNoDriver] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const mapRef = useRef<MapView>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchLocation() {
    try {
      const res = await driverAPI.getDriverLocation(wasteId);
      if (!res.data) {
        setNoDriver(true);
        return;
      }
      const loc = res.data.location;
      if (loc) {
        const coords = { latitude: loc.lat, longitude: loc.lng };
        setDriverCoords(coords);
        setLastUpdated(new Date());
        if (res.data.driverName) setDriverName(res.data.driverName);
        // Fit map to show both driver and supplier pickup
        if (mapRef.current && supplierCoords) {
          mapRef.current.fitToCoordinates([coords, supplierCoords], {
            edgePadding: { top: 80, right: 60, bottom: 200, left: 60 },
            animated: true,
          });
        }
      } else {
        setNoDriver(true);
      }
    } catch {
      // Network error — keep showing last known position
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLocation();
    intervalRef.current = setInterval(fetchLocation, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wasteId]);

  const anchorCoords = driverCoords ?? supplierCoords;
  const initialRegion = anchorCoords
    ? { latitude: anchorCoords.latitude, longitude: anchorCoords.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 }
    : undefined;

  function formatUpdated(date: Date) {
    const secs = Math.floor((Date.now() - date.getTime()) / 1000);
    if (secs < 10) return 'just now';
    if (secs < 60) return `${secs}s ago`;
    return `${Math.floor(secs / 60)}m ago`;
  }

  function renderDriverSubText() {
    if (!driverCoords) return 'Driver location unavailable';
    const updated = lastUpdated ? formatUpdated(lastUpdated) : '—';
    return `Live location · updated ${updated}`;
  }

  function renderMapSection() {
    if (loading && !driverCoords) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Locating driver…</Text>
        </View>
      );
    }
    if (noDriver && !driverCoords) {
      return (
        <View style={styles.centered}>
          <Text style={styles.noDriverIcon}>🚗</Text>
          <Text style={styles.noDriverTitle}>Driver not yet assigned</Text>
          <Text style={styles.noDriverSub}>Check back once a driver has been dispatched for your pickup.</Text>
        </View>
      );
    }
    return (
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        customMapStyle={MAP_STYLE}
        initialRegion={initialRegion}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        showsTraffic={false}>
        {driverCoords ? (
          <Marker coordinate={driverCoords} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
            <View style={styles.carMarker}>
              <Text style={styles.carMarkerIcon}>🚗</Text>
            </View>
          </Marker>
        ) : null}
        {supplierCoords ? (
          <Marker coordinate={supplierCoords} anchor={{ x: 0.5, y: 1 }} tracksViewChanges={false}>
            <View style={styles.pickupMarkerWrap}>
              <View style={styles.pickupMarkerBubble}>
                <Text style={styles.pickupMarkerIcon}>📍</Text>
              </View>
              <View style={styles.pickupMarkerTail} />
            </View>
          </Marker>
        ) : null}
      </MapView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      {renderMapSection()}

      {/* Back button */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
        <Text style={styles.backBtnText}>‹</Text>
      </TouchableOpacity>

      {/* Info card */}
      {(driverCoords || noDriver) ? (
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={styles.driverAvatar}>
              <Text style={styles.driverAvatarText}>{driverName.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.driverInfo}>
              <Text style={styles.driverNameText}>{driverName}</Text>
              <Text style={styles.driverSubText}>{renderDriverSubText()}</Text>
            </View>
            <View style={[styles.liveIndicator, !driverCoords && styles.liveIndicatorOff]}>
              <Text style={styles.liveText}>{driverCoords ? 'LIVE' : 'OFF'}</Text>
            </View>
          </View>

          {supplierAddress ? (
            <View style={styles.addressRow}>
              <Text style={styles.addressIcon}>📍</Text>
              <Text style={styles.addressText} numberOfLines={2}>{supplierAddress}</Text>
            </View>
          ) : null}

          <Text style={styles.refreshNote}>Location refreshes every 5 seconds</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  map: { flex: 1 },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  loadingText: { fontSize: 15, color: Colors.textSecondary, marginTop: Spacing.sm },

  noDriverIcon: { fontSize: 48, marginBottom: Spacing.sm },
  noDriverTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  noDriverSub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20, marginTop: 4 },

  // Markers
  carMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#3b82f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  carMarkerIcon: { fontSize: 22 },

  pickupMarkerWrap: { alignItems: 'center' },
  pickupMarkerBubble: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  pickupMarkerIcon: { fontSize: 22 },
  pickupMarkerTail: {
    width: 3,
    height: 10,
    backgroundColor: Colors.primary,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
    marginTop: -1,
  },

  // Back button
  backBtn: {
    position: 'absolute',
    top: 52,
    left: 16,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.md,
  },
  backBtnText: { fontSize: 28, color: Colors.textPrimary, lineHeight: 32, marginTop: -2 },

  // Info card
  card: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: 36,
    ...Shadow.lg,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverAvatarText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  driverInfo: { flex: 1 },
  driverNameText: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  driverSubText: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  liveIndicator: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  liveIndicatorOff: { backgroundColor: '#f3f4f6' },
  liveText: { fontSize: 11, fontWeight: '700', color: Colors.success },

  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  addressIcon: { fontSize: 14, marginTop: 1 },
  addressText: { flex: 1, fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },

  refreshNote: {
    fontSize: 11,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: 4,
  },
});
