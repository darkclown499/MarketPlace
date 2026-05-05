import React, { memo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Category, getCategoryName } from '@/services/categoriesService';
import { Radius, FontSize, Spacing, Shadow } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';

interface CategoryCardProps {
  category: Category;
  onPress: (category: Category) => void;
}

export const CategoryCard = memo(function CategoryCard({ category, onPress }: CategoryCardProps) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const displayName = getCategoryName(category, language);

  return (
    <Pressable
      style={({ pressed }) => [
        {
          backgroundColor: colors.surface,
          borderRadius: Radius.lg,
          flex: 1,
          overflow: 'hidden' as const,
          ...Shadow.sm,
        },
        pressed && { opacity: 0.82, transform: [{ scale: 0.96 }] },
      ]}
      onPress={() => onPress(category)}
    >
      <View style={[styles.stripe, { backgroundColor: category.color }]} />
      <View style={styles.body}>
        <View style={[styles.iconWrap, { backgroundColor: category.color + '1A' }]}>
          <MaterialIcons name={category.icon as any} size={26} color={category.color} />
        </View>
        <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={2}>{displayName}</Text>
        <View style={[styles.arrow, { backgroundColor: category.color + '20' }]}>
          <MaterialIcons name="arrow-forward" size={13} color={category.color} />
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  stripe: { height: 4, width: '100%' },
  body: { padding: Spacing.md, alignItems: 'center', gap: Spacing.sm },
  iconWrap: {
    width: 54, height: 54,
    borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  name: { fontSize: FontSize.sm, fontWeight: '600', textAlign: 'center', lineHeight: 17 },
  arrow: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
});
