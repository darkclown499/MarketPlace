import React, { memo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { FontSize, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  rightIcon?: keyof typeof MaterialIcons.glyphMap;
  onRightPress?: () => void;
}

export const Header = memo(function Header({ title, showBack, rightIcon, onRightPress }: HeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8, backgroundColor: colors.primary }]}>
      {showBack ? (
        <Pressable style={styles.iconBtn} onPress={() => router.back()} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </Pressable>
      ) : <View style={styles.iconBtn} />}

      <Text style={styles.title} numberOfLines={1}>{title}</Text>

      {rightIcon && onRightPress ? (
        <Pressable style={styles.iconBtn} onPress={onRightPress} hitSlop={8}>
          <MaterialIcons name={rightIcon} size={24} color="#fff" />
        </Pressable>
      ) : <View style={styles.iconBtn} />}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
