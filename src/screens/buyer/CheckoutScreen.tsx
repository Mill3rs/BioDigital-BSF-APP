import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { cartAPI } from '../../api/cart';
import { ordersAPI } from '../../api/orders';
import { Colors, Spacing, Radius, Typography, Shadow } from '../../utils/theme';
import { GOOGLE_MAPS_API_KEY } from '../../utils/keys';
import type { Cart, PaymentMethod, DeliveryAddress } from '../../types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BuyerStackParamList } from '../../navigation/BuyerNavigator';

type Props = NativeStackScreenProps<BuyerStackParamList, 'Checkout'>;

const PAYMENT_METHODS: { label: string; value: PaymentMethod; icon: string }[] = [
  { label: 'Cash on Delivery', value: 'CASH_ON_DELIVERY', icon: '💵' },
  { label: 'Mobile Money', value: 'MOBILE_MONEY', icon: '📱' },
  { label: 'Bank Transfer', value: 'BANK_TRANSFER', icon: '🏦' },
];

export default function CheckoutScreen({ navigation }: Props) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH_ON_DELIVERY');
  const placesRef = useRef<any>(null);

  const [address, setAddress] = useState<DeliveryAddress>({
    street: '',
    city: '',
    region: '',
    country: 'Ghana',
    postalCode: '',
  });
  const [deliveryNotes, setDeliveryNotes] = useState('');

  const handlePlaceSelect = (data: any, details: any) => {
    if (!details) return;
    const components: any[] = details.address_components ?? [];
    const get = (...types: string[]) =>
      components.find((c: any) => types.some(t => c.types.includes(t)))?.long_name ?? '';

    const streetNumber = get('street_number');
    const route = get('route');
    const street = [streetNumber, route].filter(Boolean).join(' ') || data.description;
    const city = get('locality', 'administrative_area_level_2', 'sublocality_level_1');
    const region = get('administrative_area_level_1');
    const country = get('country');
    const postalCode = get('postal_code');

    setAddress({ street, city, region, country: country || 'Ghana', postalCode });
  };

  useEffect(() => {
    cartAPI.getCart()
      .then(res => setCart(res.data))
      .catch(() => Alert.alert('Error', 'Failed to load cart'))
      .finally(() => setLoading(false));
  }, []);

  const tax = (cart?.subtotal ?? 0) * 0.15;
  const deliveryFee = 15;
  const total = (cart?.total ?? 0) + tax + deliveryFee;

  const handlePlaceOrder = async () => {
    if (!address.street.trim() || !address.city.trim()) {
      Alert.alert('Missing Address', 'Please fill in your street and city');
      return;
    }
    if (!cart || cart.items.length === 0) {
      Alert.alert('Empty Cart', 'Your cart is empty');
      return;
    }
    setPlacing(true);
    try {
      const res = await ordersAPI.create({
        items: cart.items.map(i => ({ variantId: i.variant.id, quantity: i.quantity })),
        deliveryAddress: address,
        deliveryInstructions: deliveryNotes || undefined,
        paymentMethod,
      });
      navigation.replace('OrderDetail', { orderId: res.data.id });
    } catch (err: any) {
      Alert.alert('Order Failed', err?.response?.data?.message ?? 'Could not place order. Try again.');
    } finally {
      setPlacing(false);
    }
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator color={Colors.primary} size="large" /></View>;
  }

  const items = cart?.items ?? [];

  const listHeader = (
    <>
      {/* Delivery Address */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📍 Delivery Address</Text>
        <Text style={styles.fieldLabel}>Search location *</Text>
        <View style={styles.placesWrapper}>
          <GooglePlacesAutocomplete
            ref={placesRef}
            placeholder="Search for your delivery address…"
            fetchDetails
            minLength={2}
            debounce={300}
            onPress={handlePlaceSelect}
            query={{ key: GOOGLE_MAPS_API_KEY, language: 'en', components: 'country:gh' }}
            textInputProps={{
              placeholderTextColor: Colors.textLight,
              returnKeyType: 'search',
              autoCorrect: false,
            }}
            styles={{
              textInputContainer: styles.placesInputContainer,
              textInput: styles.placesInput,
              listView: styles.placesListView,
              row: styles.placesRow,
              description: styles.placesDescription,
              poweredContainer: styles.placesPoweredContainer,
              separator: styles.placesSeparator,
            }}
            enablePoweredByContainer
            keyboardShouldPersistTaps="handled"
            keepResultsAfterBlur={false}
          />
        </View>

        {address.street ? (
          <View style={styles.addressSummary}>
            <Text style={styles.addressSummaryText}>
              {[address.street, address.city, address.region, address.country].filter(Boolean).join(', ')}
            </Text>
            <TouchableOpacity onPress={() => {
              setAddress({ street: '', city: '', region: '', country: 'Ghana', postalCode: '' });
              placesRef.current?.clear();
            }}>
              <Text style={styles.clearAddress}>✕ Clear</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <Field label="Delivery Notes" value={deliveryNotes} onChange={setDeliveryNotes} placeholder="Additional instructions for driver…" multiline />
      </View>

      {/* Payment Method */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💳 Payment Method</Text>
        {PAYMENT_METHODS.map(m => (
          <TouchableOpacity
            key={m.value}
            style={[styles.paymentOption, paymentMethod === m.value && styles.paymentOptionActive]}
            onPress={() => setPaymentMethod(m.value)}>
            <Text style={styles.paymentIcon}>{m.icon}</Text>
            <Text style={[styles.paymentLabel, paymentMethod === m.value && styles.paymentLabelActive]}>
              {m.label}
            </Text>
            <View style={[styles.radio, paymentMethod === m.value && styles.radioActive]}>
              {paymentMethod === m.value && <View style={styles.radioDot} />}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Order Summary header */}
      <View style={[styles.section, styles.sectionHeaderOnly]}>
        <Text style={styles.sectionTitle}>🧾 Order Summary</Text>
      </View>
    </>
  );

  const listFooter = (
    <View style={styles.section}>
      <View style={styles.divider} />
      <View style={styles.itemRow}>
        <Text style={styles.summaryLabel}>Subtotal</Text>
        <Text style={styles.summaryValue}>GHS {cart?.subtotal.toFixed(2)}</Text>
      </View>
      <View style={styles.itemRow}>
        <Text style={styles.summaryLabel}>Tax (15%)</Text>
        <Text style={styles.summaryValue}>GHS {tax.toFixed(2)}</Text>
      </View>
      <View style={styles.itemRow}>
        <Text style={styles.summaryLabel}>Delivery Fee</Text>
        <Text style={styles.summaryValue}>GHS {deliveryFee.toFixed(2)}</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.itemRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>GHS {total.toFixed(2)}</Text>
      </View>

      <TouchableOpacity
        style={[styles.placeOrderBtn, placing && styles.btnDisabled]}
        onPress={handlePlaceOrder}
        disabled={placing}>
        {placing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.placeOrderText}>Place Order • GHS {total.toFixed(2)}</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        renderItem={({ item }) => (
          <View style={styles.orderItemRow}>
            <Text style={styles.itemName} numberOfLines={1}>
              {item.variant.product.name} × {item.quantity}
            </Text>
            <Text style={styles.itemPrice}>GHS {(item.variant.price * item.quantity).toFixed(2)}</Text>
          </View>
        )}
      />
    </KeyboardAvoidingView>
  );
}

function Field({ label, value, onChange, placeholder, multiline = false }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; multiline?: boolean;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        placeholder={placeholder}
        placeholderTextColor={Colors.textLight}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  section: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md, ...Shadow.sm },
  sectionHeaderOnly: { paddingBottom: Spacing.sm },
  orderItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs, paddingHorizontal: Spacing.lg },
  sectionTitle: { ...Typography.h4, color: Colors.textPrimary, marginBottom: Spacing.md },
  fieldGroup: { marginBottom: Spacing.md },
  fieldLabel: { ...Typography.label, color: Colors.textSecondary, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, padding: Spacing.md, ...Typography.body1, color: Colors.textPrimary, backgroundColor: Colors.surfaceAlt },
  inputMultiline: { height: 80, textAlignVertical: 'top' },
  placesWrapper: { zIndex: 10, marginBottom: Spacing.md },
  placesInputContainer: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, backgroundColor: Colors.surfaceAlt, paddingHorizontal: 4 },
  placesInput: { ...Typography.body1, color: Colors.textPrimary, backgroundColor: 'transparent', height: 48, paddingHorizontal: 8 },
  placesListView: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, marginTop: 4, backgroundColor: Colors.surface },
  placesRow: { padding: Spacing.sm, backgroundColor: 'transparent' },
  placesDescription: { ...Typography.body2, color: Colors.textPrimary },
  placesPoweredContainer: { borderTopWidth: 0.5, borderTopColor: Colors.border, backgroundColor: Colors.surface },
  placesSeparator: { height: 0.5, backgroundColor: Colors.border },
  addressSummary: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', backgroundColor: '#e8f5e9', borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md },
  addressSummaryText: { flex: 1, ...Typography.body2, color: Colors.textPrimary, marginRight: Spacing.sm },
  clearAddress: { ...Typography.caption, color: Colors.error },
  paymentOption: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm },
  paymentOptionActive: { borderColor: Colors.primary, backgroundColor: '#e8f5e9' },
  paymentIcon: { fontSize: 22, marginRight: Spacing.md },
  paymentLabel: { flex: 1, ...Typography.body1, color: Colors.textSecondary },
  paymentLabelActive: { color: Colors.primary, fontWeight: '600' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: Colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  itemName: { flex: 1, ...Typography.body2, color: Colors.textSecondary, marginRight: Spacing.sm },
  itemPrice: { ...Typography.label, color: Colors.textPrimary },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.sm },
  summaryLabel: { ...Typography.body2, color: Colors.textSecondary },
  summaryValue: { ...Typography.body2, color: Colors.textPrimary },
  totalLabel: { ...Typography.h4, color: Colors.textPrimary },
  totalValue: { ...Typography.h4, color: Colors.primary },
  placeOrderBtn: { backgroundColor: Colors.primary, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.sm },
  btnDisabled: { opacity: 0.6 },
  placeOrderText: { ...Typography.button, color: '#fff' },
});
