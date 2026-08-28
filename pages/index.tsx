import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { createRoute, useNavigation } from '@granite-js/react-native';

// 1. 타입을 컴포넌트 외부로 이동하고 오타 수정
type AppRoutes = '/cards' | '/forge' | '/packs' | '/exchange' | '/about' | '/';

export const Route = createRoute('/', {
  validateParams: (params) => params,
  component: HomePage,
});

function HomePage() {
  const navigation = useNavigation();

  const user = {
    nickname: '모험가',
    crystals: 0,
    darkAshes: 0,
  };

  // 2. 매개변수 타입을 AppRoutes로 일치시킴
  const handleNavigate = (path: AppRoutes) => {
    navigation.navigate(path as any); // 라우트 파일 생성 전이라면 as any 추가
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <Text style={styles.welcomeText}>
          안녕하세요, {user.nickname ?? '모험가'}님!
        </Text>

        <View style={styles.balanceContainer}>
          <Text style={styles.balanceText}>
            보유 결정: {user.crystals?.toLocaleString() ?? 0} 개
          </Text>

          <Text style={styles.balanceText}>
            검은 재: {user.darkAshes?.toLocaleString() ?? 0} 개
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>빠른 이동</Text>

      <View style={styles.grid}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => handleNavigate('/cards')}
        >
          <Text style={styles.menuText}>🎴 보관함</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => handleNavigate('/forge')}
        >
          <Text style={styles.menuText}>⚒️ 강화소</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => handleNavigate('/packs')}
        >
          <Text style={styles.menuText}>🎁 카드팩</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => handleNavigate('/exchange')}
        >
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