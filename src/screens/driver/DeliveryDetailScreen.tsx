import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Linking,
  Platform,
  PermissionsAndroid,
  Dimensions,
  StatusBar,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import { driverAPI } from '../../api/driver';
import { Colors, Spacing, Radius, Typography, Shadow } from '../../utils/theme';
import { GOOGLE_MAPS_API_KEY } from '../../utils/keys';
import type { Order } from '../../types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { DriverStackParamList } from '../../navigation/DriverNavigator';

type Props = NativeStackScreenProps<DriverStackParamList, 'DeliveryDetail'>;

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAP_HEIGHT = SCREEN_HEIGHT * 0.38;

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  PENDING:          'Pending',
  CONFIRMED:        'Confirmed',
  PROCESSING:       'Processing',
  READY_FOR_PICKUP: 'Ready for Pickup',
  SHIPPED:          'Shipped',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED:        'Delivered',
  COMPLETED:        'Completed',
  CANCELLED:        'Cancelled',
  FAILED:           'Failed',
};

const STATUS_COLOR: Record<string, string> = {
  PENDING:          '#F57C00',
  CONFIRMED:        '#1565C0',
  PROCESSING:       '#6A1B9A',
  READY_FOR_PICKUP: Colors.accent ?? '#4CAF50',
  SHIPPED:          '#0277BD',
  OUT_FOR_DELIVERY: Colors.primary ?? '#2E7D32',
  DELIVERED:        Colors.success ?? '#388E3C',
  COMPLETED:        Colors.success ?? '#388E3C',
  CANCELLED:        Colors.error ?? '#C62828',
  FAILED:           Colors.error ?? '#C62828',
};

type StatusAction = { label: string; nextStatus: string; color: string; emoji: string };

function getStatusActions(currentStatus: string): StatusAction[] {
  const actions: StatusAction[] = [];
  switch (currentStatus) {
    case 'PENDING':
    case 'CONFIRMED':
      actions.push({ label: 'Start Processing', nextStatus: 'PROCESSING', color: '#6A1B9A', emoji: '⚙️' });
      break;
    case 'PROCESSING':
      actions.push({ label: 'Mark as Shipped', nextStatus: 'SHIPPED', color: '#0277BD', emoji: '📦' });
      break;
    case 'SHIPPED':
    case 'READY_FOR_PICKUP':
      actions.push({ label: 'Out for Delivery', nextStatus: 'OUT_FOR_DELIVERY', color: Colors.primary ?? '#2E7D32', emoji: '🚚' });
      break;
    case 'OUT_FOR_DELIVERY':
      actions.push({ label: 'Mark as Delivered', nextStatus: 'DELIVERED', color: Colors.success ?? '#388E3C', emoji: '✅' });
      break;
  }
  if (!['DELIVERED', 'COMPLETED', 'CANCELLED', 'FAILED'].includes(currentStatus)) {
    actions.push({ label: 'Mark as Failed', nextStatus: 'FAILED', color: Colors.error ?? '#C62828', emoji: '❌' });
  }
  return actions;
}

// ─── Map helpers ──────────────────────────────────────────────────────────────
interface Coords { latitude: number; longitude: number }

function buildGeoQuery(order: Order): string {
  const a = order.deliveryAddress;
  return [a.street, a.city, a.region, a.country].filter(Boolean).join(', ');
}
function buildAddressText(order: Order): string {
  const a = order.deliveryAddress;
  return [a.street, a.city, a.region].filter(Boolean).join(', ');
}

async function geocodeAddress(query: string): Promise<Coords | null> {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}`;
    const res = await fetch(url);
    const json = await res.json();
    const loc = json?.results?.[0]?.geometry?.location;
    if (loc?.lat && loc?.lng) return { latitude: loc.lat, longitude: loc.lng };
  } catch { /* silent */ }
  return null;
}

function decodePolyline(encoded: string): Coords[] {
  const coords: Coords[] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b: number, shift = 0, result = 0;
    do { b = (encoded.codePointAt(index++) ?? 0) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { b = (encoded.codePointAt(index++) ?? 0) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    coords.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return coords;
}

async function fetchRoute(origin: Coords, dest: Coords): Promise<Coords[]> {
  try {
    const url =
      `https://maps.googleapis.com/maps/api/directions/json` +
      `?origin=${origin.latitude},${origin.longitude}` +
      `&destination=${dest.latitude},${dest.longitude}` +
      `&mode=driving&key=${GOOGLE_MAPS_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    const poly = data?.routes?.[0]?.overview_polyline?.points;
    if (!poly) return [];
    return decodePolyline(poly);
  } catch { return []; }
}

function openMapsNavigation(coords: Coords | null, addressText: string) {
  if (coords) {
    const { latitude: lat, longitude: lng } = coords;
    const url = Platform.select({
      ios: `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`,
      android: `google.navigation:q=${lat},${lng}&mode=d`,
    });
    const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
    if (url) {
      Linking.canOpenURL(url).then(ok => Linking.openURL(ok ? url : webUrl));
    } else {
      Linking.openURL(webUrl);
    }
  } else {
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressText)}`);
  }
}

const MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#d0e8d0' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9e8fb' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#e5f5e5' }] },
  { featureType: 'poi', elementType: 'labels.text', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function DeliveryDetailScreen({ route, navigation }: Props) {
  const { orderId } = route.params;
  const mapRef = useRef<MapView>(null);

  const [order, setOrder]               = useState<Order | null>(null);
  const [loading, setLoading]           = useState(true);
  const [updating, setUpdating]         = useState(false);
  const [notes, setNotes]               = useState('');
  const [driverCoords, setDriverCoords] = useState<Coords | null>(null);
  const [deliveryCoords, setDeliveryCoords] = useState<Coords | null>(null);
  const [geocoding, setGeocoding]       = useState(false);
  const [routeCoords, setRouteCoords]   = useState<Coords[]>([]);
  const [mapReady, setMapReady]         = useState(false);

  // Load order
  useEffect(() => {
    (async () => {
      try {
        const res = await driverAPI.getDeliveryById(orderId);
        setOrder(res.data ?? null);
      } catch {
        Alert.alert('Error', 'Failed to load delivery details.');
      } finally {
        setLoading(false);
      }
    })();
  }, [orderId]);

  // Geocode delivery address
  useEffect(() => {
    if (!order) return;
    setGeocoding(true);
    geocodeAddress(buildGeoQuery(order)).then(coords => {
      setDeliveryCoords(coords);
      setGeocoding(false);
    });
  }, [order]);

  // Get driver GPS
  useEffect(() => {
    async function startGPS() {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          { title: 'Location Permission', message: 'BioDigital needs your location for navigation.', buttonPositive: 'Allow' },
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) return;
      }
      Geolocation.getCurrentPosition(
        pos => setDriverCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => { /* silent */ },
        { enableHighAccuracy: true, timeout: 10000 },
      );
    }
    startGPS();
  }, []);

  // Fetch route polyline
  useEffect(() => {
    if (!driverCoords || !deliveryCoords) return;
    fetchRoute(driverCoords, deliveryCoords).then(setRouteCoords);
  }, [driverCoords, deliveryCoords]);

  // Fit map to markers
  const fitMap = useCallback(() => {
    if (!mapReady || !mapRef.current) return;
    const points: Coords[] = [];
    if (driverCoords) points.push(driverCoords);
    if (deliveryCoords) points.push(deliveryCoords);
    if (points.length === 0) return;
    mapRef.current.fitToCoordinates(points, {
      edgePadding: { top: 70, right: 60, bottom: 60, left: 60 },
      animated: true,
    });
  }, [mapReady, driverCoords, deliveryCoords]);

  useEffect(() => { fitMap(); }, [fitMap]);

  // Status update
  const updateStatus = async (newStatus: string) => {
    if (!order) return;
    setUpdating(true);
    try {
      const res = await driverAPI.updateDeliveryStatus(orderId, newStatus, notes || undefined);
      setOrder(prev => prev ? { ...prev, status: (res.data?.status ?? newStatus) as any } : prev);
      setNotes('');
      Alert.alert('Updated', `Status set to "${STATUS_LABELS[newStatus] ?? newStatus}".`);
    } catch {
      Alert.alert('Error', 'Failed to update delivery status.');
    } finally {
      setUpdating(false);
    }
  };

  const confirmUpdate = (action: StatusAction) => {
    Alert.alert(
      `${action.emoji} ${action.label}`,
      `Mark order #${order?.orderNumber} as "${STATUS_LABELS[action.nextStatus]}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => updateStatus(action.nextStatus) },
      ],
    );
  };

  // ─── Render ────────────────────────────────────────────────────────────
  if (loading) {
    return <View style={styles.centered}><ActivityIndicator color={Colors.primary} size="large" /></View>;
  }
  if (!order) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Delivery not found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const addr = order.deliveryAddress;
  const addressText = buildAddressText(order);
  const statusColor = STATUS_COLOR[order.status] ?? Colors.primary;
  const statusActions = getStatusActions(order.status);
  const isTerminal = ['DELIVERED', 'COMPLETED', 'CANCELLED', 'FAILED'].includes(order.status);

  const initialRegion = deliveryCoords
    ? { ...deliveryCoords, latitudeDelta: 0.03, longitudeDelta: 0.03 }
    : { latitude: 5.6037, longitude: -0.187, latitudeDelta: 0.5, longitudeDelta: 0.5 };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* ── MAP ── */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          customMapStyle={MAP_STYLE}
          initialRegion={initialRegion}
          onMapReady={() => setMapReady(true)}
          showsUserLocation={false}
          showsCompass={false}
          toolbarEnabled={false}>

          {driverCoords && (
            <Marker coordinate={driverCoords} anchor={{ x: 0.5, y: 0.5 }} title="Your Location">
              <View style={styles.driverDot} />
            </Marker>
          )}

          {deliveryCoords && (
            <Marker coordinate={deliveryCoords} title={`Order #${order.orderNumber}`} description={addressText}>
              <View style={styles.deliveryPin}>
                <Text style={styles.deliveryPinEmoji}>📦</Text>
              </View>
            </Marker>
          )}

          {routeCoords.length > 0 && (
            <Polyline
              coordinates={routeCoords}
              strokeColor={Colors.primary ?? '#2E7D32'}
              strokeWidth={4}
              lineCap="round"
              lineJoin="round"
            />
          )}
        </MapView>

        <TouchableOpacity style={styles.mapBackBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.mapBackIcon}>←</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navBtn} onPress={() => openMapsNavigation(deliveryCoords, addressText)}>
          <Text style={styles.navBtnText}>{geocoding ? '⏳ Locating...' : '🗺  Navigate'}</Text>
        </TouchableOpacity>

        <View style={[styles.statusPill, { backgroundColor: statusColor }]}>
          <Text style={styles.statusPillText}>{STATUS_LABELS[order.status] ?? order.status}</Text>
        </View>
      </View>

      {/* ── DETAIL PANEL ── */}
      <ScrollView style={styles.panel} contentContainerStyle={styles.panelContent} showsVerticalScrollIndicator={false}>

        <View style={styles.orderHeader}>
          <Text style={styles.orderNumber}>Order #{order.orderNumber}</Text>
          <Text style={styles.orderTotal}>GHS {order.total.toFixed(2)}</Text>
        </View>

        {/* Customer */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Customer</Text>
          <InfoRow label="Name"  value={order.customer?.fullName ?? '—'} />
          <InfoRow label="Phone" value={order.customer?.phoneNumber ?? '—'} />
        </View>

        {/* Delivery Address */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <InfoRow label="Street"  value={addr.street ?? '—'} />
          <InfoRow label="City"    value={addr.city ?? '—'} />
          {addr.region  && <InfoRow label="Region"  value={addr.region} />}
          <InfoRow label="Country" value={addr.country ?? '—'} />
          {order.deliveryInstructions && <InfoRow label="Instructions" value={order.deliveryInstructions} />}
          <TouchableOpacity style={styles.openMapBtn} onPress={() => openMapsNavigation(deliveryCoords, addressText)}>
            <Text style={styles.openMapBtnText}>📍  Open in Maps</Text>
          </TouchableOpacity>
        </View>

        {/* Order Details */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Order Details</Text>
          <InfoRow label="Payment"  value={String(order.paymentMethod ?? '').replace(/_/g, ' ')} />
          <InfoRow label="Total"    value={`GHS ${order.total.toFixed(2)}`} />
        </View>

        {/* Items */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Items ({order.items?.length ?? 0})</Text>
          {order.items?.map((item, idx) => (
            <View key={idx} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.variant?.product?.name ?? 'Product'}</Text>
                {item.variant?.name && <Text style={styles.itemVariant}>{item.variant.name}</Text>}
              </View>
              <Text style={styles.itemQty}>×{item.quantity}</Text>
              <Text style={styles.itemPrice}>GHS {item.price.toFixed(2)}</Text>
            </View>
          ))}
        </View>

        {/* Notes */}
        {!isTerminal && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Notes (optional)</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Add notes about this delivery..."
              placeholderTextColor={Colors.textSecondary}
              multiline
              numberOfLines={3}
              value={notes}
              onChangeText={setNotes}
            />
          </View>
        )}

        {/* ── Status actions ── */}
        {statusActions.length > 0 && (
          <View style={styles.actionsContainer}>
            <Text style={styles.actionsLabel}>Update Status</Text>
            {statusActions.map((action, idx) => {
              const isPrimary = idx === 0;
              return (
                <TouchableOpacity
                  key={action.nextStatus}
                  style={[
                    styles.actionBtn,
                    isPrimary
                      ? { backgroundColor: action.color, borderColor: action.color }
                      : { backgroundColor: 'transparent', borderColor: action.color },
                  ]}
                  onPress={() => confirmUpdate(action)}
                  disabled={updating}>
                  {updating && isPrimary
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={[styles.actionBtnText, !isPrimary && { color: action.color }]}>
                        {action.emoji}  {action.label}
                      </Text>
                  }
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Terminal banners */}
        {(order.status === 'DELIVERED' || order.status === 'COMPLETED') && (
          <View style={[styles.terminalBanner, { backgroundColor: (Colors.success ?? '#388E3C') + '22' }]}>
            <Text style={[styles.terminalBannerText, { color: Colors.success ?? '#388E3C' }]}>✅  Delivery Completed</Text>
          </View>
        )}
        {order.status === 'FAILED' && (
          <View style={[styles.terminalBanner, { backgroundColor: (Colors.error ?? '#C62828') + '22' }]}>
            <Text style={[styles.terminalBannerText, { color: Colors.error ?? '#C62828' }]}>❌  Delivery Failed</Text>
          </View>
        )}
        {order.status === 'CANCELLED' && (
          <View style={[styles.terminalBanner, { backgroundColor: '#9E9E9E22' }]}>
            <Text style={[styles.terminalBannerText, { color: '#757575' }]}>🚫  Order Cancelled</Text>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background ?? '#F5F5F5' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { ...Typography.body1, color: Colors.error ?? '#C62828', marginBottom: 16 },
  backBtn: { paddingHorizontal: 24, paddingVertical: 10, backgroundColor: Colors.primary ?? '#2E7D32', borderRadius: Radius.md },
  backBtnText: { ...Typography.button, color: '#fff' },

  mapContainer: { height: MAP_HEIGHT },
  map: { ...StyleSheet.absoluteFillObject },

  mapBackBtn: {
    position: 'absolute', top: 48, left: 16,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    ...Shadow.sm,
  },
  mapBackIcon: { fontSize: 18, color: '#333', fontWeight: '700' },

  navBtn: {
    position: 'absolute', bottom: 12, right: 12,
    backgroundColor: Colors.primary ?? '#2E7D32',
    paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: Radius.full ?? 24,
    ...Shadow.md,
  },
  navBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  statusPill: {
    position: 'absolute', bottom: 12, left: 12,
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: Radius.full ?? 24,
  },
  statusPillText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  driverDot: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: Colors.primary ?? '#2E7D32',
    borderWidth: 3, borderColor: '#fff',
  },
  deliveryPin: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    ...Shadow.sm,
  },
  deliveryPinEmoji: { fontSize: 22 },

  panel: { flex: 1 },
  panelContent: { padding: Spacing.md },

  orderHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: Spacing.sm,
  },
  orderNumber: { fontSize: 18, fontWeight: '800', color: '#111' },
  orderTotal: { fontSize: 16, fontWeight: '700', color: Colors.primary ?? '#2E7D32' },

  card: {
    backgroundColor: Colors.surface ?? '#fff',
    borderRadius: Radius.lg, padding: Spacing.md,
    marginBottom: Spacing.sm, ...Shadow.sm,
  },
  sectionTitle: {
    fontSize: 12, fontWeight: '700', color: '#888',
    letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8,
  },

  infoRow: {
    flexDirection: 'row', paddingVertical: 5,
    borderBottomWidth: 1, borderBottomColor: (Colors.border ?? '#E0E0E0') + '60',
  },
  infoLabel: { ...Typography.body2, color: Colors.textSecondary, width: 100 },
  infoValue: { ...Typography.body2, color: Colors.textPrimary, flex: 1, fontWeight: '500' },

  openMapBtn: {
    marginTop: 10, paddingVertical: 8,
    borderWidth: 1, borderColor: Colors.primary ?? '#2E7D32',
    borderRadius: Radius.md, alignItems: 'center',
  },
  openMapBtnText: { color: Colors.primary ?? '#2E7D32', fontWeight: '600', fontSize: 13 },

  itemRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: (Colors.border ?? '#E0E0E0') + '60',
  },
  itemInfo: { flex: 1 },
  itemName: { ...Typography.body2, color: Colors.textPrimary, fontWeight: '500' },
  itemVariant: { ...Typography.caption, color: Colors.textSecondary },
  itemQty: { ...Typography.body2, color: Colors.textSecondary, marginHorizontal: Spacing.sm },
  itemPrice: { ...Typography.body2, color: Colors.primary, fontWeight: '600' },

  notesInput: {
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, padding: Spacing.sm,
    ...Typography.body2, color: Colors.textPrimary,
    textAlignVertical: 'top', minHeight: 80,
  },

  actionsContainer: { marginBottom: Spacing.sm },
  actionsLabel: {
    fontSize: 12, fontWeight: '700', color: '#888',
    letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8,
  },
  actionBtn: {
    borderRadius: Radius.lg, padding: Spacing.md,
    alignItems: 'center', marginBottom: 8,
    borderWidth: 1.5,
  },
  actionBtnText: { ...Typography.button, color: '#fff' },

  terminalBanner: { borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center', marginBottom: Spacing.sm },
  terminalBannerText: { fontSize: 15, fontWeight: '700' },
});
