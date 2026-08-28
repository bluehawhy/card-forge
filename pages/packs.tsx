import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { createRoute } from '@apps-in-toss/granite';
import { packService } from '../src/services/packService';

export default createRoute({
  component: function PacksPage() {
    const handleOpenPack = async (packType: string) => {
      try {
        const rewardCards = await packService.openPack(packType);
        Alert.alert('카드 획득!', `${rewardCards.length}장의 카드를 획득했습니다.`);
      } catch (e) {
        Alert.alert('오류', '카드팩을 개봉하지 못했습니다.');
      }
    };

    return (
      <View style={styles.container}>
        <Text style={styles.title}>🎁 카드팩 상점</Text>
        <View style={styles.packList}>
          <TouchableOpacity style={styles.packCard} onPress={() => handleOpenPack('NORMAL')}>
            <Text style={styles.packName}>일반 원소 팩</Text>
            <Text style={styles.packDesc}>1~3스타 원소 카드 등장</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.packCard} onPress={() => handleOpenPack('RARE')}>
            <Text style={styles.packName}>고급 원소 팩</Text>
            <Text style={styles.packDesc}>3~5스타 원소 카드 확정</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F6', padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#191F28', marginBottom: 16 },
  packList: { gap: 12 },
  packCard: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 14 },
  packName: { fontSize: 18, fontWeight: 'bold', color: '#191F28' },
  packDesc: { fontSize: 14, color: '#6B7684', marginTop: 4 },
});