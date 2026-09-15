import { createRoute } from '@granite-js/react-native';
import React from 'react';
import { View } from 'react-native';
import { styles } from '../assets/sytle/card_collection.style';
import { BannerAd } from '../src/components/banner-ad';
import { CardCollectionView } from '../src/components/card-collection-modal';
import { useGameCache } from '../src/features/game-cache';

export const Route = createRoute('/card_collection', {
  validateParams: (params) => params,
  component: CardCollectionPage,
});

function CardCollectionPage() {
  const game = useGameCache();

  return (
    <View style={styles.container}>
      <CardCollectionView
        collection={game.collection}
        headerAccessory={<BannerAd />}
      />
    </View>
  );
}
