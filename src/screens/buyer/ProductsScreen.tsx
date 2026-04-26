import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  Image, ActivityIndicator, RefreshControl,
} from 'react-native';
import { productsAPI } from '../../api/products';
import { cartAPI } from '../../api/cart';
import { Colors, Spacing, Radius, Typography, Shadow } from '../../utils/theme';
import type { Product, ProductCategory } from '../../types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BuyerStackParamList } from '../../navigation/BuyerNavigator';

type Props = NativeStackScreenProps<BuyerStackParamList, 'Products'>;

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

  const handleAddToCart = async (product: Product) => {
    const firstVariant = product.variants[0];
    if (!firstVariant) return;
    setAddingToCart(product.id);
    try {
      await cartAPI.addItem(firstVariant.id, 1);
    } catch {
      // silent
    } finally {
      setAddingToCart(null);
    }
  };

  const minPrice = (p: Product) =>
    p.variants.length ? Math.min(...p.variants.map(v => v.price)) : 0;

  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}>
      {item.images.length > 0 ? (
        <Image source={{ uri: item.images[0] }} style={styles.productImage} resizeMode="cover" />
      ) : (
        <View style={[styles.productImage, styles.productImagePlaceholder]}>
          <Text style={styles.productImageIcon}>🌿</Text>
        </View>
      )}
      <View style={styles.productInfo}>
        <Text style={styles.productCategory}>{item.category.replace(/_/g, ' ')}</Text>
        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.productFarm} numberOfLines={1}>
          {item.farm?.name ?? 'BioDigital BSF'}
        </Text>
        <View style={styles.productFooter}>
          <Text style={styles.productPrice}>GHS {minPrice(item).toFixed(2)}</Text>
          <TouchableOpacity
            style={[styles.addBtn, addingToCart === item.id && styles.addBtnDisabled]}
            onPress={() => handleAddToCart(item)}
            disabled={addingToCart === item.id}>
            {addingToCart === item.id ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.addBtnText}>+ Cart</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

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
          data={products}
          keyExtractor={p => p.id}
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
  productCard: { width: CARD_WIDTH, backgroundColor: Colors.surface, borderRadius: Radius.lg, marginBottom: Spacing.md, overflow: 'hidden', ...Shadow.sm },
  productImage: { width: '100%', height: 130 },
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
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyText: { ...Typography.body1, color: Colors.textSecondary },
});
