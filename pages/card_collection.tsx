import { createRoute } from '@granite-js/react-native';
import React from 'react';
import { FlatList, Text, View } from 'react-native';
import { styles } from '../assets/sytle/card_collection.style';
import {
  elementLabels,
  gradeLabels,
  useGameCache,
} from '../src/features/game-cache';

export const Route = createRoute('/card_collection', {
  validateParams: (params) => params,
  component: CardCollectionPage,
});

function CardCollectionPage() {
  const game = useGameCache();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📜 원소 도감</Text>

      <FlatList
        data={game.collection}
        keyExtractor={(item) => item.templateId}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.name}>
              {item.name} · {elementLabels[item.element]} ·{' '}
              {gradeLabels[item.grade]}
            </Text>
            <Text style={[styles.status, styles.collectedStatus]}>
              수집 완료 · 최고 {item.highestEnhancementLevel}강
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>등록된 도감 정보가 없습니다.</Text>
          </View>
        }
      />
    </View>
  );
}
