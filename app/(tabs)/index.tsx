import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, ScrollView,
  Dimensions, RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { AdCard, EmptyState } from '@/components';
import { SkeletonGrid } from '@/components/feature/SkeletonCard';
import { InterstitialAdOverlay } from '@/components/feature/InterstitialAdOverlay';
import { useAds } from '@/hooks/useAds';
import { useCategories } from '@/hooks/useCategories';
import { useFavoriteIds } from '@/hooks/useFavorites';
import { fetchActiveBanners, Banner } from '@/services/bannersService';
import { fetchActiveInterstitials, InterstitialAd } from '@/services/interstitialService';
import { getCategoryName } from '@/services/categoriesService';
import { Ad } from '@/services/adsService';
import { Spacing, FontSize, Radius, Shadow } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/template';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - Spacing.lg * 2 - Spacing.sm) / 2;
const SPONSORED_INTERVAL = 8;

type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'boosted';

const FALLBACK_BANNERS: Banner[] = [
  { id: '1', title: 'Discover Great Deals', subtitle: 'Browse thousands of listings near you', image_url: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&q=80', link_url: '', is_active: true, position: 0, created_at: '' },
  { id: '2', title: 'Sell Your Items Fast', subtitle: 'Post a free listing in minutes', image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80', link_url: '', is_active: true, position: 1, created_at: '' },
  { id: '3', title: 'New & Used Electronics', subtitle: 'Find the best tech deals', image_url: 'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=600&q=80', link_url: '', is_active: true, position: 2, created_at: '' },
];

function injectSponsored(ads: Ad[]): (Ad | { __sponsored: true; id: string })[] {
  const result: (Ad | { __sponsored: true; id: string })[] = [];
  for (let i = 0; i < ads.length; i++) {
    result.push(ads[i]);
    if ((i + 1) % SPONSORED_INTERVAL === 0 && i + 1 < ads.length) {
      result.push({ __sponsored: true, id: `sponsored_${i}` });
    }
  }
  return result;
}

function sortAds(ads: Ad[], sortBy: SortOption): Ad[] {
  const now = Date.now();
  const copy = [...ads];
  const boostedScore = (ad: Ad) => (ad.boosted_until && new Date(ad.boosted_until).getTime() > now ? 1 : 0);

  switch (sortBy) {
    case 'price_asc':
      return copy.sort((a, b) => {
        const bd = boostedScore(b) - boostedScore(a);
        return bd !== 0 ? bd : a.price - b.price;
      });
    case 'price_desc':
      return copy.sort((a, b) => {
        const bd = boostedScore(b) - boostedScore(a);
        return bd !== 0 ? bd : b.price - a.price;
      });
    case 'boosted':
      return copy.sort((a, b) => boostedScore(b) - boostedScore(a));
    default:
      return copy.sort((a, b) => {
        const bd = boostedScore(b) - boostedScore(a);
        return bd !== 0 ? bd : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { t, language, isRTL } = useLanguage();
  const { user } = useAuth();
  const { categories } = useCategories();
  const { ads, loading, load } = useAds();
  const { ids: favIds, toggle: toggleFav } = useFavoriteIds();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [banners, setBanners] = useState<Banner[]>(FALLBACK_BANNERS);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showSortBar, setShowSortBar] = useState(false);

  const [interstitials, setInterstitials] = useState<InterstitialAd[]>([]);
  const [activeInterstitial, setActiveInterstitial] = useState<InterstitialAd | null>(null);
  const [interstitialVisible, setInterstitialVisible] = useState(false);
  const appStartTime = useRef(Date.now());
  const interstitialShown = useRef(false);

  const isAr = language === 'ar';

  useEffect(() => { load({ categoryId: selectedCategory ?? undefined }); }, [selectedCategory]);

  useEffect(() => {
    fetchActiveBanners().then(({ data }) => { if (data.length > 0) setBanners(data); });
    fetchActiveInterstitials().then(({ data }) => setInterstitials(data));
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => setFeaturedIndex(i => (i + 1) % banners.length), 3500);
    return () => clearInterval(timer);
  }, [banners.length]);

  useEffect(() => {
    if (interstitials.length === 0 || interstitialShown.current) return;
    const check = setInterval(() => {
      if (interstitialShown.current) { clearInterval(check); return; }
      const elapsed = (Date.now() - appStartTime.current) / 1000;
      const ad = interstitials[0];
      if (elapsed >= ad.show_after_seconds) {
        clearInterval(check);
        interstitialShown.current = true;
        setActiveInterstitial(ad);
        setInterstitialVisible(true);
      }
    }, 5000);
    return () => clearInterval(check);
  }, [interstitials]);

  const displayName = user?.username || user?.email?.split('@')[0] || '';
  const appTitle = isAr ? 'سوق قلقيلية' : 'Souq Qalqilya';

  const sortedAds = sortAds(ads, sortBy);
  const feedItems = injectSponsored(sortedAds);

  const SORT_OPTIONS: { key: SortOption; label: string; labelAr: string; icon: string }[] = [
    { key: 'newest', label: 'Newest', labelAr: 'الأحدث', icon: 'schedule' },
    { key: 'price_asc', label: 'Price ↑', labelAr: 'سعر ↑', icon: 'trending-up' },
    { key: 'price_desc', label: 'Price ↓', labelAr: 'سعر ↓', icon: 'trending-down' },
    { key: 'boosted', label: 'Boosted', labelAr: 'معزز', icon: 'bolt' },
  ];

  const renderItem = useCallback(({ item, index }: any) => {
    if (item.__sponsored) {
      return (
        <View style={styles.sponsoredRow}>
          <Pressable
            style={[styles.sponsoredCard, { backgroundColor: colors.surface, borderColor: colors.primary + '40', ...Shadow.sm }]}
            onPress={() => router.push('/search')}
          >
            <View style={[styles.sponsoredIconWrap, { backgroundColor: colors.primaryGhost }]}>
              <MaterialIcons name="campaign" size={20} color={colors.primary} />
            </View>
            <View style={styles.sponsoredContent}>
              <View style={[styles.sponsoredLabel, { backgroundColor: colors.primary }]}>
                <Text style={styles.sponsoredLabelText}>{t.sponsored}</Text>
              </View>
              <Text style={[styles.sponsoredTitle, { color: colors.textPrimary }]}>
                {isAr ? 'اعرض إعلانك هنا' : 'Advertise Here'}
              </Text>
              <Text style={[styles.sponsoredSub, { color: colors.textMuted }]}>
                {isAr ? 'تواصل معنا لتعزيز إعلانك' : 'Boost your listing for more visibility'}
              </Text>
            </View>
            <MaterialIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={20} color={colors.textMuted} />
          </Pressable>
        </View>
      );
    }

    const realItem = item as Ad;
    return (
      <View style={[styles.adWrapper, index % 2 === 0 ? { marginRight: Spacing.sm / 2 } : { marginLeft: Spacing.sm / 2 }]}>
        <AdCard
          ad={realItem}
          width={CARD_WIDTH}
          isFavorited={favIds.has(realItem.id)}
          onFavoritePress={user ? toggleFav : undefined}
        />
      </View>
    );
  }, [colors, language, t, isRTL, favIds, user, toggleFav]);

  const currentBanner = banners[featuredIndex] ?? banners[0];

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>

      {/* ── HEADER ── */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        {/* Top row: greeting + actions */}
        <View style={[styles.headerTop, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={styles.headerLeft}>
            {displayName ? (
              <Text style={[styles.greeting, { textAlign: isRTL ? 'right' : 'left' }]}>
                {isAr ? `مرحباً، ${displayName} 👋` : `Hi, ${displayName} 👋`}
              </Text>
            ) : (
              <Text style={[styles.greeting, { textAlign: isRTL ? 'right' : 'left' }]}>
                {isAr ? 'اكتشف العروض 🛍️' : 'Discover Deals 🛍️'}
              </Text>
            )}
            <Text style={[styles.appName, { textAlign: isRTL ? 'right' : 'left' }]}>{appTitle}</Text>
          </View>
          <View style={[styles.headerActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Pressable
              style={[styles.headerBtn, showSortBar && { backgroundColor: 'rgba(255,255,255,0.28)' }]}
              onPress={() => setShowSortBar(v => !v)}
              hitSlop={6}
            >
              <MaterialIcons name="tune" size={20} color="#fff" />
            </Pressable>
            <Pressable
              style={styles.headerBtn}
              onPress={() => router.push('/search')}
              hitSlop={6}
            >
              <MaterialIcons name="search" size={20} color="#fff" />
            </Pressable>
          </View>
        </View>

        {/* Search bar */}
        <Pressable
          style={[styles.searchBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.95)', ...Shadow.sm, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          onPress={() => router.push('/search')}
          activeOpacity={0.85}
        >
          <View style={[styles.searchIconWrap, { backgroundColor: colors.primary + '22' }]}>
            <MaterialIcons name="search" size={16} color={isDark ? 'rgba(255,255,255,0.7)' : colors.primary} />
          </View>
          <Text style={[styles.searchPlaceholder, { color: isDark ? 'rgba(255,255,255,0.5)' : colors.textMuted, textAlign: isRTL ? 'right' : 'left' }]}>
            {t.searchPlaceholder}
          </Text>
          <View style={[styles.filterChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : colors.primaryGhost }]}>
            <MaterialIcons name="filter-list" size={13} color={isDark ? 'rgba(255,255,255,0.7)' : colors.primary} />
            <Text style={[styles.filterChipText, { color: isDark ? 'rgba(255,255,255,0.7)' : colors.primary }]}>
              {isAr ? 'فلتر' : 'Filter'}
            </Text>
          </View>
        </Pressable>

        {/* Sort bar */}
        {showSortBar ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.sortBarContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            style={styles.sortBar}
          >
            {SORT_OPTIONS.map(opt => {
              const isSelected = sortBy === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  style={[styles.sortChip, {
                    backgroundColor: isSelected ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.1)',
                    borderColor: isSelected ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.2)',
                  }]}
                  onPress={() => { setSortBy(opt.key); setShowSortBar(false); }}
                >
                  <MaterialIcons name={opt.icon as any} size={12} color={isSelected ? '#fff' : 'rgba(255,255,255,0.7)'} />
                  <Text style={[styles.sortChipText, { color: isSelected ? '#fff' : 'rgba(255,255,255,0.75)', fontWeight: isSelected ? '700' : '500' }]}>
                    {isAr ? opt.labelAr : opt.label}
                  </Text>
                  {isSelected ? <MaterialIcons name="check" size={11} color="#fff" /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}
      </View>

      {/* ── CONTENT ── */}
      {loading && ads.length === 0 ? (
        <SkeletonGrid count={6} />
      ) : (
        <FlatList
          data={feedItems as any[]}
          keyExtractor={item => item.id}
          numColumns={2}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => load({ categoryId: selectedCategory ?? undefined })}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            <>
              {/* ── BANNER ── */}
              {currentBanner ? (
                <Pressable
                  style={[styles.bannerWrap, { ...Shadow.md }]}
                  onPress={() => router.push('/search')}
                  activeOpacity={0.95}
                >
                  <Image
                    source={{ uri: currentBanner.image_url }}
                    style={styles.bannerImg}
                    contentFit="cover"
                    transition={600}
                  />
                  <View style={styles.bannerOverlay} />
                  <View style={[styles.bannerContent, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                    <Text style={[styles.bannerTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                      {currentBanner.title}
                    </Text>
                    {currentBanner.subtitle ? (
                      <Text style={[styles.bannerSubtitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                        {currentBanner.subtitle}
                      </Text>
                    ) : null}
                  </View>
                  {banners.length > 1 ? (
                    <View style={styles.bannerDots}>
                      {banners.map((_, i) => (
                        <View key={i} style={[styles.bannerDot, i === featuredIndex && styles.bannerDotActive]} />
                      ))}
                    </View>
                  ) : null}
                </Pressable>
              ) : null}

              {/* ── CATEGORIES ── */}
              <View style={[styles.sectionRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t.categories}</Text>
                <Pressable
                  style={[styles.seeAllBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                  onPress={() => router.push('/(tabs)/categories')}
                >
                  <Text style={[styles.seeAllText, { color: colors.primary }]}>{t.seeAll}</Text>
                  <MaterialIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={15} color={colors.primary} />
                </Pressable>
              </View>

              <View style={styles.catOuter}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={[styles.catContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                >
                  <Pressable
                    style={[
                      styles.catChip,
                      selectedCategory === null
                        ? { backgroundColor: colors.primary, borderColor: colors.primary }
                        : { backgroundColor: colors.surface, borderColor: colors.border },
                    ]}
                    onPress={() => setSelectedCategory(null)}
                  >
                    <MaterialIcons name="apps" size={14} color={selectedCategory === null ? '#fff' : colors.textMuted} />
                    <Text style={[styles.catChipText, {
                      color: selectedCategory === null ? '#fff' : colors.textSecondary,
                      fontWeight: selectedCategory === null ? '700' : '500',
                    }]}>{t.all}</Text>
                  </Pressable>

                  {categories.map(cat => {
                    const isSelected = selectedCategory === cat.id;
                    return (
                      <Pressable
                        key={cat.id}
                        style={[
                          styles.catChip,
                          isSelected
                            ? { backgroundColor: cat.color, borderColor: cat.color }
                            : { backgroundColor: colors.surface, borderColor: colors.border },
                        ]}
                        onPress={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
                      >
                        <MaterialIcons name={cat.icon as any} size={14} color={isSelected ? '#fff' : cat.color} />
                        <Text style={[styles.catChipText, {
                          color: isSelected ? '#fff' : colors.textSecondary,
                          fontWeight: isSelected ? '700' : '500',
                        }]}>
                          {getCategoryName(cat, language)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* ── LATEST LISTINGS header ── */}
              <View style={[styles.sectionRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.sectionTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t.latestListings}</Text>
                  <View style={[styles.countPill, { backgroundColor: colors.primaryGhost }]}>
                    <Text style={[styles.countPillText, { color: colors.primary }]}>{ads.length}</Text>
                  </View>
                </View>
                {sortBy !== 'newest' ? (
                  <View style={[styles.activeSortPill, { backgroundColor: colors.primary }]}>
                    <MaterialIcons name="sort" size={11} color="#fff" />
                    <Text style={styles.activeSortText}>
                      {isAr
                        ? SORT_OPTIONS.find(s => s.key === sortBy)?.labelAr
                        : SORT_OPTIONS.find(s => s.key === sortBy)?.label}
                    </Text>
                    <Pressable onPress={() => setSortBy('newest')} hitSlop={6}>
                      <MaterialIcons name="close" size={11} color="#fff" />
                    </Pressable>
                  </View>
                ) : null}
              </View>
            </>
          }
          ListEmptyComponent={
            !loading ? (
              <EmptyState icon="storefront" title={t.noListings} subtitle={t.noListingsSub} />
            ) : null
          }
        />
      )}

      {/* ── INTERSTITIAL AD ── */}
      <InterstitialAdOverlay
        ad={activeInterstitial}
        visible={interstitialVisible}
        onClose={() => setInterstitialVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    paddingTop: Spacing.sm,
  },
  headerTop: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  headerLeft: { flex: 1 },
  greeting: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.65)',
    marginBottom: 2,
    fontWeight: '500',
  },
  appName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.6,
    lineHeight: 30,
  },
  headerActions: { gap: 8 },
  headerBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Search bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.xl,
    height: 48,
    paddingHorizontal: Spacing.sm,
    gap: 8,
  },
  searchIconWrap: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  searchPlaceholder: { flex: 1, fontSize: FontSize.sm },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: Radius.md,
  },
  filterChipText: { fontSize: FontSize.xs, fontWeight: '700' },

  // Sort bar
  sortBar: { marginTop: Spacing.sm },
  sortBarContent: { gap: Spacing.sm, paddingBottom: 2, paddingTop: 2 },
  sortChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: Radius.full, borderWidth: 1,
  },
  sortChipText: { fontSize: FontSize.xs },

  // Feed
  listContent: { padding: Spacing.lg, paddingBottom: 36 },
  adWrapper: { flex: 1, marginBottom: Spacing.sm },

  // Sponsored card
  sponsoredRow: { flex: 2, width: '100%', marginBottom: Spacing.md },
  sponsoredCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1.5,
  },
  sponsoredIconWrap: {
    width: 44, height: 44, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  sponsoredContent: { flex: 1, gap: 4 },
  sponsoredLabel: {
    borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  sponsoredLabelText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  sponsoredTitle: { fontSize: FontSize.sm, fontWeight: '700' },
  sponsoredSub: { fontSize: FontSize.xs },

  // Banner
  bannerWrap: {
    width: '100%', height: 185,
    borderRadius: Radius.xl, overflow: 'hidden',
    marginBottom: Spacing.lg, position: 'relative',
  },
  bannerImg: { width: '100%', height: '100%' },
  bannerOverlay: {
    position: 'absolute', inset: 0,
    backgroundColor: 'rgba(5,15,25,0.55)',
  },
  bannerContent: {
    position: 'absolute', bottom: Spacing.md,
    left: Spacing.md, right: Spacing.md, gap: 6,
  },
  bannerTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 3,
    borderRadius: Radius.full, alignSelf: 'flex-start',
  },
  bannerTagText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  bannerTitle: {
    fontSize: FontSize.xl, fontWeight: '800',
    color: '#fff', letterSpacing: -0.4, lineHeight: 26,
  },
  bannerSubtitle: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.72)' },
  bannerCta: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: Spacing.md, paddingVertical: 7,
    borderRadius: Radius.full, alignSelf: 'flex-start',
  },
  bannerCtaText: { color: '#fff', fontSize: FontSize.sm, fontWeight: '700' },
  bannerDots: {
    position: 'absolute', bottom: Spacing.md, right: Spacing.md,
    flexDirection: 'row', gap: 4,
  },
  bannerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.38)' },
  bannerDotActive: { backgroundColor: '#fff', width: 18, borderRadius: 3 },

  // Section
  sectionRow: {
    justifyContent: 'space-between', alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitleRow: { alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '700', letterSpacing: -0.2 },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center' },
  seeAllText: { fontSize: FontSize.sm, fontWeight: '600' },
  countPill: { borderRadius: Radius.full, paddingHorizontal: 9, paddingVertical: 3 },
  countPillText: { fontSize: FontSize.xs, fontWeight: '700' },
  activeSortPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4,
  },
  activeSortText: { color: '#fff', fontSize: FontSize.xs, fontWeight: '700' },

  // Categories
  catOuter: { marginBottom: Spacing.lg, marginHorizontal: -Spacing.lg },
  catContent: { paddingHorizontal: Spacing.lg, gap: Spacing.sm, alignItems: 'center' },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: Spacing.md, paddingVertical: 8,
    borderRadius: Radius.full, borderWidth: 1.5,
  },
  catChipText: { fontSize: FontSize.xs },
});
