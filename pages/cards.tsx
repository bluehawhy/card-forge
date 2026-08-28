import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { createRoute, useNavigation } from '@granite-js/react-native';
import { cardService } from '../src/services/cardService';

export const Route = createRoute('/cards', {
  validateParams: (params) => params,
  component: CardsPage,
});

function CardsPage() {
  const navigation = useNavigation();
  const [cards, setCards] = useState<any[]>([]);

  useEffect(() => {
    cardService.getUserCards().then(setCards);
  }, []);

  const handleCardPress = (id: string) => {
    // 이동하려는 상세 페이지 라우트 방식에 맞춰 호출
    navigation.navigate('/card-detail' as any, { id });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>카드 보관함</Text>
      
      <FlatList
        data={cards}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.cardItem} 
            onPress={() => handleCardPress(item.id)}
          >
            <Text style={styles.elementBadge}>{item.element}</Text>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.enhanceText}>+{item.enhanceLevel}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F6', padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#191F28', marginBottom: 16 },
  row: { justifyContent: 'space-between', marginBottom: 12 },
  cardItem: { width: '48%', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, alignItems: 'center' },
  elementBadge: { fontSize: 12, color: '#3182F6', fontWeight: 'bold' },
  cardTitle: { fontSize: 16, fontWeight: '600', marginVertical: 8 },
  enhanceText: { fontSize: 14, color: '#F04452', fontWeight: 'bold' },
});