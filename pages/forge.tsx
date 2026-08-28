import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { createRoute } from '@apps-in-toss/granite';
import { enhancementService } from '../src/services/enhancementService';

export default createRoute({
  component: function ForgePage({ route }: any) {
    const cardId = route?.query?.cardId;
    const [loading, setLoading] = useState(false);

    const handleEnhance = async () => {
      if (!cardId) {
        Alert.alert('알림', '강화할 카드를 먼저 선택해주세요.');
        return;
      }
      setLoading(true);
      try {
        const result = await enhancementService.enhanceCard({ cardId });
        // result: 'SUCCESS' | 'FAIL' | 'DESTROYED'
        Alert.alert('결과', `강화 결과: ${result.status}`);
      } catch (err) {
        Alert.alert('오류', '강화 요청 중 에러가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    return (
      <View style={styles.container}>
        <Text style={styles.title}>⚒️ 원소 강화소</Text>
        <View style={styles.forgeSlot}>
          <Text style={styles.slotText}>{cardId ? `선택된 카드 ID: ${cardId}` : '강화할 카드를 선택하세요'}</Text>
        </View>

        <TouchableOpacity 
          style={[styles.enhanceButton, loading && styles.disabled]} 
          onPress={handleEnhance}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? '강화 진행 중...' : '강화 시도'}</Text>
        </TouchableOpacity>
      </View>
    );
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F6', padding: 16, justifyContent: 'space-between' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#191F28' },
  forgeSlot: { flex: 1, backgroundColor: '#FFFFFF', marginVertical: 20, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  slotText: { fontSize: 16, color: '#8B95A1' },
  enhanceButton: { backgroundColor: '#F04452', padding: 16, borderRadius: 12, alignItems: 'center' },
  disabled: { backgroundColor: '#B0B8C1' },
  buttonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
});