import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { FontSize, Spacing, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface EmptyStateProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  subtitle?: string;
}

export const EmptyState = memo(function EmptyState({ icon, title, subtitle }: EmptyStateProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <View style={[styles.iconOuter, { backgroundColor: colors.primaryGhost }]}>
        <View style={[styles.iconInner, { backgroundColor: colors.surfaceTint }]}>
          <MaterialIcons name={icon} size={36} color={colors.primary} />
        </View>
      </View>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl },
  iconOuter: {
    width: 100, height: 100, borderRadius: 50,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  iconInner: {
    width: 70, height: 70, borderRadius: 35,
    alignItems: 'center', justifyContent: 'center',
  },
  title: {
    fontSize: FontSize.lg, fontWeight: '700',
    textAlign: 'center', marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.sm, textAlign: 'center',
    lineHeight: 21, maxWidth: 260,
  },
});
