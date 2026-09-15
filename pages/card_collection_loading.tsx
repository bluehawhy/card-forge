import { createRoute, useNavigation } from '@granite-js/react-native';
import React, { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { styles } from '../assets/sytle/index.style';
import { BannerAd } from '../src/components/banner-ad';

export const Route = createRoute('/card_collection_loading', {
  validateParams: (params) => params,
  component: CardCollectionLoadingPage,
});

export function CardCollectionLoadingPage() {
  const navigation = useNavigation();

  useEffect(() => {
    const collectionTimer = setTimeout(() => {
      // biome-ignore lint/suspicious/noExplicitAny: Granite generated route types are stale until the next build.
      navigation.replace('/card_collection' as any);
    }, 5_000);

    return () => clearTimeout(collectionTimer);
  }, [navigation]);

  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityLabel="카드 도감으로 이동하는 중"
      style={styles.loadingScreen}
    >
      <View pointerEvents="none" style={styles.loadingIcon}>
        <View style={[styles.loadingCard, styles.loadingCardLeft]} />
        <View style={[styles.loadingCard, styles.loadingCardRight]} />
        <View style={[styles.loadingCard, styles.loadingCardFront]}>
          <Text style={styles.loadingCardMark}>✦</Text>
        </View>
      </View>
      <Text style={styles.loadingTitle}>카드 도감으로 이동하는 중…</Text>
      <ActivityIndicator color="#D5B87F" size="small" />
      <View style={styles.loadingBanner}>
        <BannerAd />
      </View>
    </View>
  );
}
