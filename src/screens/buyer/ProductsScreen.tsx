import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  Image, ActivityIndicator, RefreshControl,
} from 'react-native';
import { productsAPI } from '../../api/products';
import { cartAPI } from '../../api/cart';
import { useCartCount } from '../../store/cartStore';
import { Colors, Spacing, Radius, Typography, Shadow } from '../../utils/theme';
import { resolveImageUrl } from '../../utils/imageUtils';
import type { Product, ProductCategory } from '../../types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BuyerStackParamList } from '../../navigation/BuyerNavigator';

type Props = NativeStackScreenProps<BuyerStackParamList, 'Products'>;

interface MergedShopProduct {
  ids: string[];
  name: string;
  category: string;
  batchTag: string | null;
  totalQty: number;
  minPrice: number;
  maxPrice: number;
  images: string[];
  farm?: Product['farm'];
  averageRating: number;
  reviewCount: number;
}

function getBatchTag(p: Product): string | null {
  return p.tags.find(t => /^BATCH-/i.test(t)) ?? null;
}

function mergeProducts(products: Product[]): MergedShopProduct[] {
  const groups = new Map<string, Product[]>();
  for (const p of products) {
    const batch = getBatchTag(p);
    const key = batch ? `${batch}::${p.category}` : `solo::${p.id}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }
  return Array.from(groups.values()).map(group => {
    const first = group[0];
    const allVariants = group.flatMap(p => p.variants.filter(v => v.isActive));
    const prices = allVariants.map(v => v.price);
    const names = [...new Set(group.map(p => p.name))];
    return {
      ids: group.map(p => p.id),
      name: names.length === 1 ? names[0] : names.slice(0, 2).join(' / '),
      category: first.category,
      batchTag: getBatchTag(first),
      totalQty: allVariants.reduce((s, v) => s + v.quantity, 0),
      minPrice: prices.length ? Math.min(...prices) : 0,
      maxPrice: prices.length ? Math.max(...prices) : 0,
      images: group.flatMap(p => p.images).slice(0, 3),
      farm: first.farm,
      reviewCount: group.reduce((s, p) => s + (p.reviewCount ?? p._count?.reviews ?? 0), 0),
      averageRating: (() => {
        const rated = group.filter(p => (p.averageRating ?? 0) > 0);
        if (!rated.length) return 0;
        return rated.reduce((s, p) => s + (p.averageRating ?? 0), 0) / rated.length;
      })(),
    };
  });
}

const CATEGORIES: { label: string; value: ProductCategory | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Fertilizer', value: 'ORGANIC_FERTILIZER' },
  { label: 'Feed', value: 'PROTEIN_FEED' },
  { label: 'Larvae', value: 'DRIED_LARVAE' },
  { label: 'Oil', value: 'INSECT_OIL' },
  { label: 'Compost', value: 'COMPOST' },
  { label: 'Other', value: 'OTHER' },
];

export default function ProductsScreen({ navigation }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<ProductCategory | ''>('');
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const { incrementCart } = useCartCount();

  const load = useCallback(async (reset = false) => {
    try {
      const pg = reset ? 1 : page;
      const res = await productsAPI.getAll({
        search: search || undefined,
        category: category || undefined,
        page: pg,
        limit: 12,
      });
      if (reset) {
        setProducts(res.data);
        setPage(2);
      } else {
        setProducts(prev => [...prev, ...res.data]);
        setPage(pg + 1);
      }
      setHasMore(pg < res.pagination.pages);
    } catch {
      // keep existing data
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, category, page]);

  useEffect(() => { load(true); }, [search, category]); // eslint-disable-line react-hooks/exhaustive-deps

  const onRefresh = () => { setRefreshing(true); load(true); };

  const merged = useMemo(() => mergeProducts(products), [products]);

  const handleAddToCart = async (item: MergedShopProduct) => {
    const key = item.ids[0];
    const firstVariant = products
      .filter(p => item.ids.includes(p.id))
      .flatMap(p => p.variants)
      .find(v => v.isActive && v.quantity > 0);
    if (!firstVariant) return;
    setAddingToCart(key);
    try {
      await cartAPI.addItem(firstVariant.id, 1);
      incrementCart();
    } catch {
      // silent
    } finally {
      setAddingToCart(null);
    }
  };

  const renderProduct = ({ item }: { item: MergedShopProduct }) => {
    const key = item.ids[0];
    const isAdding = addingToCart === key;
    const outOfStock = item.totalQty === 0;
    const priceLabel = item.minPrice === item.maxPrice
      ? `GHS ${item.minPrice.toFixed(2)}`
      : `GHS ${item.minPrice.toFixed(2)} – ${item.maxPrice.toFixed(2)}`;
    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => navigation.navigate('ProductDetail', { productIds: item.ids })}>
        <View style={styles.productImageWrapper}>
          {item.images.length > 0 ? (
            <Image source={{ uri: resolveImageUrl(item.images[0]) ?? undefined }} style={styles.productImage} resizeMode="contain" />
          ) : (
            <View style={[styles.productImage, styles.productImagePlaceholder]}>
              <Text style={styles.productImageIcon}>🌿</Text>
            </View>
          )}
        </View>
        {outOfStock && (
          <View style={styles.outOfStockBadge}>
            <Text style={styles.outOfStockText}>Out of Stock</Text>
          </View>
        )}
        <View style={styles.productInfo}>
          <Text style={styles.productCategory}>{item.category.replace(/_/g, ' ')}</Text>
          <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.productFarm} numberOfLines={1}>
            {item.farm?.name ?? 'BioDigital BSF'}
          </Text>
          {item.reviewCount > 0 && (
            <View style={styles.ratingRow}>
              <Text style={styles.ratingStar}>★</Text>
              <Text style={styles.ratingValue}>{item.averageRating.toFixed(1)}</Text>
              <Text style={styles.ratingCount}>({item.reviewCount})</Text>
            </View>
          )}
          <Text style={[styles.stockLabel, outOfStock && styles.stockLabelOos]}>
            {outOfStock ? 'Out of stock' : `${item.totalQty} in stock`}
          </Text>
          <View style={styles.productFooter}>
            <Text style={styles.productPrice}>{priceLabel}</Text>
            <TouchableOpacity
              style={[styles.addBtn, (isAdding || outOfStock) && styles.addBtnDisabled]}
              onPress={() => handleAddToCart(item)}
              disabled={isAdding || outOfStock}>
              {isAdding ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.addBtnText}>+ Cart</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          placeholderTextColor={Colors.textLight}
          value={search}
          onChangeText={v => { setSearch(v); setLoading(true); }}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={styles.clearIcon}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Category filter */}
      <FlatList
        data={CATEGORIES}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={i => i.value}
        style={styles.categoryList}
        contentContainerStyle={{ paddingHorizontal: Spacing.md }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.categoryChip, category === item.value && styles.categoryChipActive]}
            onPress={() => { setCategory(item.value as ProductCategory | ''); setLoading(true); }}>
            <Text style={[styles.categoryLabel, category === item.value && styles.categoryLabelActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={Colors.primary} size="large" /></View>
      ) : (
        <FlatList
          data={merged}
          keyExtractor={p => p.ids[0]}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
          onEndReached={() => { if (hasMore) load(); }}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyIcon}>🌿</Text>
              <Text style={styles.emptyText}>No products found</Text>
            </View>
          }
          renderItem={renderProduct}
        />
      )}
    </View>
  );
}

const CARD_WIDTH = '48%';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    margin: Spacing.md, borderRadius: Radius.full, paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm, ...Shadow.sm,
  },
  searchIcon: { fontSize: 16, marginRight: Spacing.sm },
  searchInput: { flex: 1, ...Typography.body1, color: Colors.textPrimary },
  clearIcon: { color: Colors.textSecondary, fontSize: 16, padding: 4 },
  categoryList: { maxHeight: 44 },
  categoryChip: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
    borderRadius: Radius.full, backgroundColor: Colors.surface, marginRight: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border,
  },
  categoryChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  categoryLabel: { ...Typography.label, color: Colors.textSecondary },
  categoryLabelActive: { color: '#fff' },
  listContent: { padding: Spacing.md, paddingTop: Spacing.sm },
  row: { justifyContent: 'space-between' },
  productCard: { width: CARD_WIDTH, backgroundColor: Colors.surface, borderRadius: Radius.lg, marginBottom: Spacing.md, ...Shadow.sm },
  productImageWrapper: { width: '100%', overflow: 'hidden', borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg, backgroundColor: '#f0f4f0' },
  productImage: { width: '100%', height: 140, backgroundColor: '#f0f4f0' },
  productImagePlaceholder: { backgroundColor: '#e8f5e9', alignItems: 'center', justifyContent: 'center' },
  productImageIcon: { fontSize: 40 },
  productInfo: { padding: Spacing.sm },
  productCategory: { ...Typography.caption, color: Colors.primary, textTransform: 'uppercase', marginBottom: 2 },
  productName: { ...Typography.body2, color: Colors.textPrimary, fontWeight: '600', marginBottom: 4 },
  productFarm: { ...Typography.caption, color: Colors.textLight, marginBottom: Spacing.sm },
  productFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  productPrice: { ...Typography.label, color: Colors.primary, fontWeight: '700' },
  addBtn: { backgroundColor: Colors.primary, borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  addBtnDisabled: { opacity: 0.7 },
  addBtnText: { ...Typography.caption, color: '#fff', fontWeight: '600' },
  stockLabel: { ...Typography.caption, color: Colors.success, marginBottom: 4 },
  stockLabelOos: { color: Colors.error },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  ratingStar: { fontSize: 12, color: Colors.warning },
  ratingValue: { ...Typography.caption, color: Colors.warning, fontWeight: '700', marginLeft: 2, marginRight: 2 },
  ratingCount: { ...Typography.caption, color: Colors.textLight },
  outOfStockBadge: {
    position: 'absolute', top: 8, left: 8,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: Radius.sm,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  outOfStockText: { ...Typography.caption, color: '#fff', fontWeight: '600' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyText: { ...Typography.body1, color: Colors.textSecondary },
});
