import React from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
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
    level: 1,
    crystals: 0,
    darkAshes: 0,
  };

  // 2. 매개변수 타입을 AppRoutes로 일치시킴
  const handleNavigate = (path: AppRoutes) => {
    navigation.navigate(path as any); // 라우트 파일 생성 전이라면 as any 추가
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} >
      {/* ========================= 플레이어 메인 카드 ========================= /}
      <View style={styles.playerCard}>
      {/ 배경 장식 */}
      <View style={styles.backgroundCircleLarge} />
      <View style={styles.backgroundCircleSmall} />

      {/* 왼쪽 플레이어 정보 */}
      <View style={styles.playerInfo}>
        <Text style={styles.gameTitle}>CARD FORGE</Text>

        <Text style={styles.nickname}>
          {user.nickname ?? '모험가'}
        </Text>

        <Text style={styles.levelText}>
          Lv. {user.level} · 카드 수집가
        </Text>

        {/* 재화 */}
        <View style={styles.currencyContainer}>
          <View style={styles.currencyItem}>
            <Text style={styles.currencyIcon}>💎</Text>

            <View>
              <Text style={styles.currencyLabel}>
                보유 결정
              </Text>

              <Text style={styles.currencyValue}>
                {user.crystals?.toLocaleString() ?? 0}
              </Text>
            </View>
          </View>

          <View style={styles.currencyItem}>
            <Text style={styles.currencyIcon}>🔥</Text>

            <View>
              <Text style={styles.currencyLabel}>
                검은 재
              </Text>

              <Text style={styles.currencyValue}>
                {user.darkAshes?.toLocaleString() ?? 0}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* 오른쪽 캐릭터 */}
      <View style={styles.characterContainer}>
        <Image
          source={{
            uri: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTIY-cdesJWZX-13vZWQ7bJspp4F1np4Eh9qzR19MeW2Q&s=10',
          }}
          style={styles.characterImage}
          resizeMode="contain"
        />

        <Text style={styles.characterStars}>
          ★ ★ ★ ★ ★
        </Text>
      </View>

      {/* ========================= 빠른 이동 ========================= */}
      <Text style={styles.sectionTitle}>
        빠른 이동
      </Text>

      <View style={styles.grid}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => handleNavigate('/cards')}
        >
          <Text style={styles.menuIcon}>🎴</Text>
          <Text style={styles.menuText}>보관함</Text>
          <Text style={styles.menuDescription}>
            내 카드 보기
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => handleNavigate('/forge')}
        >
          <Text style={styles.menuIcon}>⚒️</Text>
          <Text style={styles.menuText}>강화소</Text>
          <Text style={styles.menuDescription}>
            카드 강화
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => handleNavigate('/packs')}
        >
          <Text style={styles.menuIcon}>🎁</Text>
          <Text style={styles.menuText}>카드팩</Text>
          <Text style={styles.menuDescription}>
            새로운 카드
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => handleNavigate('/exchange')}
        >
          <Text style={styles.menuIcon}>🪙</Text>
          <Text style={styles.menuText}>교환소</Text>
          <Text style={styles.menuDescription}>
            아이템 교환
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView >

  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F4F6',
  },

  content: {
    padding: 16,
    paddingBottom: 32,
  },

  /* =========================
  플레이어 카드
  ========================= */

  playerCard: {
    height: 230,
    backgroundColor: '#252B42',
    borderRadius: 24,
    marginBottom: 28,
    overflow: 'hidden',
    padding: 22,
    position: 'relative',
    flexDirection: 'row',
  },

  backgroundCircleLarge: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#343D61',
    right: -100,
    top: -80,
  },

  backgroundCircleSmall: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#2F3654',
    right: 50,
    bottom: -100,
  },

  playerInfo: {
    flex: 1,
    zIndex: 2,
  },

  gameTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#AEB8D8',
    letterSpacing: 2,
    marginBottom: 8,
  },

  nickname: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },

  levelText: {
    fontSize: 13,
    color: '#B7C0DD',
    marginBottom: 20,
  },

  /* =========================
  재화
  ========================= */

  currencyContainer: {
    gap: 8,
  },

  currencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
  },

  currencyIcon: {
    fontSize: 18,
    marginRight: 8,
  },

  currencyLabel: {
    fontSize: 10,
    color: '#AEB8D8',
  },

  currencyValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* =========================
  캐릭터
  ========================= */

  characterContainer: {
    position: 'absolute',
    right: -5,
    bottom: 0,
    width: '52%',
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 1,
  },

  characterImage: {
    width: '100%',
    height: '100%',
  },

  characterStars: {
    position: 'absolute',
    bottom: 10,
    fontSize: 10,
    color: '#FFD56A',
    letterSpacing: 1,
  },

  /* =========================
  메뉴
  ========================= */

  sectionTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#191F28',
    marginBottom: 14,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  menuButton: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    paddingVertical: 22,
    paddingHorizontal: 16,
    borderRadius: 18,
  },

  menuIcon: {
    fontSize: 30,
    marginBottom: 12,
  },

  menuText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#191F28',
    marginBottom: 4,
  },

  menuDescription: {
    fontSize: 12,
    color: '#8B95A1',
  },
});