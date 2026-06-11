import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { productsAPI } from '../../api/products';
import { cartAPI } from '../../api/cart';
import { useCartCount } from '../../store/cartStore';
import { Colors, Spacing, Radius, Typography, Shadow } from '../../utils/theme';
import { resolveImageUrl } from '../../utils/imageUtils';
import type { Product, ProductVariant, ProductReview } from '../../types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BuyerStackParamList } from '../../navigation/BuyerNavigator';

type Props = NativeStackScreenProps<BuyerStackParamList, 'ProductDetail'>;

export default function ProductDetailScreen({ route, navigation }: Props) {
  const rawParams = route.params as any;
  // Support both old { productId } and new { productIds } param shapes
  const productIds: string[] = rawParams.productIds ?? (rawParams.productId ? [rawParams.productId] : []);
  const [product, setProduct] = useState<Product | null>(null);
  const [allImages, setAllImages] = useState<string[]>([]);
  const [allVariants, setAllVariants] = useState<ProductVariant[]>([]);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [totalQty, setTotalQty] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [qty, setQty] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const { incrementCart } = useCartCount();

  useEffect(() => {
    if (!productIds.length) {
      setLoading(false);
      return;
    }
    Promise.all(productIds.map(id => productsAPI.getById(id)))
      .then(results => {
        const products = results.map(r => r.data);
        const first = products[0];
        setProduct(first);
        setAvgRating(first.averageRating ?? 0);
        setReviewCount(first.reviewCount ?? first._count?.reviews ?? 0);
        setReviews(first.reviews ?? []);
        // Collect all images across merged products (deduplicated)
        const imgs = [...new Set(products.flatMap(p => p.images ?? []))];
        setAllImages(imgs);
        // Merge all active variants from all products
        const merged = products.flatMap(p => p.variants.filter(v => v.isActive));
        setAllVariants(merged);
        setTotalQty(merged.reduce((s, v) => s + v.quantity, 0));
        const firstInStock = merged.find(v => v.quantity > 0) ?? (merged[0] ?? null);
        setSelectedVariant(firstInStock);
      })
      .catch(() => Alert.alert('Error', 'Failed to load product'))
      .finally(() => setLoading(false));
  }, [productIds.join(',')]);

  const handleAddToCart = async () => {
    if (!selectedVariant) return;
    setAddingToCart(true);
    try {
      await cartAPI.addItem(selectedVariant.id, qty);
      incrementCart(qty);
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

  const minPrice = selectedVariant?.price ?? (allVariants.length > 0 ? allVariants[0].price : 0);
  const isMerged = productIds.length > 1;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image gallery */}
        <View style={styles.imageContainer}>
          {allImages.length > 0 ? (
            <Image source={{ uri: resolveImageUrl(allImages[selectedImage]) ?? undefined }} style={styles.mainImage} resizeMode="contain" />
          ) : (
            <View style={[styles.mainImage, styles.imagePlaceholder]}>
              <Text style={{ fontSize: 64 }}>🌿</Text>
            </View>
          )}
          {allImages.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbRow}>
              {allImages.map((img, i) => (
                <TouchableOpacity key={i} onPress={() => setSelectedImage(i)}>
                  <Image
                    source={{ uri: resolveImageUrl(img) ?? undefined }}
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
          <Text style={styles.name}>{product.name}{isMerged ? ` (${productIds.length} batches)` : ''}</Text>
          {product.farm && <Text style={styles.farm}>by {product.farm.name}</Text>}

          <Text style={styles.price}>GHS {minPrice.toFixed(2)}</Text>

          {/* Stock summary */}
          <Text style={[styles.totalStockLabel, totalQty === 0 && styles.outOfStockText]}>
            {totalQty > 0 ? `${totalQty} units available` : 'Out of stock'}
          </Text>

          {product.shortDescription ? (
            <Text style={styles.shortDesc}>{product.shortDescription}</Text>
          ) : null}

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
                onPress={() => setQty(q => Math.min(q + 1, totalQty || 999))}>
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

          {/* Reviews */}
          <View style={styles.reviewsSection}>
            <View style={styles.reviewsHeader}>
              <Text style={styles.sectionTitle}>Customer Reviews</Text>
              {reviewCount > 0 && (
                <View style={styles.ratingBadge}>
                  <Text style={styles.ratingBadgeStar}>★</Text>
                  <Text style={styles.ratingBadgeValue}>{avgRating.toFixed(1)}</Text>
                  <Text style={styles.ratingBadgeCount}>({reviewCount})</Text>
                </View>
              )}
            </View>

            {reviews.length === 0 ? (
              <Text style={styles.noReviews}>No reviews yet. Be the first to review!</Text>
            ) : (
              reviews.map((rev) => (
                <View key={rev.id} style={styles.reviewCard}>
                  <View style={styles.reviewTopRow}>
                    <View style={styles.reviewAvatar}>
                      <Text style={styles.reviewAvatarText}>
                        {rev.user.fullName?.charAt(0)?.toUpperCase() ?? '?'}
                      </Text>
                    </View>
                    <View style={styles.reviewMeta}>
                      <Text style={styles.reviewAuthor}>
                        {rev.user.fullName?.slice(0, 3) ?? '???'}{'***'}
                      </Text>
                      <Text style={styles.reviewDate}>
                        {new Date(rev.createdAt).toLocaleDateString('en-GH', { dateStyle: 'medium' })}
                      </Text>
                    </View>
                    {rev.verified && (
                      <View style={styles.verifiedBadge}>
                        <Text style={styles.verifiedText}>✓ Verified</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.reviewStars}>
                    {'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}
                  </Text>
                  {rev.title ? <Text style={styles.reviewTitle}>{rev.title}</Text> : null}
                  {rev.comment ? <Text style={styles.reviewComment}>{rev.comment}</Text> : null}
                </View>
              ))
            )}
          </View>
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
  imageContainer: { backgroundColor: '#f0f4f0' },
  mainImage: { width: '100%', height: 220, backgroundColor: '#f0f4f0' },
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
  variantChipOos: { opacity: 0.4 },
  variantLabel: { ...Typography.label, color: Colors.textSecondary },
  variantLabelActive: { color: Colors.primary },
  variantPrice: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  variantOosText: { ...Typography.caption, color: Colors.error, marginTop: 2 },
  totalStockLabel: { ...Typography.label, color: Colors.success, fontWeight: '600', marginBottom: Spacing.sm },
  outOfStockText: { color: Colors.error },
  stockLabel: { ...Typography.caption, color: Colors.textSecondary, marginBottom: Spacing.md },
  qtySection: { marginBottom: Spacing.lg },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  qtyBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { fontSize: 20, color: Colors.textPrimary, lineHeight: 22 },
  qtyValue: { ...Typography.h4, color: Colors.textPrimary, minWidth: 32, textAlign: 'center' },
  descSection: { marginBottom: Spacing.lg },
  description: { ...Typography.body1, color: Colors.textSecondary, lineHeight: 22 },
  // Reviews
  reviewsSection: { marginBottom: Spacing.lg },
  reviewsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.warningLight, borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  ratingBadgeStar: { fontSize: 14, color: Colors.warning, marginRight: 2 },
  ratingBadgeValue: { ...Typography.label, color: Colors.warning, fontWeight: '700' },
  ratingBadgeCount: { ...Typography.caption, color: Colors.textSecondary, marginLeft: 4 },
  noReviews: { ...Typography.body2, color: Colors.textLight, fontStyle: 'italic', textAlign: 'center', paddingVertical: Spacing.lg },
  reviewCard: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm, backgroundColor: Colors.surfaceAlt },
  reviewTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  reviewAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.sm },
  reviewAvatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  reviewMeta: { flex: 1 },
  reviewAuthor: { ...Typography.label, color: Colors.textPrimary },
  reviewDate: { ...Typography.caption, color: Colors.textLight },
  verifiedBadge: { backgroundColor: Colors.successLight, borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  verifiedText: { ...Typography.caption, color: Colors.success, fontWeight: '600' },
  reviewStars: { fontSize: 16, color: Colors.warning, letterSpacing: 1, marginBottom: 4 },
  reviewTitle: { ...Typography.label, color: Colors.textPrimary, marginBottom: 2 },
  reviewComment: { ...Typography.body2, color: Colors.textSecondary, lineHeight: 20 },
  bottomBar: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border, ...Shadow.md },
  totalWrap: { flex: 1 },
  totalLabel: { ...Typography.caption, color: Colors.textSecondary },
  totalValue: { ...Typography.h4, color: Colors.primary },
  addToCartBtn: { flex: 1, backgroundColor: Colors.primary, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', marginLeft: Spacing.md },
  btnDisabled: { opacity: 0.5 },
  addToCartText: { ...Typography.button, color: '#fff' },
});
