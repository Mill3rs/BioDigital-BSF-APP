import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
  PermissionsAndroid,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { driverAPI } from '../../api/driver';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { DriverStackParamList } from '../../navigation/DriverNavigator';
import { Colors, Spacing, Radius, Shadow } from '../../utils/theme';
import { GOOGLE_MAPS_API_KEY } from '../../utils/keys';
import type { WasteRecord } from '../../types';

type Props = NativeStackScreenProps<DriverStackParamList, 'WastePickupMap'>;
type TripPhase = 'idle' | 'going' | 'returning' | 'done';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_PEEK = 300; // resting height of bottom sheet

// ─── Uber-style map customisation ────────────────────────────────────────────
const MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#ffffff' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#e0e0e0' }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'geometry',
    stylers: [{ color: '#ffffff' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#d0e8d0' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#b2d8b2' }],
  },
  {
    featureType: 'road.local',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9e9e9e' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#c9e8fb' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9e9e9e' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#e5f5e5' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text',
    stylers: [{ visibility: 'off' }],
  },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  {
    featureType: 'administrative',
    elementType: 'geometry',
    stylers: [{ visibility: 'off' }],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
interface Coords { latitude: number; longitude: number }

function resolveCoords(item: WasteRecord): Coords | null {
  // 1. Supplier's stored collection address (most authoritative)
  const supplierAddr = (item as any).supplier?.supplierProfile?.collectionAddress;
  if (supplierAddr?.lat && supplierAddr?.lng) {
    return { latitude: supplierAddr.lat, longitude: supplierAddr.lng };
  }
  // 2. Waste record's own location field (stored by SubmitWasteScreen)
  const loc = item.location;
  if (loc?.lat && loc?.lng) {
    return { latitude: loc.lat, longitude: loc.lng };
  }
  // 3. Legacy collectionAddress alias
  const cAddr = item.collectionAddress;
  if (cAddr?.lat && cAddr?.lng) {
    return { latitude: cAddr.lat, longitude: cAddr.lng };
  }
  return null;
}

function buildAddressText(item: WasteRecord): string {
  const addr =
    (item as any).supplier?.supplierProfile?.collectionAddress ??
    item.location ??
    item.collectionAddress;
  const parts = [addr?.address, addr?.city, addr?.country].filter(Boolean);
  if (parts.length > 0) return parts.join(', ');
  // Fall back to manually entered source name if no structured address
  if (item.sourceName) return item.sourceName;
  return 'Unknown address';
}

/** Build an ordered list of geocoding query candidates (best → broadest fallback) */
function buildGeocodingCandidates(item: WasteRecord): string[] {
  const supplierAddr = (item as any).supplier?.supplierProfile?.collectionAddress;
  const loc = item.location;
  const legacyAddr = item.collectionAddress;
  // Merge whichever address objects are available, supplier first
  const addr = supplierAddr ?? loc ?? legacyAddr;
  const candidates: string[] = [];
  // 1. Full structured address
  const full = [addr?.address, addr?.city, addr?.country].filter(Boolean).join(', ');
  if (full) candidates.push(full);
  // 2. City + country only
  const cityCountry = [addr?.city, addr?.country].filter(Boolean).join(', ');
  if (cityCountry && cityCountry !== full) candidates.push(cityCountry);
  // 3. Source name as-entered by the user (may contain a place name)
  if (item.sourceName?.trim()) candidates.push(item.sourceName.trim());
  // 4. Notes field may contain location info
  if (item.notes?.trim()) candidates.push(item.notes.trim());
  return [...new Set(candidates)]; // deduplicate
}

/** Resolve the processing plant / farm coordinates */
function resolvePlantCoords(item: WasteRecord): Coords | null {
  const loc = item.farm?.location;
  if (loc?.lat && loc?.lng) return { latitude: loc.lat, longitude: loc.lng };
  return null;
}

/** Human-readable plant name */
function buildPlantName(item: WasteRecord): string {
  return item.farm?.name ?? 'Processing Center';
}

/** Human-readable plant address */
function buildPlantAddress(item: WasteRecord): string {
  const loc = item.farm?.location;
  const parts = [loc?.address, item.farm?.city, item.farm?.country].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : 'Waste processing center';
}

/** Format elapsed seconds as `5m 30s` or `1h 23m` */
function formatDuration(totalSecs: number): string {
  if (totalSecs < 60) return `${totalSecs}s`;
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

function toRad(deg: number) { return deg * (Math.PI / 180); }

function haversineKm(a: Coords, b: Coords): number {
  const R = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const c =
    2 *
    Math.asin(
      Math.sqrt(
        sinLat * sinLat +
          Math.cos(toRad(a.latitude)) *
            Math.cos(toRad(b.latitude)) *
            sinLon * sinLon,
      ),
    );
  return R * c;
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

function formatEta(km: number): string {
  const mins = Math.round((km / 30) * 60); // 30 km/h average urban speed
  if (mins < 1) return '< 1 min';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/** Decode a Google Maps encoded polyline string into lat/lng coords */
function decodePolyline(encoded: string): Coords[] {
  const coords: Coords[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = (encoded.codePointAt(index++) ?? 0) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0;
    result = 0;
    do {
      b = (encoded.codePointAt(index++) ?? 0) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    coords.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return coords;
}

/** Fetch a driving route from Google Directions API, returns decoded polyline */
async function fetchRoute(origin: Coords, destination: Coords): Promise<Coords[]> {
  const url =
    `https://maps.googleapis.com/maps/api/directions/json` +
    `?origin=${origin.latitude},${origin.longitude}` +
    `&destination=${destination.latitude},${destination.longitude}` +
    `&mode=driving` +
    `&key=${GOOGLE_MAPS_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  const poly = data?.routes?.[0]?.overview_polyline?.points;
  if (!poly) return [];
  return decodePolyline(poly);
}

function openNavigationApp(coords: Coords | null, addressText: string, label?: string) {
  // Always prefer lat/lng for precision; fall back to text only if coords unavailable
  if (coords) {
    const { latitude: lat, longitude: lng } = coords;
    const url = Platform.select({
      ios: `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`,
      android: `google.navigation:q=${lat},${lng}&mode=d`,
    });
    const webUrl = 'https://www.google.com/maps/dir/?api=1&destination=' + lat + ',' + lng + '&travelmode=driving';
    if (url) {
      Linking.canOpenURL(url).then(supported => {
        Linking.openURL(supported ? url : webUrl);
      });
    } else {
      Linking.openURL(webUrl);
    }
  } else if (addressText && addressText !== 'Waste processing center') {
    Linking.openURL(
      'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(addressText) + '&travelmode=driving',
    );
  } else {
    const query = label ?? addressText;
    Linking.openURL(
      'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(query),
    );
  }
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function WastePickupMapScreen({ route, navigation }: Readonly<Props>) {
  const { item } = route.params;
  const pickupCoords = resolveCoords(item);
  const addressText = buildAddressText(item);

  const [driverCoords, setDriverCoords] = useState<Coords | null>(null);
  const [locationError, setLocationError] = useState(false);
  const [gpsReady, setGpsReady] = useState(false); // true once GPS resolves (success OR fail)
  const [geocoding, setGeocoding] = useState(!pickupCoords);
  const [resolvedCoords, setResolvedCoords] = useState<Coords | null>(pickupCoords);
  const [routeCoords, setRouteCoords] = useState<Coords[]>([]);
  const [mapReady, setMapReady] = useState(false);

  // ── Trip state ──────────────────────────────────────────────────────────
  const [tripPhase, setTripPhase] = useState<TripPhase>('idle');
  const [tripStart, setTripStart] = useState<Date | null>(null);
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const [plantCoords, setPlantCoords] = useState<Coords | null>(resolvePlantCoords(item));
  const [plantName, setPlantName] = useState<string>(buildPlantName(item));
  const [plantAddress, setPlantAddress] = useState<string>(buildPlantAddress(item));
  const [plantGeocoding, setPlantGeocoding] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // mirrors of elapsed/pickup for use inside callbacks without stale closures
  const elapsedRef = useRef(0);
  const pickupRef  = useRef(0);

  const mapRef = useRef<MapView>(null);
  const cardSlide = useRef(new Animated.Value(CARD_PEEK)).current;
  const watchId = useRef<number | null>(null);

  const supplierName = item.supplier?.fullName ?? item.sourceName ?? 'Supplier';
  const supplierPhone = item.supplier?.phoneNumber ?? null;
  const wasteLabel = item.sourceType.split('_').map(
    (w: string) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');

  // Active destination switches when returning to plant
  const targetCoords = tripPhase === 'returning' ? plantCoords : resolvedCoords;

  const distance =
    driverCoords && targetCoords
      ? haversineKm(driverCoords, targetCoords)
      : null;

  // ── Live driver location (request Android permission first) ─────────────
  useEffect(() => {
    async function startGPS() {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'BioDigital needs your location to navigate to the pickup point.',
            buttonPositive: 'Allow',
          },
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          setLocationError(true);
          setGpsReady(true);
          return;
        }
      }
      Geolocation.getCurrentPosition(
        pos => {
          setDriverCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
          setGpsReady(true);
        },
        () => {
          setLocationError(true);
          setGpsReady(true);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
      );
      watchId.current = Geolocation.watchPosition(
        pos => setDriverCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => {},
        { enableHighAccuracy: true, distanceFilter: 10 },
      );
    }
    startGPS();
    return () => {
      if (watchId.current != null) Geolocation.clearWatch(watchId.current);
    };
  }, []);

  // ── Geocode via Google Maps Geocoding API — tries candidates in order ─────
  useEffect(() => {
    if (pickupCoords) { setGeocoding(false); return; }
    const candidates = buildGeocodingCandidates(item);
    if (candidates.length === 0) { setGeocoding(false); return; }

    // Try each candidate sequentially, stop when one returns a result
    async function tryGeocoding() {
      for (const query of candidates) {
        try {
          const res = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}`,
          );
          const data = await res.json();
          const result = data?.results?.[0];
          if (result) {
            const { lat, lng } = result.geometry.location;
            setResolvedCoords({ latitude: lat, longitude: lng });
            return; // found — stop trying further candidates
          }
        } catch {
          // network error on this attempt — try next candidate
        }
      }
    }

    tryGeocoding().finally(() => setGeocoding(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Clear stale route when trip phase switches so the dashed fallback shows ─
  useEffect(() => {
    setRouteCoords([]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripPhase]);

  // ── Fetch driving route whenever driver position or target changes ────────
  useEffect(() => {
    if (!driverCoords || !targetCoords) { setRouteCoords([]); return; }
    fetchRoute(driverCoords, targetCoords)
      .then(path => { if (path.length > 0) setRouteCoords(path); })
      .catch(() => setRouteCoords([]));
  // targetCoords changes on phase switch (going → returning); driverCoords on first GPS fix.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetCoords, driverCoords]);

  // ── Trip timer ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (tripPhase === 'idle' || tripPhase === 'done') {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      return;
    }
    timerRef.current = setInterval(() => {
      if (tripStart) {
        const secs = Math.floor((Date.now() - tripStart.getTime()) / 1000);
        elapsedRef.current = secs;
        setElapsedSecs(secs);
      }
    }, 1000);
    return () => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    };
  }, [tripPhase, tripStart]);

  // ── Broadcast driver location to backend while trip is active ────────────
  const broadcastIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const driverCoordsRef = useRef<Coords | null>(null);

  function clearBroadcast() {
    if (broadcastIntervalRef.current) {
      clearInterval(broadcastIntervalRef.current);
      broadcastIntervalRef.current = null;
    }
  }

  // Keep ref in sync so interval callback always has latest coords
  useEffect(() => { driverCoordsRef.current = driverCoords; }, [driverCoords]);

  useEffect(() => {
    if (tripPhase === 'going' || tripPhase === 'returning') {
      broadcastIntervalRef.current = setInterval(() => {
        const coords = driverCoordsRef.current;
        if (coords) {
          driverAPI.updateLocation(coords.latitude, coords.longitude, item.id).catch(() => {});
        }
      }, 5000);
    } else {
      clearBroadcast();
    }
    return () => { clearBroadcast(); };
  }, [tripPhase, item.id]);

  // ── Load company (processing center) location on mount ───────────────────
  useEffect(() => {
    driverAPI.getCompanyLocation()
      .then(res => {
        const co = res.data;
        if (co?.lat && co?.lng) {
          const lat = co.lat;
          const lng = co.lng;
          setPlantCoords({ latitude: lat, longitude: lng });
          if (co.companyName) setPlantName(co.companyName);
          // Use address fields exactly as entered in Settings → Company → Processing Center Location
          const addrParts = [co.address, co.city, co.region, co.country].filter(Boolean);
          if (addrParts.length > 0) {
            setPlantAddress(addrParts.join(', '));
          } else {
            // No address text saved — reverse-geocode the coords for display
            fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`,
            )
              .then(r => r.json())
              .then((data: any) => {
                const addr = data?.results?.[0]?.formatted_address;
                if (addr) setPlantAddress(addr);
              })
              .catch(() => {});
          }
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Geocode plant address when returning (fallback if company has no coords) ─
  useEffect(() => {
    if (tripPhase !== 'returning' || plantCoords) return;
    const farm = item.farm;
    if (!farm) return;
    const query = [farm.location?.address, farm.city, farm.country].filter(Boolean).join(', ');
    if (!query) return;
    setPlantGeocoding(true);
    fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}`,
    )
      .then(r => r.json())
      .then((data: any) => {
        const result = data?.results?.[0];
        if (result) {
          const { lat, lng } = result.geometry.location;
          setPlantCoords({ latitude: lat, longitude: lng });
        }
      })
      .catch(() => {})
      .finally(() => setPlantGeocoding(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripPhase]);

  // ── Trip actions ──────────────────────────────────────────────────────────
  const startTrip = useCallback(() => {
    setTripStart(new Date());
    setElapsedSecs(0);
    setTripPhase('going');
  }, []);

  const confirmCollection = useCallback(() => {
    pickupRef.current = elapsedRef.current;
    setTripPhase('returning');
  }, []);

  const [delivering, setDelivering] = useState(false);

  const endTrip = useCallback(async () => {
    setDelivering(true);
    try {
      await driverAPI.markWasteDelivered(item.id);
    } catch {
      Alert.alert('Error', 'Could not update delivery status. Please try again.');
      setDelivering(false);
      return;
    }
    // Persist timing so WasteDetailScreen can display it
    try {
      await AsyncStorage.setItem(
        `waste_timing_${item.id}`,
        JSON.stringify({
          pickup:   pickupRef.current,
          delivery: elapsedRef.current - pickupRef.current,
        }),
      );
    } catch { /* ignore storage errors */ }
    setDelivering(false);
    setTripPhase('done');
  }, [item.id]);

  const abortTrip = useCallback(() => {
    setTripPhase('idle');
    setTripStart(null);
    setElapsedSecs(0);
  }, []);

  // ── Slide card in once map is ready ──────────────────────────────────────
  const onMapReady = () => {
    setMapReady(true);
    Animated.spring(cardSlide, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 6,
      speed: 12,
    }).start();
  };

  // ── Fit target + driver in view when target/driver changes ───────────────
  useEffect(() => {
    if (!mapRef.current || !targetCoords || !mapReady) return;
    const coords: Coords[] = [targetCoords];
    if (driverCoords) coords.push(driverCoords);
    mapRef.current.fitToCoordinates(coords, {
      edgePadding: { top: 100, right: 60, bottom: CARD_PEEK + 80, left: 60 },
      animated: true,
    });
  }, [targetCoords, driverCoords, mapReady]);

  // ── Recenter map ──────────────────────────────────────────────────────────
  const recenter = () => {
    if (!mapRef.current) return;
    const coords: Coords[] = [];
    if (driverCoords) coords.push(driverCoords);
    if (targetCoords) coords.push(targetCoords);
    if (coords.length === 0) return;
    mapRef.current.fitToCoordinates(coords, {
      edgePadding: { top: 100, right: 60, bottom: CARD_PEEK + 80, left: 60 },
      animated: true,
    });
  };

  // ── Initial region ────────────────────────────────────────────────────────
  const anchorCoords = targetCoords ?? driverCoords;
  let centerRegion: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number } | undefined;
  if (anchorCoords) {
    centerRegion = { latitude: anchorCoords.latitude, longitude: anchorCoords.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 };
  }

  function renderMapContent() {
    // Wait until both geocoding AND the first GPS attempt have settled
    // so we don't flash the error screen before GPS comes back.
    if (geocoding || !gpsReady) {
      return (
        <View style={styles.loadingScreen}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingTitle}>Locating pickup point</Text>
            <Text style={styles.loadingSubtitle}>{addressText}</Text>
          </View>
        </View>
      );
    }
    if (centerRegion) {
      return (
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          customMapStyle={MAP_STYLE}
          initialRegion={centerRegion}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={false}
          showsTraffic={false}
          showsBuildings={true}
          onMapReady={onMapReady}>
          {renderMapMarkers()}
        </MapView>
      );
    }
    return (
      <View style={styles.noMapWrap}>
        <View style={styles.noMapIconWrap}>
          <Text style={styles.noMapIcon}>🗺️</Text>
        </View>
        <Text style={styles.noMapText}>
          {locationError ? 'Location unavailable' : 'Could not determine pickup location'}
        </Text>
        <Text style={styles.noMapSub}>{addressText}</Text>
      </View>
    );
  }

  function renderMapMarkers() {
    const routeColor = tripPhase === 'returning' ? '#3b82f6' : Colors.primary;
    const isReturning = tripPhase === 'returning';
    const pickupDoneStyle = isReturning ? styles.pickupMarkerBubbleDone : undefined;
    const pickupTailColor = isReturning ? Colors.textSecondary : Colors.primary;
    return (
      <>
        {/* Route polyline — real driving directions from Directions API */}
        {(() => {
          if (routeCoords.length > 1) {
            return (
              <Polyline
                coordinates={routeCoords}
                strokeColor={routeColor}
                strokeWidth={5}
                lineJoin="round"
                lineCap="round"
              />
            );
          }
          if (driverCoords && targetCoords) {
            // Dashed fallback while route is being fetched
            return (
              <Polyline
                coordinates={[driverCoords, targetCoords]}
                strokeColor={routeColor}
                strokeWidth={3}
                lineDashPattern={[8, 6]}
                lineJoin="round"
                lineCap="round"
              />
            );
          }
          return null;
        })()}
        {/* Driver car marker */}
        {driverCoords ? (
          <Marker coordinate={driverCoords} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={true}>
            <View style={styles.carMarker}>
              <Text style={styles.carMarkerIcon}>🚗</Text>
            </View>
          </Marker>
        ) : null}
        {/* Pickup marker */}
        {resolvedCoords ? (
          <Marker coordinate={resolvedCoords} anchor={{ x: 0.5, y: 1 }} tracksViewChanges={false}>
            <View style={styles.pickupMarkerWrap}>
              <View style={[styles.pickupMarkerBubble, pickupDoneStyle]}>
                <Text style={styles.pickupMarkerIcon}>{isReturning ? '✓' : '♻️'}</Text>
              </View>
              <View style={[styles.pickupMarkerTail, { backgroundColor: pickupTailColor }]} />
            </View>
          </Marker>
        ) : null}
        {/* Plant / processing centre marker — always visible */}
        {plantCoords ? (
          <Marker coordinate={plantCoords} anchor={{ x: 0.5, y: 1 }} tracksViewChanges={false}>
            <View style={styles.pickupMarkerWrap}>
              <View style={[styles.pickupMarkerBubble, styles.plantMarkerBubble]}>
                <Text style={styles.pickupMarkerIcon}>🏭</Text>
              </View>
              <View style={[styles.pickupMarkerTail, { backgroundColor: '#3b82f6' }]} />
            </View>
          </Marker>
        ) : null}
      </>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      {/* ── FULL-SCREEN MAP ──────────────────────────────────── */}
      {renderMapContent()}

      {/* ── FLOATING: BACK BUTTON ─────────────────────────── */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
        <Text style={styles.backBtnText}>‹</Text>
      </TouchableOpacity>

      {/* ── FLOATING: RECENTER BUTTON ─────────────────────── */}
      <TouchableOpacity style={styles.recenterBtn} onPress={recenter} activeOpacity={0.85}>
        <Text style={styles.recenterIcon}>⊙</Text>
      </TouchableOpacity>

      {/* ── BOTTOM SHEET CARD ─────────────────────────────── */}
      <Animated.View style={[styles.card, { transform: [{ translateY: cardSlide }] }]}>
        {/* Drag handle */}
        <View style={styles.handle} />

        {renderCardContent()}
      </Animated.View>
    </View>
  );

  // ── Card content per trip phase ────────────────────────────────────────
  function renderCardContent() {
    if (tripPhase === 'done') return renderDoneSummary();
    if (tripPhase === 'going') return renderGoingCard();
    if (tripPhase === 'returning') return renderReturningCard();
    return renderIdleCard();
  }

  function renderIdleCard() {
    const etaText = distance ? formatEta(distance) : null;
    const accessNotes = item.notes ?? (item as any).accessInstructions ?? null;
    const contactName = item.supplier?.fullName ?? item.sourceName;
    const scheduledTime = item.date
      ? new Date(item.date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      : null;

    return (
      <>
        {/* Title row */}
        <View style={styles.sheetTitleRow}>
          <Text style={styles.sheetTitle} numberOfLines={1}>{supplierName}</Text>
          {etaText ? (
            <View style={styles.etaPill}>
              <Text style={styles.etaPillText}>{etaText}</Text>
            </View>
          ) : null}
        </View>

        {/* Address */}
        <View style={styles.addrRow}>
          <Text style={styles.addrIcon}>📍</Text>
          <Text style={styles.addrText} numberOfLines={2}>{addressText}</Text>
        </View>

        <View style={styles.sheetDivider} />

        {/* Waste info grid */}
        <View style={styles.infoGrid}>
          <View style={styles.infoGridCell}>
            <Text style={styles.infoGridLabel}>Waste Type</Text>
            <Text style={styles.infoGridValue}>♻️  {wasteLabel}</Text>
          </View>
          <View style={[styles.infoGridCell, styles.infoGridCellRight]}>
            <Text style={styles.infoGridLabel}>Est. Weight</Text>
            <Text style={styles.infoGridValue}>⚖️  {item.quantity} {item.unit}</Text>
          </View>
        </View>

        {/* Scheduled time */}
        {scheduledTime ? (
          <View style={styles.metaRow2}>
            <Text style={styles.metaIcon2}>⏰</Text>
            <Text style={styles.metaLabel2}>Scheduled:</Text>
            <Text style={styles.metaValue2}>{scheduledTime}</Text>
          </View>
        ) : null}

        {/* Contact */}
        <View style={styles.metaRow2}>
          <Text style={styles.metaIcon2}>👤</Text>
          <Text style={styles.metaValue2}>{contactName}</Text>
        </View>

        {/* Access instructions */}
        {accessNotes ? (
          <View style={styles.accessBox}>
            <Text style={styles.accessLabel}>Access Instructions</Text>
            <Text style={styles.accessText}>{accessNotes}</Text>
          </View>
        ) : null}

        {/* Navigation + call row */}
        <View style={styles.navRow}>
          <TouchableOpacity
            style={styles.sheetNavBtn}
            onPress={() => openNavigationApp(resolvedCoords, addressText)}
            activeOpacity={0.8}>
            <Text style={styles.sheetNavBtnText}>Start Navigation  ✈</Text>
          </TouchableOpacity>
          {supplierPhone ? (
            <TouchableOpacity
              style={styles.callCircleBtn}
              onPress={() => Linking.openURL(`tel:${supplierPhone}`)}>
              <Text style={styles.callCircleIcon}>📞</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Start trip */}
        <TouchableOpacity style={styles.startTripBtn} onPress={startTrip} activeOpacity={0.85}>
          <Text style={styles.startTripBtnText}>▶  Start Trip</Text>
        </TouchableOpacity>
      </>
    );
  }

  function renderGoingCard() {
    return (
      <>
        <View style={styles.tripBanner}>
          <View style={styles.tripDot} />
          <Text style={styles.tripBannerText}>On the way  ·  {formatDuration(elapsedSecs)}</Text>
          <TouchableOpacity
            style={styles.navInlinBtn}
            onPress={() => openNavigationApp(resolvedCoords, addressText)}
            activeOpacity={0.8}>
            <Text style={styles.navInlinBtnText}>🧭 Navigate</Text>
          </TouchableOpacity>
        </View>
        {distance === null ? null : (
          <View style={styles.distancePill}>
            <Text style={styles.distancePillText}>📍 {formatDistance(distance)}  ·  ETA {formatEta(distance)}</Text>
          </View>
        )}
        <View style={styles.divider} />
        {renderSupplierRow()}
        {renderChips()}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.cancelTripBtn} onPress={abortTrip}>
            <Text style={styles.cancelTripBtnText}>✕  Cancel Trip</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.arrivedBtn} onPress={confirmCollection}>
            <Text style={styles.arrivedBtnText}>✓  I've Arrived</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  function renderReturningCard() {
    const plantAddr = plantAddress;
    return (
      <>
        <View style={[styles.tripBanner, styles.tripBannerBlue]}>
          <View style={[styles.tripDot, styles.tripDotBlue]} />
          <Text style={styles.tripBannerText}>Returning  ·  {formatDuration(elapsedSecs)}</Text>
        </View>
        {plantGeocoding ? (
          <View style={styles.distancePill}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={[styles.distancePillText, { marginLeft: 8 }]}>Locating processing center…</Text>
          </View>
        ) : null}
        {!plantGeocoding && distance !== null ? (
          <View style={styles.distancePill}>
            <Text style={styles.distancePillText}>🏭 {formatDistance(distance)}  ·  ETA {formatEta(distance)}</Text>
          </View>
        ) : null}
        <View style={styles.divider} />
        <View style={styles.supplierRow}>
          <View style={[styles.supplierAvatar, styles.plantAvatar]}>
            <Text style={styles.supplierAvatarText}>🏭</Text>
          </View>
          <View style={styles.supplierInfo}>
            <Text style={styles.supplierName}>{plantName}</Text>
            <View style={styles.addressRow}>
              <Text style={[styles.pinDot, { color: '#3b82f6' }]}>●</Text>
              <Text style={styles.addressText} numberOfLines={2}>{plantAddr}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.callBtn} onPress={() => openNavigationApp(plantCoords, plantAddr, plantName)}>
            <Text style={styles.callBtnIcon}>🧭</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.endBtn} onPress={endTrip} disabled={delivering}>
          {delivering
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.endBtnText}>⬛  End Trip</Text>}
        </TouchableOpacity>
      </>
    );
  }

  function renderDoneSummary() {
    const deliverySecs = elapsedRef.current - pickupRef.current;
    return (
      <View style={styles.doneWrap}>
        <View style={styles.doneIconWrap}>
          <Text style={styles.doneIcon}>✅</Text>
        </View>
        <Text style={styles.doneTitle}>Trip Complete</Text>
        <View style={styles.doneStatsRow}>
          <View style={[styles.doneStat, styles.doneStatBordered]}>
            <Text style={styles.doneStatLabel}>Pickup time</Text>
            <Text style={styles.doneStatValue}>{formatDuration(pickupRef.current)}</Text>
          </View>
          <View style={styles.doneStat}>
            <Text style={styles.doneStatLabel}>Delivery time</Text>
            <Text style={styles.doneStatValue}>{formatDuration(deliverySecs)}</Text>
          </View>
        </View>
        <View style={styles.doneRoute}>
          <View style={styles.doneRouteRow}>
            <Text style={styles.doneRouteIcon}>📍</Text>
            <Text style={styles.doneRouteText} numberOfLines={1}>{addressText}</Text>
          </View>
          <View style={styles.doneRouteLine} />
          <View style={styles.doneRouteRow}>
            <Text style={styles.doneRouteIcon}>🏭</Text>
            <Text style={styles.doneRouteText} numberOfLines={1}>{plantName}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.doneBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderSupplierRow() {
    return (
      <View style={styles.supplierRow}>
        <View style={styles.supplierAvatar}>
          <Text style={styles.supplierAvatarText}>{supplierName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.supplierInfo}>
          <Text style={styles.supplierName}>{supplierName}</Text>
          <View style={styles.addressRow}>
            <Text style={styles.pinDot}>●</Text>
            <Text style={styles.addressText} numberOfLines={2}>{addressText}</Text>
          </View>
        </View>
        {supplierPhone ? (
          <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL(`tel:${supplierPhone}`)}>
            <Text style={styles.callBtnIcon}>📞</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  function renderChips() {
    return (
      <View style={styles.chipsRow}>
        <InfoChip icon="⚖️" label={`${item.quantity} ${item.unit}`} />
        {item.description ? <InfoChip icon="📝" label={item.description} maxWidth={160} /> : null}
      </View>
    );
  }
}

// ─── Info chip component ───────────────────────────────────────────────────
function InfoChip({ icon, label, maxWidth }: Readonly<{ icon: string; label: string; maxWidth?: number }>) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipIcon}>{icon}</Text>
      <Text style={[styles.chipLabel, maxWidth ? { maxWidth } : undefined]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },

  // ── Map & overlays ──
  map: { flex: 1 },

  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
    ...Shadow.md,
    width: SCREEN_WIDTH * 0.75,
  },
  loadingTitle: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary, marginTop: Spacing.sm },
  loadingSubtitle: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 18 },

  noMapWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    backgroundColor: '#f5f5f5',
  },
  noMapIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  noMapIcon: { fontSize: 38 },
  noMapText: { fontSize: 17, fontWeight: '600', color: Colors.textPrimary, textAlign: 'center', marginBottom: 6 },
  noMapSub: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 18 },

  // ── Custom markers ──
  carMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#3b82f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  carMarkerIcon: { fontSize: 20 },
  driverMarker: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(59,130,246,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverMarkerInner: {
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: '#3b82f6',
    borderWidth: 2,
    borderColor: '#fff',
  },
  pickupMarkerWrap: { alignItems: 'center' },
  pickupMarkerBubble: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.primary,
    ...Shadow.md,
  },
  pickupMarkerBubbleDone: { borderColor: Colors.textSecondary, opacity: 0.6 },
  pickupMarkerIcon: { fontSize: 22 },
  pickupMarkerTail: {
    width: 3,
    height: 10,
    backgroundColor: Colors.primary,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
    marginTop: -1,
  },

  // ── Floating buttons ──
  backBtn: {
    position: 'absolute',
    top: 52,
    left: 16,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.md,
  },
  backBtnText: { fontSize: 28, color: Colors.textPrimary, lineHeight: 32, marginTop: -2 },

  recenterBtn: {
    position: 'absolute',
    top: 52,
    right: 16,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.md,
  },
  recenterIcon: { fontSize: 22, color: Colors.primary },

  // ── Bottom sheet card ──
  card: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: Spacing.md,
    paddingBottom: 36,
    paddingTop: Spacing.sm,
    ...Shadow.lg,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.border,
    marginBottom: Spacing.md,
  },

  // ── ETA row ──
  etaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.lg,
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  etaBlock: { flex: 1, alignItems: 'center' },
  etaDivider: { width: 1, height: 30, backgroundColor: Colors.border },
  etaValue: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  etaLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 1 },
  etaBadge: {
    backgroundColor: Colors.successLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  etaBadgeText: { fontSize: 11, color: Colors.success, fontWeight: '600' },

  badgeOnlyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  badge: {
    backgroundColor: Colors.successLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  badgeText: { fontSize: 12, color: Colors.success, fontWeight: '600' },
  wasteTypeLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },

  divider: { height: 1, backgroundColor: Colors.border, marginBottom: Spacing.md },

  // ── Supplier row ──
  supplierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  supplierAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  supplierAvatarText: { fontSize: 20, fontWeight: '700', color: '#fff' },
  supplierInfo: { flex: 1 },
  supplierName: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, marginBottom: 2 },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  pinDot: { fontSize: 8, color: Colors.primary, marginTop: 5 },
  addressText: { flex: 1, fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },

  callBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  callBtnIcon: { fontSize: 20 },

  // ── Chips ──
  chipsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    flexWrap: 'wrap',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipIcon: { fontSize: 13 },
  chipLabel: { fontSize: 13, color: Colors.textPrimary, fontWeight: '500' },

  // ── Action buttons ──
  actionsRow: { flexDirection: 'row', gap: Spacing.sm },
  callFullBtn: {
    flex: 1,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  callFullBtnText: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  navBtn: {
    flex: 2,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 15,
    alignItems: 'center',
  },
  navBtnFull: { flex: 1 },
  navPickupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary + '15',
    borderWidth: 1,
    borderColor: Colors.primary + '40',
    borderRadius: Radius.md,
    paddingVertical: 10,
    marginBottom: 6,
    marginTop: 4,
  },
  navPickupBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 14 },
  noLocationHint: { fontSize: 11, color: Colors.textSecondary, textAlign: 'center', marginBottom: 6 },
  navInlinBtn: {
    marginLeft: 'auto',
    backgroundColor: Colors.primary + '20',
    borderRadius: Radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  navInlinBtnText: { color: Colors.primary, fontSize: 12, fontWeight: '700' },
  navBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // ── Trip: start button ──
  startBtn: {
    flex: 2,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 15,
    alignItems: 'center',
  },
  startBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // ── Trip: timer banner ──
  tripBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successLight,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    marginBottom: Spacing.sm,
    gap: 8,
  },
  tripBannerBlue: { backgroundColor: '#dbeafe' },
  tripDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.success,
  },
  tripDotBlue: { backgroundColor: '#3b82f6' },
  tripBannerText: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },

  // ── Trip: distance pill ──
  distancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    marginBottom: Spacing.sm,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  distancePillText: { fontSize: 13, color: Colors.textPrimary, fontWeight: '500' },

  // ── Trip: abort button ──
  abortBtn: {
    flex: 1,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  abortBtnText: { fontSize: 14, fontWeight: '600', color: Colors.error },

  // ── Trip: collect button ──
  collectBtn: {
    flex: 2,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 15,
    alignItems: 'center',
  },
  collectBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // ── Trip: plant marker ──
  plantMarkerBubble: { borderColor: '#3b82f6' },
  plantAvatar: { backgroundColor: '#dbeafe' },

  // ── Trip: end button ──
  endBtn: {
    backgroundColor: '#1e293b',
    borderRadius: Radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  endBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // ── Trip: done summary ──
  doneWrap: { alignItems: 'center', paddingVertical: Spacing.sm },
  doneIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  doneIcon: { fontSize: 32 },
  doneTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },
  doneStatsRow: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  doneStat: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  doneStatBordered: {
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  doneStatLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: 2 },
  doneStatValue: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  doneRoute: {
    width: '100%',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  doneRouteRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  doneRouteLine: { width: 2, height: 16, backgroundColor: Colors.border, marginLeft: 9 },
  doneRouteIcon: { fontSize: 14 },
  doneRouteText: { flex: 1, fontSize: 13, color: Colors.textPrimary, fontWeight: '500' },
  doneBtn: {
    width: '100%',
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 15,
    alignItems: 'center',
  },
  doneBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // ── Redesigned idle card: title row ──
  sheetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: '#111', flex: 1, marginRight: 8 },
  etaPill: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  etaPillText: { fontSize: 13, fontWeight: '700', color: '#FFF' },

  addrRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14, gap: 6 },
  addrIcon: { fontSize: 14, marginTop: 1 },
  addrText: { fontSize: 13, color: '#555', flex: 1, lineHeight: 18 },

  sheetDivider: { height: 1, backgroundColor: '#E8EBE4', marginBottom: 14 },

  // Info grid (Waste Type | Est. Weight)
  infoGrid: { flexDirection: 'row', marginBottom: 10 },
  infoGridCell: { flex: 1 },
  infoGridCellRight: { paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: '#E8EBE4' },
  infoGridLabel: { fontSize: 11, color: '#888', fontWeight: '500', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.4 },
  infoGridValue: { fontSize: 14, fontWeight: '600', color: '#111' },

  // Meta rows (scheduled, contact)
  metaRow2: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 },
  metaIcon2: { fontSize: 14 },
  metaLabel2: { fontSize: 13, color: '#888', marginRight: 4 },
  metaValue2: { fontSize: 13, fontWeight: '500', color: '#333' },

  // Access instructions box
  accessBox: {
    backgroundColor: '#F0F9F0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  accessLabel: { fontSize: 12, fontWeight: '700', color: Colors.primary, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 },
  accessText: { fontSize: 13, color: '#444', lineHeight: 18 },

  // Nav + call row
  navRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  sheetNavBtn: {
    flex: 1,
    backgroundColor: '#F0F7F0',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  sheetNavBtnText: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  callCircleBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  callCircleIcon: { fontSize: 20 },

  // Start trip button
  startTripBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
  },
  startTripBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },

  // Cancel + Arrived row
  cancelTripBtn: {
    flex: 1,
    backgroundColor: '#FFEBEE',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  cancelTripBtnText: { fontSize: 14, fontWeight: '700', color: '#C62828' },
  arrivedBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  arrivedBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
});
