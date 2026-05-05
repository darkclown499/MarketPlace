import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Radius, FontSize, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface BadgeProps {
  label: string;
  color?: string;
  textColor?: string;
}

export const Badge = memo(function Badge({ label, color, textColor }: BadgeProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.badge, { backgroundColor: color ?? colors.accentLight }]}>
      <Text style={[styles.text, { color: textColor ?? colors.accent }]}>{label}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  badge: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  text: { fontSize: FontSize.xs, fontWeight: '600' },
});
