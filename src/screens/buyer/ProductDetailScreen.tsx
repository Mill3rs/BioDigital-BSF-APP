import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { productsAPI } from '../../api/products';
import { cartAPI } from '../../api/cart';
import { Colors, Spacing, Radius, Typography, Shadow } from '../../utils/theme';
import type { Product, ProductVariant } from '../../types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BuyerStackParamList } from '../../navigation/BuyerNavigator';

type Props = NativeStackScreenProps<BuyerStackParamList, 'ProductDetail'>;

export default function ProductDetailScreen({ route, navigation }: Props) {
  const { productId } = route.params;
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [qty, setQty] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    productsAPI.getById(productId)
      .then(res => {
        setProduct(res.data);
        if (res.data.variants.length > 0) setSelectedVariant(res.data.variants[0]);
      })
      .catch(() => Alert.alert('Error', 'Failed to load product'))
      .finally(() => setLoading(false));
  }, [productId]);

  const handleAddToCart = async () => {
    if (!selectedVariant) return;
    setAddingToCart(true);
    try {
      await cartAPI.addItem(selectedVariant.id, qty);
      Alert.alert('Added to Cart', `${product?.name} added to your cart.`, [
        { text: 'Continue Shopping' },
        { text: 'View Cart', onPress: () => navigation.navigate('Cart') },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Could not add to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator color={Colors.primary} size="large" /></View>;
  }
  if (!product) {
    return <View style={styles.centered}><Text>Product not found</Text></View>;
  }

  const minPrice = selectedVariant?.price ?? (product.variants.length > 0 ? product.variants[0].price : 0);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image gallery */}
        <View style={styles.imageContainer}>
          {product.images.length > 0 ? (
            <Image source={{ uri: product.images[selectedImage] }} style={styles.mainImage} resizeMode="cover" />
          ) : (
            <View style={[styles.mainImage, styles.imagePlaceholder]}>
              <Text style={{ fontSize: 64 }}>🌿</Text>
            </View>
          )}
          {product.images.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbRow}>
              {product.images.map((img, i) => (
                <TouchableOpacity key={i} onPress={() => setSelectedImage(i)}>
                  <Image
                    source={{ uri: img }}
                    style={[styles.thumb, i === selectedImage && styles.thumbActive]}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.details}>
          <Text style={styles.category}>{product.category.replace(/_/g, ' ')}</Text>
          <Text style={styles.name}>{product.name}</Text>
          {product.farm && <Text style={styles.farm}>by {product.farm.name}</Text>}

          <Text style={styles.price}>GHS {minPrice.toFixed(2)}</Text>

          {product.shortDescription ? (
            <Text style={styles.shortDesc}>{product.shortDescription}</Text>
          ) : null}

          {/* Variant selector */}
          {product.variants.length > 1 && (
            <View style={styles.variantSection}>
              <Text style={styles.sectionTitle}>Select Variant</Text>
              <View style={styles.variantRow}>
                {product.variants.filter(v => v.isActive).map(v => (
                  <TouchableOpacity
                    key={v.id}
                    style={[styles.variantChip, selectedVariant?.id === v.id && styles.variantChipActive]}
                    onPress={() => setSelectedVariant(v)}>
                    <Text style={[styles.variantLabel, selectedVariant?.id === v.id && styles.variantLabelActive]}>
                      {v.name}
                    </Text>
                    <Text style={[styles.variantPrice, selectedVariant?.id === v.id && styles.variantLabelActive]}>
                      GHS {v.price.toFixed(2)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Stock */}
          {selectedVariant && (
            <Text style={[styles.stockLabel, selectedVariant.quantity === 0 && styles.outOfStock]}>
              {selectedVariant.quantity > 0 ? `${selectedVariant.quantity} in stock` : 'Out of stock'}
            </Text>
          )}

          {/* Quantity */}
          <View style={styles.qtySection}>
            <Text style={styles.sectionTitle}>Quantity</Text>
            <View style={styles.qtyRow}>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => setQty(q => Math.max(1, q - 1))}>
                <Text style={styles.qtyBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.qtyValue}>{qty}</Text>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => setQty(q => Math.min(q + 1, selectedVariant?.quantity ?? 99))}>
                <Text style={styles.qtyBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Description */}
          {product.description ? (
            <View style={styles.descSection}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{product.description}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomBar}>
        <View style={styles.totalWrap}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>GHS {((selectedVariant?.price ?? 0) * qty).toFixed(2)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.addToCartBtn, (!selectedVariant || selectedVariant.quantity === 0 || addingToCart) && styles.btnDisabled]}
          onPress={handleAddToCart}
          disabled={!selectedVariant || selectedVariant.quantity === 0 || addingToCart}>
          {addingToCart ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.addToCartText}>Add to Cart</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  imageContainer: { backgroundColor: Colors.surface },
  mainImage: { width: '100%', height: 280 },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#e8f5e9' },
  thumbRow: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  thumb: { width: 56, height: 56, borderRadius: Radius.sm, marginRight: Spacing.sm, borderWidth: 2, borderColor: 'transparent' },
  thumbActive: { borderColor: Colors.primary },
  details: { padding: Spacing.lg },
  category: { ...Typography.caption, color: Colors.primary, textTransform: 'uppercase', marginBottom: 4 },
  name: { ...Typography.h3, color: Colors.textPrimary, marginBottom: 4 },
  farm: { ...Typography.body2, color: Colors.textSecondary, marginBottom: Spacing.sm },
  price: { ...Typography.h3, color: Colors.primary, fontWeight: '700', marginBottom: Spacing.sm },
  shortDesc: { ...Typography.body1, color: Colors.textSecondary, marginBottom: Spacing.lg },
  sectionTitle: { ...Typography.label, color: Colors.textSecondary, marginBottom: Spacing.sm },
  variantSection: { marginBottom: Spacing.md },
  variantRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  variantChip: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, padding: Spacing.sm, minWidth: 80, alignItems: 'center' },
  variantChipActive: { borderColor: Colors.primary, backgroundColor: '#e8f5e9' },
  variantLabel: { ...Typography.label, color: Colors.textSecondary },
  variantLabelActive: { color: Colors.primary },
  variantPrice: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  stockLabel: { ...Typography.caption, color: Colors.success, marginBottom: Spacing.md },
  outOfStock: { color: Colors.error },
  qtySection: { marginBottom: Spacing.lg },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  qtyBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { fontSize: 20, color: Colors.textPrimary, lineHeight: 22 },
  qtyValue: { ...Typography.h4, color: Colors.textPrimary, minWidth: 32, textAlign: 'center' },
  descSection: { marginBottom: Spacing.lg },
  description: { ...Typography.body1, color: Colors.textSecondary, lineHeight: 22 },
  bottomBar: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border, ...Shadow.md },
  totalWrap: { flex: 1 },
  totalLabel: { ...Typography.caption, color: Colors.textSecondary },
  totalValue: { ...Typography.h4, color: Colors.primary },
  addToCartBtn: { flex: 1, backgroundColor: Colors.primary, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', marginLeft: Spacing.md },
  btnDisabled: { opacity: 0.5 },
  addToCartText: { ...Typography.button, color: '#fff' },
});
