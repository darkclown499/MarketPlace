import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, Linking, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';
import { Spacing, FontSize, Radius, Shadow } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export const BETA_SEEN_KEY = '@souq_beta_seen';
const COUNTDOWN_SECONDS = 5;

export default function BetaWarningScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();

  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [canContinue, setCanContinue] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Pulsing warning icon animation
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 700 }),
        withTiming(1, { duration: 700 }),
      ),
      -1,
      false,
    );

    intervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setCanContinue(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleContinue = async () => {
    if (!canContinue) return;
    await AsyncStorage.setItem(BETA_SEEN_KEY, '1');
    router.replace('/login');
  };

  const handleWhatsApp = () => {
    Linking.openURL('https://wa.me/972559886886').catch(() => {});
  };

  const iconAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Warning Icon ── */}
        <Animated.View style={[styles.iconOuter, iconAnimStyle]}>
          <View style={styles.iconRing}>
            <View style={styles.iconCircle}>
              <MaterialIcons name="warning" size={52} color="#F59E0B" />
            </View>
          </View>
        </Animated.View>

        {/* ── Title ── */}
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          تنبيه: نسخة تجريبية (Beta) 🚀
        </Text>

        {/* ── Message Card ── */}
        <View style={[styles.msgCard, { backgroundColor: colors.surface, ...Shadow.lg }]}>
          {/* Top colored strip */}
          <View style={[styles.cardStrip, { backgroundColor: '#F59E0B' }]} />

          <View style={styles.cardBody}>
            <Text style={[styles.msgText, { color: colors.textSecondary }]}>
              {'يا هلا بيك في تطبيق '}
              <Text style={[styles.brand, { color: colors.primary }]}>سوق قلقيلية</Text>
              {'! حابين نخبرك إن التطبيق لسا بنسخته التجريبية الأولى، يعني ممكن تلاقي شوية مشاكل تقنية بنشتغل على حلها.\n\nهدفنا نقدملك أحسن تجربة، ومساعدتك بتهمنّا! إذا واجهتك مشكلة أو عندك اقتراح تواصل معنا واتساب.'}
            </Text>

            {/* Info chips row */}
            <View style={styles.chipsRow}>
              {[
                { icon: 'construction' as const, label: 'قيد التطوير' },
                { icon: 'bug-report' as const, label: 'أخطاء محتملة' },
                { icon: 'update' as const, label: 'تحديثات مستمرة' },
              ].map(chip => (
                <View key={chip.label} style={[styles.chip, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <MaterialIcons name={chip.icon} size={13} color={colors.textMuted} />
                  <Text style={[styles.chipText, { color: colors.textMuted }]}>{chip.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ── WhatsApp Button ── */}
        <Pressable
          style={({ pressed }) => [styles.waBtn, { opacity: pressed ? 0.82 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
          onPress={handleWhatsApp}
        >
          <View style={styles.waIconWrap}>
            <MaterialIcons name="chat-bubble" size={22} color="#fff" />
          </View>
          <View style={styles.waBtnContent}>
            <Text style={styles.waBtnTitle}>تواصل معنا</Text>
            <Text style={styles.waBtnSub}>واتساب · 972559886886+</Text>
          </View>
          <View style={styles.waArrow}>
            <MaterialIcons name="arrow-forward-ios" size={14} color="rgba(255,255,255,0.8)" />
          </View>
        </Pressable>

        {/* ── Continue Button ── */}
        <Pressable
          style={[
            styles.continueBtn,
            {
              backgroundColor: canContinue ? colors.primary : '#CBD5E1',
              ...Shadow,
            },
          ]}
          onPress={handleContinue}
          disabled={!canContinue}
        >
          {canContinue ? (
            <>
              <MaterialIcons name="check-circle" size={20} color="#fff" />
              <Text style={styles.continueBtnText}>فهمت، استمرار</Text>
            </>
          ) : (
            <>
              <Text style={[styles.continueBtnText, { color: '#64748B' }]}>انتظر لحظة</Text>
              <View style={styles.countdownBubble}>
                <Text style={styles.countdownNum}>{countdown}</Text>
              </View>
            </>
          )}
        </Pressable>

        {/* Countdown hint */}
        {!canContinue ? (
          <Text style={[styles.countdownHint, { color: colors.textMuted }]}>
            سيتم تفعيل الزر خلال {countdown} ثوان
          </Text>
        ) : (
          <Text style={[styles.countdownHint, { color: colors.primary, fontWeight: '700' }]}>
            ✓ يمكنك المتابعة الآن
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.lg,
  },

  // Icon
  iconOuter: { alignItems: 'center', justifyContent: 'center' },
  iconRing: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: 'rgba(245,158,11,0.1)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(245,158,11,0.2)',
  },
  iconCircle: {
    width: 82, height: 82, borderRadius: 41,
    backgroundColor: '#FEF3C7',
    alignItems: 'center', justifyContent: 'center',
  },

  // Title
  title: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
    lineHeight: 30,
  },

  // Message card
  msgCard: {
    width: '100%',
    borderRadius: Radius.xxl,
    overflow: 'hidden',
  },
  cardStrip: { height: 5, width: '100%' },
  cardBody: { padding: Spacing.lg, gap: Spacing.md },
  msgText: {
    fontSize: FontSize.md,
    lineHeight: 26,
    textAlign: 'right',
  },
  brand: { fontWeight: '800' },

  // Chips
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  chipText: { fontSize: FontSize.xs, fontWeight: '600' },

  // WhatsApp button
  waBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: '#075E54',
    borderRadius: Radius.xl,
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    shadowColor: '#075E54',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 7,
  },
  waIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#25D366',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  waBtnContent: {
    flex: 1,
    gap: 2,
  },
  waBtnTitle: {
    color: '#fff',
    fontSize: FontSize.md,
    fontWeight: '700',
    textAlign: 'right',
  },
  waBtnSub: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: FontSize.xs,
    fontWeight: '500',
    textAlign: 'right',
  },
  waArrow: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Continue button
  continueBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.xl,
    paddingVertical: 16,
  },
  continueBtnText: {
    color: '#fff',
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  countdownBubble: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#94A3B8',
    alignItems: 'center', justifyContent: 'center',
  },
  countdownNum: {
    color: '#fff',
    fontSize: FontSize.md,
    fontWeight: '800',
    lineHeight: 20,
  },

  // Hint
  countdownHint: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    marginTop: -Spacing.sm,
  },
});
