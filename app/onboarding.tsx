import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, Dimensions, FlatList, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { Spacing, FontSize, Radius, Shadow } from '@/constants/theme';
import type { Language } from '@/constants/i18n';

const { width, height } = Dimensions.get('window');
export const ONBOARDING_SEEN_KEY = '@souq_onboarding_seen';

const SLIDES = [
  {
    id: '1',
    iconName: 'storefront' as const,
    iconBg: '#0A6E5C',
    gradient: ['#0A6E5C', '#0D9176'],
    titleKey: 'onboarding1Title' as const,
    subKey: 'onboarding1Sub' as const,
  },
  {
    id: '2',
    iconName: 'local-offer' as const,
    iconBg: '#F59E0B',
    gradient: ['#D97706', '#F59E0B'],
    titleKey: 'onboarding2Title' as const,
    subKey: 'onboarding2Sub' as const,
  },
  {
    id: '3',
    iconName: 'groups' as const,
    iconBg: '#6366F1',
    gradient: ['#4F46E5', '#6366F1'],
    titleKey: 'onboarding3Title' as const,
    subKey: 'onboarding3Sub' as const,
  },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { t, language, setLanguage } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const finish = async () => {
    await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, '1');
    router.replace('/login');
  };

  const goNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
    } else {
      finish();
    }
  };

  const isLast = currentIndex === SLIDES.length - 1;
  const slide = SLIDES[currentIndex];

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Language Picker at top */}
      <View style={styles.topBar}>
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
              onPress={() => setLanguage(lang)}
            >
              <Text style={[styles.langPillText, { color: language === lang ? '#fff' : colors.textSecondary }]}>
                {lang === 'en' ? 'English' : 'العربية'}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={finish} hitSlop={10}>
          <Text style={[styles.skipText, { color: colors.textMuted }]}>{t.skip}</Text>
        </Pressable>
      </View>

      {/* Slide viewer */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        scrollEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={e => {
          const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(newIndex);
        }}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            {/* Illustration card */}
            <View style={[styles.illustrationWrap, { backgroundColor: colors.surface, ...Shadow.lg }]}>
              <View style={[styles.illustrationCircle, { backgroundColor: item.iconBg + '18' }]}>
                <View style={[styles.illustrationInner, { backgroundColor: item.iconBg }]}>
                  <MaterialIcons name={item.iconName} size={52} color="#fff" />
                </View>
              </View>
              {/* Decorative rings */}
              <View style={[styles.ring1, { borderColor: item.iconBg + '25' }]} />
              <View style={[styles.ring2, { borderColor: item.iconBg + '15' }]} />
            </View>

            <View style={styles.textArea}>
              <Text style={[styles.slideTitle, { color: colors.textPrimary }]}>{t[item.titleKey]}</Text>
              <Text style={[styles.slideSub, { color: colors.textSecondary }]}>{t[item.subKey]}</Text>
            </View>
          </View>
        )}
      />

      {/* Dots */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i === currentIndex ? colors.primary : colors.border,
                width: i === currentIndex ? 28 : 8,
              },
            ]}
          />
        ))}
      </View>

      {/* Actions */}
      <View style={[styles.actions, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <Pressable
          style={[styles.nextBtn, { backgroundColor: SLIDES[currentIndex].iconBg, ...Shadow.colored }]}
          onPress={goNext}
        >
          <Text style={styles.nextBtnText}>{isLast ? t.getStarted : t.next}</Text>
          <MaterialIcons name={isLast ? 'arrow-forward' : 'chevron-right'} size={20} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
  },
  langRow: { flexDirection: 'row', gap: Spacing.sm },
  langPill: {
    paddingHorizontal: Spacing.md, paddingVertical: 8,
    borderRadius: Radius.full, borderWidth: 1.5,
  },
  langPillText: { fontSize: FontSize.sm, fontWeight: '600' },
  skipText: { fontSize: FontSize.sm, fontWeight: '600' },

  slide: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: Spacing.xl, gap: Spacing.xl,
  },
  illustrationWrap: {
    width: width * 0.72, height: width * 0.72,
    borderRadius: Radius.xxl,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  illustrationCircle: {
    width: width * 0.5, height: width * 0.5, borderRadius: width * 0.25,
    alignItems: 'center', justifyContent: 'center',
  },
  illustrationInner: {
    width: width * 0.36, height: width * 0.36, borderRadius: width * 0.18,
    alignItems: 'center', justifyContent: 'center',
  },
  ring1: {
    position: 'absolute', width: width * 0.62, height: width * 0.62,
    borderRadius: width * 0.31, borderWidth: 1.5,
  },
  ring2: {
    position: 'absolute', width: width * 0.7, height: width * 0.7,
    borderRadius: width * 0.35, borderWidth: 1,
  },
  textArea: { alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md },
  slideTitle: { fontSize: FontSize.xxl, fontWeight: '800', textAlign: 'center', letterSpacing: -0.5, lineHeight: 32 },
  slideSub: { fontSize: FontSize.md, textAlign: 'center', lineHeight: 24 },

  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingBottom: Spacing.lg },
  dot: { height: 8, borderRadius: Radius.full },

  actions: { paddingHorizontal: Spacing.lg },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: Radius.xl, paddingVertical: 18,
  },
  nextBtnText: { color: '#fff', fontSize: FontSize.lg, fontWeight: '800' },
});
