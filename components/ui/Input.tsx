import React, { memo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps, ViewStyle, ReactNode } from 'react-native';
import { Radius, FontSize, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  rightElement?: ReactNode;
}

export const Input = memo(function Input({ label, error, containerStyle, rightElement, ...props }: InputProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text> : null}
      <View style={[
        styles.inputWrap,
        {
          borderColor: error ? colors.error : focused ? colors.primary : colors.border,
          backgroundColor: colors.surface,
        },
        props.multiline ? styles.multilineWrap : null,
      ]}>
        <TextInput
          style={[
            styles.input,
            { color: colors.textPrimary },
            props.multiline ? styles.multiline : null,
            rightElement ? { paddingRight: 44 } : null,
          ]}
          placeholderTextColor={colors.textMuted}
          accessibilityLabel={label}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
        {rightElement ? (
          <View style={styles.rightEl}>{rightElement}</View>
        ) : null}
      </View>
      {error ? <Text style={[styles.error, { color: colors.error }]}>⚠ {error}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.md },
  label: { fontSize: FontSize.sm, fontWeight: '600', marginBottom: 6, letterSpacing: 0.1 },
  inputWrap: {
    borderWidth: 1.5,
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  multilineWrap: { alignItems: 'flex-start' },
  input: {
    flex: 1,
    height: 50,
    paddingHorizontal: Spacing.md,
    fontSize: FontSize.md,
  },
  multiline: { height: 110, paddingTop: Spacing.sm + 2, textAlignVertical: 'top' },
  rightEl: {
    position: 'absolute',
    right: 0,
    top: 0, bottom: 0,
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: { fontSize: FontSize.xs, marginTop: 5, fontWeight: '500' },
});
