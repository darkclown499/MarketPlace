import React, { memo } from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { Radius, FontSize, Spacing, Shadow } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'ghost' | 'danger' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export const Button = memo(function Button({
  label, onPress, variant = 'primary', size = 'md', loading, disabled, style,
}: ButtonProps) {
  const { colors } = useTheme();
  const isDisabled = disabled || loading;

  const variantStyle = {
    primary: { backgroundColor: colors.primary, ...Shadow.colored },
    accent:  { backgroundColor: colors.accent, ...Shadow.sm },
    outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.primary },
    ghost:   { backgroundColor: colors.primaryGhost },
    danger:  { backgroundColor: colors.error },
  }[variant];

  const labelColor = {
    primary: '#fff',
    accent:  '#fff',
    outline: colors.primary,
    ghost:   colors.primary,
    danger:  '#fff',
  }[variant];

  const sizeStyle = { sm: styles.sm, md: styles.md, lg: styles.lg }[size];
  const labelSize = { sm: styles.smLabel, md: styles.mdLabel, lg: styles.lgLabel }[size];

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variantStyle,
        sizeStyle,
        isDisabled && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading
        ? <ActivityIndicator color={labelColor} size="small" />
        : <Text style={[styles.label, labelSize, { color: labelColor }]}>{label}</Text>
      }
    </Pressable>
  );
});

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  sm: { height: 36, paddingHorizontal: Spacing.md },
  md: { height: 50, paddingHorizontal: Spacing.lg },
  lg: { height: 56, paddingHorizontal: Spacing.xl },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.88, transform: [{ scale: 0.975 }] },
  label: { fontWeight: '600', letterSpacing: 0.2 },
  smLabel: { fontSize: FontSize.sm },
  mdLabel: { fontSize: FontSize.md },
  lgLabel: { fontSize: FontSize.lg },
});
