import React, { memo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps, ViewStyle } from 'react-native';
import { Radius, FontSize, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export const Input = memo(function Input({ label, error, containerStyle, ...props }: InputProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text> : null}
      <TextInput
        style={[
          styles.input,
          {
            borderColor: error ? colors.error : focused ? colors.primary : colors.border,
            backgroundColor: colors.surface,
            color: colors.textPrimary,
          },
          props.multiline ? styles.multiline : null,
        ]}
        placeholderTextColor={colors.textMuted}
        accessibilityLabel={label}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...props}
      />
      {error ? <Text style={[styles.error, { color: colors.error }]}>⚠ {error}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.md },
  label: { fontSize: FontSize.sm, fontWeight: '600', marginBottom: 6, letterSpacing: 0.1 },
  input: {
    height: 50,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    fontSize: FontSize.md,
  },
  multiline: { height: 110, paddingTop: Spacing.sm + 2, textAlignVertical: 'top' },
  error: { fontSize: FontSize.xs, marginTop: 5, fontWeight: '500' },
});
