import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, Dimensions, FlatList,
  Platform, StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { Spacing, FontSize, Radius, Shadow } from '@/constants/theme';
import type { Language } from '@/constants/i18n';

const { width } = Dimensions.get('window');
export const ONBOARDING_SEEN_KEY = '@souq_onboarding_seen';

const SLIDES = [
  {
    id: '1',
    iconName: 'storefront' as const,
    iconBg: '#0A6E5C',
    titleKey: 'onboarding1Title' as const,
    subKey: 'onboarding1Sub' as const,
  },
  {
    id: '2',
    iconName: 'local-offer' as const,
    iconBg: '#F59E0B',
    titleKey: 'onboarding2Title' as const,
    subKey: 'onboarding2Sub' as const,
  },
  {
    id: '3',
    iconName: 'groups' as const,
    iconBg: '#0A6E5C',
    titleKey: 'onboarding3Title' as const,
    subKey: 'onboarding3Sub' as const,
    isLogo: true,
  },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const { t, language, setLanguage } = useLanguage();

  // ── Current slide index (source of truth) ─────────────────────────────────
  const [currentIndex, setCurrentIndex] = useState(0);

  // ── Lock flag: prevents double-tap race on rapid presses ──────────────────
  const isNavigatingRef = useRef(false);

  // ── Ref to FlatList for programmatic scroll ────────────────────────────────
  const flatListRef = useRef<FlatList>(null);

  // Reset lock whenever index changes (user swiped or tapped Next)
  useEffect(() => {
    isNavigatingRef.current = false;
  }, [currentIndex]);

  // ── Persist flag + navigate away — wrapped in try/catch ───────────────────
  const finish = useCallback(async (source: string) => {
    // Lock immediately to prevent double-invocation
    if (isNavigatingRef.current) {
      console.log(`[Onboarding] finish(${source}) -> BLOCKED (already navigating)`);
      return;
    }
    isNavigatingRef.current = true;
    console.log(`[Onboarding] finish(${source}) -> TRIGGERED`);

    try {
      await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, '1');
      console.log(`[Onboarding] finish(${source}) -> AsyncStorage.setItem SUCCESS`);
    } catch (err) {
      // Storage failure is non-blocking — navigate anyway so user is not frozen
      console.log(`[Onboarding] finish(${source}) -> AsyncStorage.setItem FAILED (continuing):`, err);
    }

    // Replace so back-button cannot return to onboarding
    router.replace('/beta-warning');
    console.log(`[Onboarding] finish(${source}) -> router.replace('/beta-warning') CALLED`);
  }, [router]);

  // ── Next / Get Started handler ────────────────────────────────────────────
  const goNext = useCallback(() => {
    console.log(`[Onboarding] goNext -> currentIndex=${currentIndex}, isNavigating=${isNavigatingRef.current}`);

    // Debounce: ignore rapid repeated taps
    if (isNavigatingRef.current) {
      console.log('[Onboarding] goNext -> BLOCKED (lock active)');
      return;
    }

    if (currentIndex < SLIDES.length - 1) {
      const nextIndex = currentIndex + 1;
      console.log(`[Onboarding] goNext -> scrolling to index ${nextIndex}`);
      // Lock until scroll settles (onMomentumScrollEnd resets it via index change)
      isNavigatingRef.current = true;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
    } else {
      console.log('[Onboarding] goNext -> last slide, calling finish()');
      finish('next-button');
    }
  }, [currentIndex, finish]);

  // ── Language switch — must NOT reset slide index ───────────────────────────
  const handleLangSwitch = useCallback((lang: Language) => {
    console.log(`[Onboarding] languageSwitch -> ${lang}, currentIndex=${currentIndex}`);
    setLanguage(lang);
    // Re-scroll to current index after language re-render to prevent drift
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToIndex({ index: currentIndex, animated: false });
    });
  }, [setLanguage, currentIndex]);

  // ── Swipe detection via onMomentumScrollEnd ────────────────────────────────
  const handleScrollEnd = useCallback((e: any) => {
    const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
    if (newIndex !== currentIndex) {
      console.log(`[Onboarding] onSwipe -> index ${currentIndex} -> ${newIndex}`);
      setCurrentIndex(newIndex);
    }
  }, [currentIndex]);

  // ── Dot press ─────────────────────────────────────────────────────────────
  const handleDotPress = useCallback((i: number) => {
    console.log(`[Onboarding] dotPress -> index ${i}`);
    flatListRef.current?.scrollToIndex({ index: i, animated: true });
    setCurrentIndex(i);
  }, []);

  const isLast = currentIndex === SLIDES.length - 1;
  const currentSlide = SLIDES[currentIndex];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      {/* ── TOP BAR: Language + Skip ─────────────────────────────────────── */}
      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.langRow}>
          {(['en', 'ar'] as Language[]).map(lang => (
            <Pressable
              key={lang}
              style={[
                styles.langPill,
                {
                  backgroundColor: language === lang ? colors.primary : colors.surface,
                  borderColor: language === lang ? colors.primary : colors.border,
                },
              ]}
              onPress={() => handleLangSwitch(lang)}
              hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
              accessibilityLabel={`Switch to ${lang === 'en' ? 'English' : 'Arabic'}`}
            >
              <Text style={[styles.langPillText, { color: language === lang ? '#fff' : colors.textSecondary }]}>
                {lang === 'en' ? 'English' : 'العربية'}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={() => {
            console.log('[Onboarding] skipButton -> PRESSED');
            finish('skip-button');
          }}
          hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
          accessibilityLabel="Skip onboarding"
        >
          <Text style={[styles.skipText, { color: colors.textMuted }]}>{t.skip}</Text>
        </Pressable>
      </View>

      {/* ── SLIDES ───────────────────────────────────────────────────────── */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        scrollEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        decelerationRate="fast"
        onMomentumScrollEnd={handleScrollEnd}
        // Prevent FlatList from intercepting Next button touch events
        keyboardShouldPersistTaps="handled"
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={[styles.illustrationWrap, { backgroundColor: colors.surface, ...Shadow.lg }]}>
              {(item as any).isLogo ? (
                <>
                  <View style={[styles.logoContainer, { backgroundColor: '#0A6E5C10' }]}>
                    <Image
                      source={require('@/assets/images/plankton-logo.png')}
                      style={styles.logoImage}
                      contentFit="contain"
                      transition={300}
                    />
                  </View>
                  <View style={[styles.logoTagWrap, { backgroundColor: colors.primary }]}>
                    <Text style={styles.logoTagText}>Plankton Team</Text>
                  </View>
                </>
              ) : (
                <>
                  <View style={[styles.illustrationCircle, { backgroundColor: item.iconBg + '18' }]}>
                    <View style={[styles.illustrationInner, { backgroundColor: item.iconBg }]}>
                      <MaterialIcons name={item.iconName} size={52} color="#fff" />
                    </View>
                  </View>
                  <View style={[styles.ring1, { borderColor: item.iconBg + '25' }]} />
                  <View style={[styles.ring2, { borderColor: item.iconBg + '15' }]} />
                </>
              )}
            </View>

            <View style={styles.textArea}>
              <Text style={[styles.slideTitle, { color: colors.textPrimary }]}>
                {t[item.titleKey]}
              </Text>
              <Text style={[styles.slideSub, { color: colors.textSecondary }]}>
                {t[item.subKey]}
              </Text>
            </View>
          </View>
        )}
      />

      {/* ── PAGINATION DOTS ──────────────────────────────────────────────── */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <Pressable
            key={i}
            onPress={() => handleDotPress(i)}
            hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
            accessibilityLabel={`Go to slide ${i + 1}`}
          >
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: i === currentIndex ? currentSlide.iconBg : colors.border,
                  width: i === currentIndex ? 28 : 8,
                },
              ]}
            />
          </Pressable>
        ))}
      </View>

      {/* ── NEXT / GET STARTED BUTTON ─────────────────────────────────────
           Wrapped in extra padding to guarantee it clears Android nav bar
           and any system gesture zones at the bottom.
      ──────────────────────────────────────────────────────────────────── */}
      <View
        style={[
          styles.actions,
          {
            // Always ensure button is above system navigation area
            paddingBottom: Math.max(insets.bottom, 16) + Spacing.lg,
          },
        ]}
        // pointerEvents="box-none" lets touch pass through wrapper but not button
        pointerEvents="box-none"
      >
        <Pressable
          style={({ pressed }) => [
            styles.nextBtn,
            {
              backgroundColor: currentSlide.iconBg,
              opacity: pressed ? 0.88 : 1,
              ...Shadow.colored,
            },
          ]}
          onPress={goNext}
          // Generous hit area prevents missed taps near screen edges
          hitSlop={{ top: 8, bottom: 8, left: 0, right: 0 }}
          accessibilityLabel={isLast ? 'Get Started' : 'Next slide'}
          accessibilityRole="button"
        >
          <Text style={styles.nextBtnText}>
            {isLast ? t.getStarted : t.next}
          </Text>
          <MaterialIcons
            name={isLast ? 'arrow-forward' : 'chevron-right'}
            size={20}
            color="#fff"
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    zIndex: 10,
  },
  langRow: { flexDirection: 'row', gap: Spacing.sm },
  langPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    minHeight: 44,          // iOS minimum touch target
    alignItems: 'center',
    justifyContent: 'center',
  },
  langPillText: { fontSize: FontSize.sm, fontWeight: '600' },
  skipText: { fontSize: FontSize.sm, fontWeight: '600', minHeight: 44, textAlignVertical: 'center', lineHeight: 44 },

  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.xl,
  },
  illustrationWrap: {
    width: width * 0.72,
    height: width * 0.72,
    borderRadius: Radius.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  illustrationCircle: {
    width: width * 0.5,
    height: width * 0.5,
    borderRadius: width * 0.25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationInner: {
    width: width * 0.36,
    height: width * 0.36,
    borderRadius: width * 0.18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring1: {
    position: 'absolute',
    width: width * 0.62,
    height: width * 0.62,
    borderRadius: width * 0.31,
    borderWidth: 1.5,
  },
  ring2: {
    position: 'absolute',
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: width * 0.35,
    borderWidth: 1,
  },

  // Logo slide
  logoContainer: {
    width: width * 0.58,
    height: width * 0.38,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    padding: 16,
  },
  logoImage: { width: '100%', height: '100%' },
  logoTagWrap: {
    position: 'absolute',
    bottom: 14,
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  logoTagText: { color: '#fff', fontSize: FontSize.sm, fontWeight: '700', letterSpacing: 0.3 },

  textArea: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  slideTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  slideSub: {
    fontSize: FontSize.md,
    textAlign: 'center',
    lineHeight: 24,
  },

  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingBottom: Spacing.lg,
    minHeight: 32,
  },
  dot: {
    height: 8,
    borderRadius: Radius.full,
  },

  actions: {
    paddingHorizontal: Spacing.lg,
    // Elevate above any gesture-intercept layer
    zIndex: 20,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: Radius.xl,
    paddingVertical: 18,
    // Minimum 48dp height satisfies Android touch target requirement
    minHeight: 58,
  },
  nextBtnText: {
    color: '#fff',
    fontSize: FontSize.lg,
    fontWeight: '800',
  },
});
