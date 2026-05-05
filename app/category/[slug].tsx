import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { AdCard, EmptyState, Header } from '@/components';
import { useAds } from '@/hooks/useAds';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - Spacing.lg * 2 - Spacing.sm) / 2;

export default function CategoryScreen() {
  const { categoryId, name } = useLocalSearchParams<{ categoryId: string; name: string }>();
  const { ads, loading, load } = useAds();
  const { colors } = useTheme();
  const { t, language } = useLanguage();

  useEffect(() => { if (categoryId) load({ categoryId }); }, [categoryId]);

  const renderAd = useCallback(({ item, index }: any) => (
    <View style={[styles.adWrapper, index % 2 === 0 ? { marginRight: Spacing.sm / 2 } : { marginLeft: Spacing.sm / 2 }]}>
      <AdCard ad={item} width={CARD_WIDTH} />
    </View>
  ), []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title={decodeURIComponent(name ?? t.browseCategories)} showBack />
      <FlatList
        data={ads}
        keyExtractor={item => item.id}
        numColumns={2}
        renderItem={renderAd}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={loading}
        onRefresh={() => categoryId && load({ categoryId })}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="search-off"
              title={t.noListingsInCategory}
              subtitle={t.noListingsInCategorySub}
            />
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: Spacing.lg, paddingBottom: 24 },
  adWrapper: { flex: 1, marginBottom: Spacing.sm },
});
