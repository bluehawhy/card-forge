import { createRoute, useNavigation } from '@granite-js/react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { enhancementService } from '../src/services/enhancementService';
import { rewardedAdService } from '../src/services/rewardedAdService';

export const Route = createRoute('/forge', {
  validateParams: (params) => params,
  component: ForgePage,
});

function ForgePage() {
  const navigation = useNavigation();
  const { cardId } = Route.useParams() as { cardId?: string };
  const [loading, setLoading] = useState(false);
  const [isAdReady, setIsAdReady] = useState(false);

  const loadAd = useCallback(async () => {
    setIsAdReady(false);
    try {
      await rewardedAdService.load();
      setIsAdReady(true);
    } catch {
      setIsAdReady(false);
    }
  }, []);

  useEffect(() => {
    void loadAd();
  }, [loadAd]);

  const handleEnhance = async () => {
    if (!cardId) {
      Alert.alert('알림', '강화할 카드를 먼저 선택해주세요.', [
        { text: '취소', style: 'cancel' },
        {
          text: '카드 선택하기',
          onPress: () => navigation.navigate('/cards' as any),
        },
      ]);
      return;
    }

    setLoading(true);
    try {
      await rewardedAdService.show();
      const result = await enhancementService.enhanceCard({ cardId });
      // result: 'SUCCESS' | 'FAIL' | 'DESTROYED'
      Alert.alert('결과', `강화 결과: ${result.status}`);
    } catch (err) {
      Alert.alert('오류', '강화 요청 중 에러가 발생했습니다.');
    } finally {
      setLoading(false);
      void loadAd();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>⚒️ 원소 강화소</Text>

      <View style={styles.forgeSlot}>
        {cardId ? (
          <Text style={styles.slotSelectedText}>선택된 카드 ID: {cardId}</Text>
        ) : (
          <TouchableOpacity
            style={styles.selectCardButton}
            onPress={() => navigation.navigate('/cards' as any)}
          >
            <Text style={styles.slotText}>강화할 카드를 선택하세요 🎴</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={[styles.enhanceButton, loading && styles.disabled]}
        onPress={handleEnhance}
        disabled={loading || !isAdReady}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>강화 시도</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F4F6',
    padding: 16,
    justifyContent: 'space-between',
  },
  title: { fontSize: 22, fontWeight: 'bold', color: '#191F28' },
  forgeSlot: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    marginVertical: 20,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  selectCardButton: { padding: 20, alignItems: 'center' },
  slotText: { fontSize: 16, color: '#3182F6', fontWeight: '600' },
  slotSelectedText: { fontSize: 16, color: '#191F28', fontWeight: 'bold' },
  enhanceButton: {
    backgroundColor: '#F04452',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabled: { backgroundColor: '#B0B8C1' },
  buttonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
});
