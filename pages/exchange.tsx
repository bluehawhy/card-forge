import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { createRoute, useNavigation } from '@granite-js/react-native';

export const Route = createRoute('/exchange', {
  validateParams: (params) => params,
  component: ExchangePage,
});

function ExchangePage() {
  const navigation = useNavigation();
  const [crystalBalance, setCrystalBalance] = useState(6000); // 사용자 결정 잔액

  const EXCHANGE_COST = 3000;

  const handleExchange = () => {
    if (crystalBalance < EXCHANGE_COST) {
      Alert.alert('잔액 부족', '교환에 필요한 결정이 부족합니다.');
      return;
    }

    Alert.alert('교환 확인', '3,000 결정을 1 토스 포인트로 교환하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { 
        text: '교환하기', 
        onPress: () => {
          // TODO: 교환 API 호출 처리
          setCrystalBalance((prev) => prev - EXCHANGE_COST);
          Alert.alert('성공', '1 토스 포인트로 교환되었습니다.');
        } 
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.title}>🪙 포인트 교환소</Text>
        
        <View style={styles.infoCard}>
          <Text style={styles.rateTitle}>현재 적용 환율</Text>
          <Text style={styles.rateText}>3,000 강화의 결정 = 1 토스 포인트</Text>
          <Text style={styles.subText}>보유 결정: {crystalBalance.toLocaleString()} 개</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.exchangeButton} onPress={handleExchange}>
        <Text style={styles.buttonText}>1 토스 포인트로 교환</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F6', padding: 16, justifyContent: 'space-between' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#191F28' },
  infoCard: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16, marginTop: 16 },
  rateTitle: { fontSize: 14, color: '#8B95A1' },
  rateText: { fontSize: 18, fontWeight: 'bold', color: '#3182F6', marginVertical: 8 },
  subText: { fontSize: 14, color: '#4E5968' },
  exchangeButton: { backgroundColor: '#3182F6', padding: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});