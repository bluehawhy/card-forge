import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { createRoute, useNavigation } from '@granite-js/react-native';
// TODO: cardService 등 수집 데이터 서비스가 있다면 import
// import { cardService } from '../src/services/cardService';

export const Route = createRoute('/collection', {
  validateParams: (params) => params,
  component: CollectionPage,
});

function CollectionPage() {
  const navigation = useNavigation();
  const [collections, setCollections] = useState<any[]>([]);

  useEffect(() => {
    // TODO: 수집 도감 목록 데이터 로드 로직 구현
    // cardService.getCollections().then(setCollections);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📜 원소 도감</Text>
      
      <FlatList
        data={collections}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={[
              styles.status, 
              item.isCollected && styles.collectedStatus
            ]}>
              {item.isCollected ? '수집 완료' : '미수집'}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F6', padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#191F28', marginBottom: 16 },
  item: { 
    backgroundColor: '#FFFFFF', 
    padding: 16, 
    borderRadius: 12, 
    flexDirection: 'row', 
    justify: 'space-between', 
    alignItems: 'center',
    marginBottom: 8 
  },
  name: { fontSize: 16, color: '#333D4B', fontWeight: '500' },
  status: { fontSize: 14, color: '#8B95A1' },
  collectedStatus: { color: '#3182F6', fontWeight: 'bold' },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#8B95A1', fontSize: 14 },
});