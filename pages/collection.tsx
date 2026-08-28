import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { createRoute } from '@apps-in-toss/granite';

export default createRoute({
  component: function CollectionPage() {
    const [collections, setCollections] = useState<any[]>([]);

    useEffect(() => {
      // 수집 도감 목록 로드
    }, []);

    return (
      <View style={styles.container}>
        <Text style={styles.title}>📜 원소 도감</Text>
        <FlatList
          data={collections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.status}>{item.isCollected ? '수집 완료' : '미수집'}</Text>
            </View>
          )}
        />
      </View>
    );
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F6', padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#191F28', marginBottom: 16 },
  item: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  name: { fontSize: 16, color: '#333D4B' },
  status: { fontSize: 14, color: '#8B95A1' },
});