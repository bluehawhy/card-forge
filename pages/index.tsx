import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

export default function HomePage() {
  // TODO: 유저스토어 구현 후 연결
  const user = {
    nickname: '모험가',
    crystals: 0,
    darkAshes: 0,
  };

  const handleNavigate = (path: string) => {
    console.log(`[이동 시도]: ${path}`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 상단 프로필 & 재화 요약 */}
      <View style={styles.headerCard}>
        <Text style={styles.welcomeText}>안녕하세요, {user?.nickname ?? '모험가'}님!</Text>
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceText}>보유 결정: {user?.crystals?.toLocaleString() ?? 0} 개</Text>
          <Text style={styles.balanceText}>검은 재: {user?.darkAshes?.toLocaleString() ?? 0} 개</Text>
        </View>
      </View>

      {/* 대시보드 메뉴 바로가기 */}
      <Text style={styles.sectionTitle}>빠른 이동</Text>
      <View style={styles.grid}>
        <TouchableOpacity style={styles.menuButton} onPress={() => handleNavigate('/cards')}>
          <Text style={styles.menuText}>🎴 보관함</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuButton} onPress={() => handleNavigate('/forge')}>
          <Text style={styles.menuText}>⚒️ 강화소</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuButton} onPress={() => handleNavigate('/packs')}>
          <Text style={styles.menuText}>🎁 카드팩</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuButton} onPress={() => handleNavigate('/exchange')}>
          <Text style={styles.menuText}>🪙 교환소</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F6' },
  content: { padding: 16 },
  headerCard: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16, marginBottom: 20 },
  welcomeText: { fontSize: 20, fontWeight: 'bold', color: '#191F28', marginBottom: 12 },
  balanceContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  balanceText: { fontSize: 14, color: '#4E5968' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#191F28', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  menuButton: { width: '48%', backgroundColor: '#FFFFFF', padding: 20, borderRadius: 12, alignItems: 'center' },
  menuText: { fontSize: 16, fontWeight: '600', color: '#333D4B' },
});