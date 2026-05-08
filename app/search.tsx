import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, TextInput, Dimensions,
  ScrollView, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { AdCard, EmptyState } from '@/components';
import { useFavoriteIds } from '@/hooks/useFavorites';
import { useAds } from '@/hooks/useAds';
import { useCategories } from '@/hooks/useCategories';
import { getCategoryName } from '@/services/categoriesService';
import { Spacing, FontSize, Radius, Shadow } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/template';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - Spacing.lg * 2 - Spacing.sm) / 2;
const HISTORY_KEY = 'search_history_v1';
const MAX_HISTORY = 6;

type Condition = 'new' | 'used' | null;

async function loadHistory(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

async function saveToHistory(q: string, prev: string[]): Promise<string[]> {
  const trimmed = q.trim();
  if (!trimmed) return prev;
  const updated = [trimmed, ...prev.filter(h => h !== trimmed)].slice(0, MAX_HISTORY);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  return updated;
}

async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(HISTORY_KEY);
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string; categoryId?: string }>();
  const { colors } = useTheme();
  const { t, language, isRTL } = useLanguage();
  const { user } = useAuth();
  const { categories } = useCategories();
  const { ads, loading, loadingMore, hasMore, load, loadMore } = useAds();
  const { ids: favIds, toggle: toggleFav } = useFavoriteIds();

  const [query, setQuery] = useState(params.q ?? '');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(params.categoryId ?? null);
  const [maxPrice, setMaxPrice] = useState('');
  const [condition, setCondition] = useState<Condition>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadHistory().then(setHistory);
  }, []);

  useEffect(() => {
    setShowHistory(!hasSearched && query.length === 0 && history.length > 0);
  }, [query, hasSearched, history]);

  const doSearch = useCallback(async (q?: string) => {
    const searchQ = (q ?? query).trim();
    setHasSearched(true);
    setShowHistory(false);
    if (searchQ) {
      const updated = await saveToHistory(searchQ, history);
      setHistory(updated);
    }
    load({
      search: searchQ || undefined,
      categoryId: selectedCategory ?? undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      condition: condition ?? undefined,
    });
  }, [query, selectedCategory, maxPrice, condition, history, load]);

  // 300ms debounced auto-search as user types
  const handleQueryChange = useCallback((v: string) => {
    setQuery(v);
    if (!v) { setHasSearched(false); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (v.trim().length >= 2) {
      debounceRef.current = setTimeout(() => {
        setHasSearched(true);
        setShowHistory(false);
        load({
          search: v.trim(),
          categoryId: selectedCategory ?? undefined,
          maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
          condition: condition ?? undefined,
        });
      }, 300);
    }
  }, [selectedCategory, maxPrice, condition, load]);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      loadMore({
        search: query.trim() || undefined,
        categoryId: selectedCategory ?? undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
        condition: condition ?? undefined,
      });
    }
  }, [loadingMore, hasMore, query, selectedCategory, maxPrice, condition, loadMore]);

  useEffect(() => { doSearch(); }, []);

  const handleHistoryTap = useCallback((item: string) => {
    setQuery(item);
    doSearch(item);
  }, [doSearch]);

  const handleClearHistory = useCallback(async () => {
    await clearHistory();
    setHistory([]);
    setShowHistory(false);
  }, []);

  const isAr = language === 'ar';

  const renderAd = useCallback(({ item, index }: any) => (
    <View style={[styles.adWrapper, index % 2 === 0 ? { marginRight: Spacing.sm / 2 } : { marginLeft: Spacing.sm / 2 }]}>
      <AdCard
        ad={item}
        width={CARD_WIDTH}
        isFavorited={favIds.has(item.id)}
        onFavoritePress={user ? toggleFav : undefined}
      />
    </View>
  ), [favIds, user, toggleFav]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* ── HEADER ── */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <MaterialIcons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={20} color="#fff" />
        </Pressable>
        <View style={[styles.searchBar, { backgroundColor: colors.surface, ...Shadow.sm, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <MaterialIcons name="search" size={17} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
            placeholder={t.searchListings}
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={handleQueryChange}
            onSubmitEditing={() => doSearch()}
            onFocus={() => { if (!query && history.length > 0) setShowHistory(true); }}
            returnKeyType="search"
            autoFocus
          />
          {query.length > 0 ? (
            <Pressable onPress={() => { setQuery(''); setHasSearched(false); }} hitSlop={6}>
              <MaterialIcons name="close" size={16} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
        <Pressable style={[styles.searchBtn, { backgroundColor: colors.accent }]} onPress={() => doSearch()}>
          <Text style={styles.searchBtnText}>{t.goSearch}</Text>
        </Pressable>
      </View>

      {/* ── SEARCH HISTORY DROPDOWN ── */}
      {showHistory ? (
        <View style={[styles.historyPanel, { backgroundColor: colors.surface, borderColor: colors.border, ...Shadow.md }]}>
          <View style={[styles.historyHeader, { flexDirection: isRTL ? 'row-reverse' : 'row', borderBottomColor: colors.borderLight }]}>
            <MaterialIcons name="history" size={15} color={colors.textMuted} />
            <Text style={[styles.historyTitle, { color: colors.textSecondary }]}>
              {isAr ? 'البحث الأخير' : 'Recent Searches'}
            </Text>
            <Pressable onPress={handleClearHistory} hitSlop={8} style={{ marginLeft: 'auto' }}>
              <Text style={[styles.clearText, { color: colors.error }]}>{isAr ? 'مسح الكل' : 'Clear all'}</Text>
            </Pressable>
          </View>
          {history.map((item, i) => (
            <Pressable
              key={i}
              style={({ pressed }) => [
                styles.historyItem,
                { borderBottomColor: colors.borderLight, flexDirection: isRTL ? 'row-reverse' : 'row', backgroundColor: pressed ? colors.surfaceTint : 'transparent' },
              ]}
              onPress={() => handleHistoryTap(item)}
            >
              <MaterialIcons name="north-west" size={14} color={colors.textMuted} style={{ transform: [{ rotate: isRTL ? '90deg' : '0deg' }] }} />
              <Text style={[styles.historyItemText, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>{item}</Text>
              <Pressable
                onPress={() => {
                  const updated = history.filter((_, idx) => idx !== i);
                  setHistory(updated);
                  AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
                }}
                hitSlop={8}
                style={{ marginLeft: 'auto' }}
              >
                <MaterialIcons name="close" size={14} color={colors.textMuted} />
              </Pressable>
            </Pressable>
          ))}
        </View>
      ) : null}

      <FlatList
        data={ads}
        keyExtractor={item => item.id}
        numColumns={2}
        renderItem={renderAd}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        windowSize={5}
        maxToRenderPerBatch={10}
        initialNumToRender={10}
        removeClippedSubviews={true}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.loadMoreIndicator}>
              <ActivityIndicator color={colors.primary} size="small" />
            </View>
          ) : null
        }
        ListHeaderComponent={
          <View style={[styles.filterBlock, { backgroundColor: colors.surface, ...Shadow.xs }]}>
            <Text style={[styles.filterLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>{t.filterByCategory}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.chipsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Pressable
                style={[styles.chip, { backgroundColor: selectedCategory === null ? colors.primary : colors.background, borderColor: selectedCategory === null ? colors.primary : colors.border }]}
                onPress={() => setSelectedCategory(null)}
              >
                <Text style={[styles.chipText, { color: selectedCategory === null ? '#fff' : colors.textSecondary, fontWeight: selectedCategory === null ? '600' : '500' }]}>{t.all}</Text>
              </Pressable>
              {categories.map(cat => (
                <Pressable
                  key={cat.id}
                  style={[styles.chip, { backgroundColor: selectedCategory === cat.id ? colors.primary : colors.background, borderColor: selectedCategory === cat.id ? colors.primary : colors.border }]}
                  onPress={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
                >
                  <View style={[styles.catDot, { backgroundColor: selectedCategory === cat.id ? '#fff' : cat.color }]} />
                  <Text style={[styles.chipText, { color: selectedCategory === cat.id ? '#fff' : colors.textSecondary, fontWeight: selectedCategory === cat.id ? '600' : '500' }]}>
                    {getCategoryName(cat, language)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={[styles.filterLabel, { color: colors.textSecondary, marginTop: Spacing.md, textAlign: isRTL ? 'right' : 'left' }]}>{t.filterByCondition}</Text>
            <View style={[styles.conditionRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {([null, 'new', 'used'] as (Condition)[]).map(c => {
                const label = c === null ? t.all : c === 'new' ? t.conditionNew : t.conditionUsed;
                const isSelected = condition === c;
                return (
                  <Pressable
                    key={c ?? 'all'}
                    style={[styles.conditionChip, { backgroundColor: isSelected ? colors.primary : colors.background, borderColor: isSelected ? colors.primary : colors.border, flex: 1 }]}
                    onPress={() => setCondition(c)}
                  >
                    {c !== null ? <MaterialIcons name={c === 'new' ? 'fiber-new' : 'recycling'} size={14} color={isSelected ? '#fff' : colors.textMuted} /> : null}
                    <Text style={[styles.conditionChipText, { color: isSelected ? '#fff' : colors.textSecondary, fontWeight: isSelected ? '700' : '500' }]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.filterLabel, { color: colors.textSecondary, marginTop: Spacing.md, textAlign: isRTL ? 'right' : 'left' }]}>{t.maxPrice}</Text>
            <View style={[styles.priceRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TextInput
                style={[styles.priceInput, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.background, textAlign: isRTL ? 'right' : 'left' }]}
                placeholder={t.anyPrice}
                placeholderTextColor={colors.textMuted}
                value={maxPrice}
                onChangeText={setMaxPrice}
                keyboardType="numeric"
              />
              <Pressable style={[styles.applyBtn, { backgroundColor: colors.primary, ...Shadow.colored }]} onPress={() => doSearch()}>
                <MaterialIcons name="tune" size={16} color="#fff" />
                <Text style={styles.applyText}>{t.apply}</Text>
              </Pressable>
            </View>

            {hasSearched ? (
              <View style={[styles.resultsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <MaterialIcons name={loading ? 'sync' : 'format-list-bulleted'} size={14} color={colors.textMuted} />
                <Text style={[styles.resultsText, { color: colors.textMuted }]}>
                  {loading ? t.searching : `${ads.length} ${ads.length !== 1 ? t.results : t.result}`}
                </Text>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          hasSearched && !loading ? (
            <EmptyState icon="search-off" title={t.noResults} subtitle={t.noResultsSub} />
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, paddingBottom: Spacing.lg, gap: Spacing.sm },
  backBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  searchBar: { flex: 1, alignItems: 'center', borderRadius: Radius.lg, paddingHorizontal: Spacing.md, height: 46, gap: Spacing.sm },
  searchInput: { flex: 1, fontSize: FontSize.md },
  searchBtn: { borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 11 },
  searchBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.sm },
  historyPanel: { position: 'absolute', top: 80, left: 0, right: 0, zIndex: 50, borderBottomWidth: 1, borderBottomLeftRadius: Radius.xl, borderBottomRightRadius: Radius.xl, overflow: 'hidden' },
  historyHeader: { alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: 10, borderBottomWidth: 1 },
  historyTitle: { fontSize: FontSize.sm, fontWeight: '700' },
  clearText: { fontSize: FontSize.xs, fontWeight: '700' },
  historyItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.md, paddingVertical: 13, borderBottomWidth: 1 },
  historyItemText: { flex: 1, fontSize: FontSize.md },
  listContent: { padding: Spacing.lg },
  adWrapper: { flex: 1, marginBottom: Spacing.sm },
  loadMoreIndicator: { paddingVertical: 20, alignItems: 'center' },
  filterBlock: { borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.md },
  filterLabel: { fontSize: FontSize.sm, fontWeight: '700', marginBottom: Spacing.sm },
  chipsRow: { flexDirection: 'row', gap: Spacing.sm },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1.5 },
  catDot: { width: 7, height: 7, borderRadius: 4 },
  chipText: { fontSize: FontSize.sm },
  conditionRow: { flexDirection: 'row', gap: Spacing.sm },
  conditionChip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: Radius.md, borderWidth: 1.5 },
  conditionChipText: { fontSize: FontSize.sm },
  priceRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  priceInput: { flex: 1, height: 46, borderWidth: 1.5, borderRadius: Radius.md, paddingHorizontal: Spacing.md, fontSize: FontSize.md },
  applyBtn: { borderRadius: Radius.md, paddingHorizontal: Spacing.lg, height: 46, flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
  applyText: { color: '#fff', fontWeight: '700', fontSize: FontSize.sm },
  resultsRow: { marginTop: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: 6 },
  resultsText: { fontSize: FontSize.sm, fontWeight: '500' },
});
