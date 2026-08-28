import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { createRoute } from '@apps-in-toss/granite';
import { cardService } from '../src/services/cardService';

export default createRoute({
  component: function CardDetailPage({ route }: any) {
    const cardId = route?.query?.id;
    const [card, setCard] = useState<any>(null);

    useEffect(() => {
      if (cardId) {
        cardService.getCardDetail(cardId).then(setCard);
      }
    }, [cardId]);

    if (!card) return <View style={styles.container}><Text>로딩 중...</Text></View>;

    return (
      <View style={styles.container}>
        <View style={styles.detailCard}>
          <Text style={styles.element}>{card.element} 원소</Text>
          <Text style={styles.name}>{card.name}</Text>
          <Text style={styles.level}>강화 단계: +{card.enhanceLevel}</Text>
          <Text style={styles.description}>{card.description}</Text>
        </View>

        <TouchableOpacity 
          style={styles.forgeButton}
          onPress={() => createRoute.navigate(`/forge?cardId=${card.id}`)}
        >
          <Text style={styles.buttonText}>이 카드로 강화하러 가기</Text>
        </TouchableOpacity>
      </View>
    );
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F6', padding: 16, justifyContent: 'space-between' },
  detailCard: { backgroundColor: '#FFFFFF', padding: 24, borderRadius: 16, alignItems: 'center' },
  element: { fontSize: 14, color: '#3182F6', fontWeight: 'bold' },
  name: { fontSize: 24, fontWeight: 'bold', marginVertical: 12 },
  level: { fontSize: 18, color: '#F04452', fontWeight: 'bold', marginBottom: 12 },
  description: { fontSize: 14, color: '#6B7684', textAlign: 'center' },
  forgeButton: { backgroundColor: '#3182F6', padding: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});