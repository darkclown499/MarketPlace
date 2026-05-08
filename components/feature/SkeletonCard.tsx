import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - Spacing.lg * 2 - Spacing.sm) / 2;

interface SkeletonBoxProps {
  width?: number | string;
  height: number;
  borderRadius?: number;
  style?: any;
  shimmerColor: string;
  baseColor: string;
}

function SkeletonBox({ width: w = '100%', height, borderRadius = Radius.sm, style, shimmerColor, baseColor }: SkeletonBoxProps) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: false }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: false }),
      ])
    ).start();
  }, []);

  const bg = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [baseColor, shimmerColor],
  });

  return (
    <Animated.View
      style={[{ width: w as any, height, borderRadius, backgroundColor: bg }, style]}
    />
  );
}

interface SkeletonCardProps {
  width?: number;
}

export function SkeletonCard({ width: cardWidth = CARD_WIDTH }: SkeletonCardProps) {
  const { colors } = useTheme();
  const baseColor = colors.surfaceTint;
  const shimmerColor = colors.border;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, width: cardWidth }]}>
      <SkeletonBox height={148} borderRadius={0} baseColor={baseColor} shimmerColor={shimmerColor} />
      <View style={styles.info}>
        <SkeletonBox height={13} width="90%" borderRadius={Radius.xs} baseColor={baseColor} shimmerColor={shimmerColor} style={{ marginBottom: 6 }} />
        <SkeletonBox height={11} width="60%" borderRadius={Radius.xs} baseColor={baseColor} shimmerColor={shimmerColor} style={{ marginBottom: 10 }} />
        <View style={styles.row}>
          <SkeletonBox height={18} width={64} borderRadius={Radius.full} baseColor={baseColor} shimmerColor={shimmerColor} />
          <SkeletonBox height={11} width={32} borderRadius={Radius.xs} baseColor={baseColor} shimmerColor={shimmerColor} />
        </View>
      </View>
    </View>
  );
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  const { colors } = useTheme();
  const items = Array.from({ length: count });

  return (
    <View style={[styles.grid, { padding: Spacing.lg }]}>
      {items.map((_, i) => (
        <View key={i} style={[styles.wrapper, i % 2 === 0 ? { marginRight: Spacing.sm / 2 } : { marginLeft: Spacing.sm / 2 }]}>
          <SkeletonCard />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  info: { padding: 10 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  wrapper: { flex: 1, marginBottom: Spacing.sm },
});
