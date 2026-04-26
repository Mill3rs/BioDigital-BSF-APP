import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { cartAPI } from '../../api/cart';
import { ordersAPI } from '../../api/orders';
import { Colors, Spacing, Radius, Typography, Shadow } from '../../utils/theme';
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

  const [address, setAddress] = useState<DeliveryAddress>({
    street: '',
    city: '',
    region: '',
    country: 'Ghana',
    postalCode: '',
  });
  const [deliveryNotes, setDeliveryNotes] = useState('');

  useEffect(() => {
    cartAPI.getCart()
      .then(res => setCart(res.data))
      .catch(() => Alert.alert('Error', 'Failed to load cart'))
      .finally(() => setLoading(false));
  }, []);

  const tax = (cart?.subtotal ?? 0) * 0.15;
  const total = (cart?.total ?? 0) + tax;

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

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Delivery Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 Delivery Address</Text>
          <Field label="Street / Area *" value={address.street} onChange={v => setAddress(a => ({ ...a, street: v }))} placeholder="e.g. 12 Accra Road" />
          <Field label="City *" value={address.city} onChange={v => setAddress(a => ({ ...a, city: v }))} placeholder="e.g. Accra" />
          <Field label="Region" value={address.region ?? ''} onChange={v => setAddress(a => ({ ...a, region: v }))} placeholder="e.g. Greater Accra" />
          <Field label="Country" value={address.country} onChange={v => setAddress(a => ({ ...a, country: v }))} placeholder="e.g. Ghana" />
          <Field label="Delivery Notes" value={deliveryNotes} onChange={setDeliveryNotes} placeholder="Additional instructions for driver..." multiline />
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

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🧾 Order Summary</Text>
          {cart?.items.map(item => (
            <View key={item.id} style={styles.itemRow}>
              <Text style={styles.itemName} numberOfLines={1}>
                {item.variant.product.name} × {item.quantity}
              </Text>
              <Text style={styles.itemPrice}>GHS {(item.variant.price * item.quantity).toFixed(2)}</Text>
            </View>
          ))}
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
            <Text style={styles.summaryLabel}>Delivery</Text>
            <Text style={[styles.summaryValue, { color: Colors.success }]}>Free</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.itemRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>GHS {total.toFixed(2)}</Text>
          </View>
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
      </ScrollView>
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
  sectionTitle: { ...Typography.h4, color: Colors.textPrimary, marginBottom: Spacing.md },
  fieldGroup: { marginBottom: Spacing.md },
  fieldLabel: { ...Typography.label, color: Colors.textSecondary, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, padding: Spacing.md, ...Typography.body1, color: Colors.textPrimary, backgroundColor: Colors.surfaceAlt },
  inputMultiline: { height: 80, textAlignVertical: 'top' },
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
