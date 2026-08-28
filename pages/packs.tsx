import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { createRoute, useNavigation } from '@granite-js/react-native';
import { packService } from '../src/services/packService';

export const Route = createRoute('/packs', {
  validateParams: (params) => params,
  component: PacksPage,
});

function PacksPage() {
  const navigation = useNavigation();
  const [loadingPack, setLoadingPack] = useState<string | null>(null);

  const handleOpenPack = async (packType: string) => {
    setLoadingPack(packType);
    try {
      const rewardCards = await packService.openPack(packType);
      Alert.alert('카드 획득!', `${rewardCards.length}장의 카드를 획득했습니다.`, [
        {
          text: '보관함 확인',
          onPress: () => navigation.navigate('/cards' as any),
        },
        { text: '확인', style: 'default' },
      ]);
    } catch (e) {
      Alert.alert('오류', '카드팩을 개봉하지 못했습니다.');
    } finally {
      setLoadingPack(null);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎁 카드팩 상점</Text>

      <View style={styles.packList}>
        <TouchableOpacity 
          style={[styles.packCard, loadingPack === 'NORMAL' && styles.disabled]} 
          onPress={() => handleOpenPack('NORMAL')}
          disabled={loadingPack !== null}
        >
          <View style={styles.packInfo}>
            <Text style={styles.packName}>일반 원소 팩</Text>
            <Text style={styles.packDesc}>1~3스타 원소 카드 등장</Text>
          </View>
          {loadingPack === 'NORMAL' && <ActivityIndicator color="#3182F6" />}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.packCard, loadingPack === 'RARE' && styles.disabled]} 
          onPress={() => handleOpenPack('RARE')}
          disabled={loadingPack !== null}
        >
          <View style={styles.packInfo}>
            <Text style={styles.packName}>고급 원소 팩</Text>
            <Text style={styles.packDesc}>3~5스타 원소 카드 확정</Text>
          </View>
          {loadingPack === 'RARE' && <ActivityIndicator color="#3182F6" />}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F6', padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#191F28', marginBottom: 16 },
  packList: { gap: 12 },
  packCard: { 
    backgroundColor: '#FFFFFF', 
    padding: 20, 
    borderRadius: 14, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  disabled: { opacity: 0.6 },
  packInfo: { flex: 1 },
  packName: { fontSize: 18, fontWeight: 'bold', color: '#191F28' },
  packDesc: { fontSize: 14, color: '#6B7684', marginTop: 4 },
});