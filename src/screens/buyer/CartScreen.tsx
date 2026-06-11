import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Image, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { cartAPI } from '../../api/cart';
import { useCartCount } from '../../store/cartStore';
import { Colors, Spacing, Radius, Typography, Shadow } from '../../utils/theme';
import { resolveImageUrl } from '../../utils/imageUtils';
import type { Cart, CartItem } from '../../types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BuyerStackParamList } from '../../navigation/BuyerNavigator';

type Props = NativeStackScreenProps<BuyerStackParamList, 'Cart'>;

export default function CartScreen({ navigation }: Props) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingItem, setUpdatingItem] = useState<string | null>(null);
  const { setCartCount } = useCartCount();

  const updateCart = useCallback((c: Cart | null) => {
    setCart(c);
    setCartCount(c?.items?.length ?? 0);
  }, [setCartCount]);

  const loadCart = useCallback(async () => {
    try {
      const res = await cartAPI.getCart();
      updateCart(res.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [updateCart]);

  useFocusEffect(useCallback(() => { loadCart(); }, [loadCart]));

  const handleUpdateQty = async (item: CartItem, delta: number) => {
    const newQty = item.quantity + delta;
    if (newQty < 1) {
      handleRemove(item.id);
      return;
    }
    setUpdatingItem(item.id);
    try {
      const res = await cartAPI.updateItem(item.id, newQty);
      updateCart(res.data);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Could not update cart');
    } finally {
      setUpdatingItem(null);
    }
  };

  const handleRemove = (itemId: string) => {
    Alert.alert('Remove Item', 'Remove this item from your cart?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          setUpdatingItem(itemId);
          try {
            const res = await cartAPI.removeItem(itemId);
            updateCart(res.data);
          } catch {
            Alert.alert('Error', 'Could not remove item');
          } finally {
            setUpdatingItem(null);
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: CartItem }) => (
    <View style={styles.itemCard}>
      {item.variant.product.images?.[0] ? (
        <Image source={{ uri: resolveImageUrl(item.variant.product.images[0]) ?? undefined }} style={styles.itemImage} resizeMode="contain" />
      ) : (
        <View style={[styles.itemImage, styles.itemImagePlaceholder]}>
          <Text style={{ fontSize: 28 }}>🌿</Text>
        </View>
      )}
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={2}>{item.variant.product.name}</Text>
        <Text style={styles.itemVariant}>{item.variant.name}</Text>
        <Text style={styles.itemPrice}>GHS {item.variant.price.toFixed(2)}</Text>
        <View style={styles.qtyRow}>
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => handleUpdateQty(item, -1)}
            disabled={updatingItem === item.id}>
            <Text style={styles.qtyBtnText}>−</Text>
          </TouchableOpacity>
          {updatingItem === item.id ? (
            <ActivityIndicator size="small" color={Colors.primary} style={{ width: 32 }} />
          ) : (
            <Text style={styles.qtyValue}>{item.quantity}</Text>
          )}
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => handleUpdateQty(item, 1)}
            disabled={updatingItem === item.id}>
            <Text style={styles.qtyBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.itemRight}>
        <Text style={styles.itemSubtotal}>GHS {(item.variant.price * item.quantity).toFixed(2)}</Text>
        <TouchableOpacity onPress={() => handleRemove(item.id)} style={styles.removeBtn}>
          <Text style={styles.removeIcon}>🗑</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator color={Colors.primary} size="large" /></View>;
  }

  const items = cart?.items ?? [];

  return (
    <View style={styles.container}>
      {items.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🛒</Text>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySubtitle}>Browse products and add items to your cart</Text>
          <TouchableOpacity style={styles.shopBtn} onPress={() => navigation.navigate('Products')}>
            <Text style={styles.shopBtnText}>Shop Now</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={items}
            keyExtractor={i => i.id}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadCart(); }} colors={[Colors.primary]} />}
            renderItem={renderItem}
          />

          {/* Summary */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{items.length} item{items.length > 1 ? 's' : ''}</Text>
              <Text style={styles.summaryValue}>GHS {cart?.subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { fontWeight: '700' }]}>Total</Text>
              <Text style={styles.totalValue}>GHS {cart?.total.toFixed(2)}</Text>
            </View>
            <TouchableOpacity style={styles.checkoutBtn} onPress={() => navigation.navigate('Checkout')}>
              <Text style={styles.checkoutBtnText}>Proceed to Checkout →</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: Spacing.md },

  itemCard: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: Radius.lg, marginBottom: Spacing.sm, padding: Spacing.md, ...Shadow.sm },
  itemImage: { width: 72, height: 72, borderRadius: Radius.md, backgroundColor: '#f0f4f0' },
  itemImagePlaceholder: { backgroundColor: '#e8f5e9', alignItems: 'center', justifyContent: 'center' },
  itemInfo: { flex: 1, marginHorizontal: Spacing.md },
  itemName: { ...Typography.body2, color: Colors.textPrimary, fontWeight: '600', marginBottom: 2 },
  itemVariant: { ...Typography.caption, color: Colors.textSecondary, marginBottom: 4 },
  itemPrice: { ...Typography.label, color: Colors.primary, marginBottom: Spacing.sm },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  qtyBtn: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { fontSize: 16, color: Colors.textPrimary, lineHeight: 18 },
  qtyValue: { ...Typography.body2, color: Colors.textPrimary, minWidth: 24, textAlign: 'center', fontWeight: '600' },
  itemRight: { alignItems: 'flex-end', justifyContent: 'space-between' },
  itemSubtotal: { ...Typography.label, color: Colors.textPrimary, fontWeight: '700' },
  removeBtn: { padding: 4 },
  removeIcon: { fontSize: 18 },

  summaryCard: { backgroundColor: Colors.surface, padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.border, ...Shadow.md },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  summaryLabel: { ...Typography.body1, color: Colors.textSecondary },
  summaryValue: { ...Typography.body1, color: Colors.textPrimary },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.sm },
  totalValue: { ...Typography.h4, color: Colors.primary },
  checkoutBtn: { backgroundColor: Colors.primary, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.md },
  checkoutBtnText: { ...Typography.button, color: '#fff' },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl },
  emptyIcon: { fontSize: 64, marginBottom: Spacing.md },
  emptyTitle: { ...Typography.h3, color: Colors.textPrimary, marginBottom: Spacing.sm },
  emptySubtitle: { ...Typography.body1, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.xl },
  shopBtn: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md },
  shopBtnText: { ...Typography.button, color: '#fff' },
});
