import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BuyerStackParamList, SubmittedReview } from '../../navigation/BuyerNavigator';
import { ordersAPI } from '../../api/orders';
import { productsAPI } from '../../api/products';
import { Colors } from '../../utils/theme';
import type { Order } from '../../types';

type Props = NativeStackScreenProps<BuyerStackParamList, 'Review'>;

// ── Star Rating Component ──────────────────────────────────────────────────────
function StarRating({
  value,
  onChange,
  size = 36,
}: Readonly<{
  value: number;
  onChange: (v: number) => void;
  size?: number;
}>) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity key={star} onPress={() => onChange(star)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[styles.star, { fontSize: size, color: star <= value ? '#f59e0b' : '#d1d5db' }]}>
            ★
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function ReviewScreen({ route, navigation }: Readonly<Props>) {
  const { orderId } = route.params;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Driver review state
  const [driverRating, setDriverRating] = useState(0);
  const [driverComment, setDriverComment] = useState('');

  // Product review state — keyed by productId
  const [productRatings, setProductRatings] = useState<Record<string, number>>({});
  const [productComments, setProductComments] = useState<Record<string, string>>({});

  const loadOrder = useCallback(async () => {
    try {
      const res = await ordersAPI.getById(orderId);
      setOrder(res.data);
    } catch {
      Alert.alert('Error', 'Failed to load order details.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [orderId, navigation]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const handleSubmit = async () => {
    if (!order) return;

    // Require at least a driver rating if there is a driver
    if (order.driver && driverRating === 0) {
      Alert.alert('Rate the driver', 'Please give the driver a star rating before submitting.');
      return;
    }

    // Require at least one product rating
    const ratedProducts = Object.keys(productRatings).filter((k) => productRatings[k] > 0);
    if (ratedProducts.length === 0) {
      Alert.alert('Rate products', 'Please rate at least one product.');
      return;
    }

    Alert.alert(
      'Submit Review',
      'Confirm delivery and submit your ratings?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            setSubmitting(true);
            try {
              // 1. Confirm delivery (also sends driver rating to backend)
              await ordersAPI.confirmDelivery(orderId, {
                driverRating: driverRating > 0 ? driverRating : undefined,
                driverComment: driverComment.trim() || undefined,
              });

              // 2. Submit product reviews in parallel (ignore individual failures)
              await Promise.allSettled(
                ratedProducts.map((productId) =>
                  productsAPI.submitReview(productId, {
                    rating: productRatings[productId],
                    comment: productComments[productId]?.trim() || undefined,
                  })
                )
              );

              // 3. Build review summary to display on OrderDetailScreen
              const productNameMap: Record<string, string> = {};
              for (const item of order!.items) {
                productNameMap[item.variant.product.id] = item.variant.product.name;
              }
              const submittedReview: SubmittedReview = {
                driverRating: driverRating > 0 ? driverRating : undefined,
                driverComment: driverComment.trim() || undefined,
                productReviews: ratedProducts.map((productId) => ({
                  productId,
                  productName: productNameMap[productId] ?? '',
                  rating: productRatings[productId],
                  comment: productComments[productId]?.trim() || undefined,
                })),
              };

              navigation.navigate('OrderDetail', { orderId, submittedReview });
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || 'Submission failed. Please try again.');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!order) return null;

  // Deduplicate products across order items
  const productMap: Record<string, { id: string; name: string; image?: string }> = {};
  for (const item of order.items) {
    const p = item.variant.product;
    if (!productMap[p.id]) {
      productMap[p.id] = { id: p.id, name: p.name, image: p.images?.[0] };
    }
  }
  const products = Object.values(productMap);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={styles.headerCard}>
        <Text style={styles.headerIcon}>✅</Text>
        <Text style={styles.headerTitle}>Confirm Your Delivery</Text>
        <Text style={styles.headerSub}>Order #{order.orderNumber}</Text>
        <Text style={styles.headerNote}>
          By submitting, you confirm that you received your order and agree to share your ratings.
        </Text>
      </View>

      {/* ── Driver Rating ───────────────────────────────────────────────────── */}
      {order.driver && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚗  Rate Your Driver</Text>
          <View style={styles.driverRow}>
            <View style={styles.driverAvatar}>
              <Text style={styles.driverAvatarText}>
                {order.driver.fullName?.charAt(0)?.toUpperCase() ?? '?'}
              </Text>
            </View>
            <Text style={styles.driverName}>{order.driver.fullName}</Text>
          </View>
          <StarRating value={driverRating} onChange={setDriverRating} />
          {driverRating > 0 && (
            <Text style={styles.ratingLabel}>
              {['', 'Very Poor', 'Poor', 'Okay', 'Good', 'Excellent!'][driverRating]}
            </Text>
          )}
          <TextInput
            style={styles.commentInput}
            placeholder="Add a comment about the driver (optional)"
            placeholderTextColor={Colors.textLight}
            value={driverComment}
            onChangeText={setDriverComment}
            multiline
            maxLength={300}
          />
        </View>
      )}

      {/* ── Product Ratings ─────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📦  Rate Your Products</Text>
        {products.map((product) => (
          <View key={product.id} style={styles.productCard}>
            <View style={styles.productHeader}>
              {product.image ? (
                <Image source={{ uri: product.image }} style={styles.productImage} />
              ) : (
                <View style={[styles.productImage, styles.productImagePlaceholder]}>
                  <Text style={{ fontSize: 22 }}>🌿</Text>
                </View>
              )}
              <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
            </View>
            <StarRating
              value={productRatings[product.id] ?? 0}
              onChange={(v) => setProductRatings((prev) => ({ ...prev, [product.id]: v }))}
              size={32}
            />
            {(productRatings[product.id] ?? 0) > 0 && (
              <TextInput
                style={styles.commentInput}
                placeholder="Share your experience (optional)"
                placeholderTextColor={Colors.textLight}
                value={productComments[product.id] ?? ''}
                onChangeText={(text) => setProductComments((prev) => ({ ...prev, [product.id]: text }))}
                multiline
                maxLength={300}
              />
            )}
          </View>
        ))}
      </View>

      {/* ── Submit ──────────────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={submitting}>
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitBtnText}>Confirm Delivery &amp; Submit Reviews</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.skipBtn} onPress={() => navigation.navigate('OrderDetail', { orderId })}>  
        <Text style={styles.skipBtnText}>Skip for now</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },

  // Header card
  headerCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headerIcon: { fontSize: 48, marginBottom: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  headerSub: { fontSize: 14, color: Colors.textSecondary, marginBottom: 8 },
  headerNote: { fontSize: 12, color: Colors.textLight, textAlign: 'center', lineHeight: 18 },

  // Section
  section: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 12 },

  // Driver
  driverRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  driverAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  driverAvatarText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  driverName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },

  // Stars
  starRow: { flexDirection: 'row', marginVertical: 8 },
  star: { marginRight: 4 },
  ratingLabel: { fontSize: 13, fontWeight: '600', color: Colors.accent, marginBottom: 4 },

  // Comment
  commentInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    fontSize: 14,
    color: Colors.textPrimary,
    minHeight: 60,
    textAlignVertical: 'top',
    backgroundColor: Colors.surfaceAlt,
  },

  // Product card
  productCard: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 14,
    marginTop: 10,
  },
  productHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  productImage: { width: 48, height: 48, borderRadius: 8, marginRight: 10 },
  productImagePlaceholder: {
    backgroundColor: Colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productName: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.textPrimary },

  // Submit
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: Colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  skipBtn: { alignItems: 'center', paddingVertical: 8 },
  skipBtnText: { color: Colors.textSecondary, fontSize: 14 },
});
