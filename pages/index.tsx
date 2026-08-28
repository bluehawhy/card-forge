import React from 'react';
import { View, Text, Image, ImageBackground, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { createRoute, useNavigation } from '@granite-js/react-native';

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

  const handleNavigate = (path: AppRoutes) => {
    navigation.navigate(path as any);
  };

  const FULL_BACKGROUND_URI =
    'https://github.com/bluehawhy/card-forge/blob/main/assets/images/background/index.jpg?raw=true';

  return (
    // 1. 전체 화면을 감싸는 ImageBackground
    <ImageBackground
      source={{ uri: FULL_BACKGROUND_URI }}
      style={styles.fullBackground}
      resizeMode="cover"
    >
      {/* 2. 가독성을 위해 전체 화면에 살짝 어두운 딤 필터 적용 */}
      <View style={styles.darkOverlay} />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* ========================= 플레이어 메인 카드 ========================= */}
        <View style={styles.playerCard}>
          {/* 배경 장식 원 */}
          <View style={styles.backgroundCircleLarge} />
          <View style={styles.backgroundCircleSmall} />

          {/* 왼쪽 플레이어 정보 */}
          <View style={styles.playerInfo}>
            <Text style={styles.gameTitle}>CARD FORGE</Text>

            <Text style={styles.nickname} numberOfLines={1}>
              {user.nickname ?? '모험가'}
            </Text>

            <Text style={styles.levelText}>
              Lv. {user.level} · 카드 수집가
            </Text>

            {/* 재화 */}
            <View style={styles.currencyContainer}>
              <View style={styles.currencyItem}>
                <Text style={styles.currencyIcon}>💎</Text>
                <View style={styles.currencyTextWrapper}>
                  <Text style={styles.currencyLabel} numberOfLines={1}>
                    보유 결정
                  </Text>
                  <Text style={styles.currencyValue} numberOfLines={1}>
                    {user.crystals?.toLocaleString() ?? 0}
                  </Text>
                </View>
              </View>

              <View style={styles.currencyItem}>
                <Text style={styles.currencyIcon}>🔥</Text>
                <View style={styles.currencyTextWrapper}>
                  <Text style={styles.currencyLabel} numberOfLines={1}>
                    검은 재
                  </Text>
                  <Text style={styles.currencyValue} numberOfLines={1}>
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
                uri: 'https://github.com/bluehawhy/card-forge/blob/main/assets/images/characters/rose.jpg?raw=true',
              }}
              style={styles.characterImage}
              resizeMode="cover"
            />
            <View style={styles.starsOverlay}>
              <Text style={styles.characterStars}>
                ★ ★ ★ ★ ★
              </Text>
            </View>
          </View>
        </View>

        {/* ========================= 빠른 이동 ========================= */}
        <Text style={styles.sectionTitle}>빠른 이동</Text>

        <View style={styles.grid}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => handleNavigate('/cards')}
          >
            <Text style={styles.menuIcon}>🎴</Text>
            <Text style={styles.menuText}>보관함</Text>
            <Text style={styles.menuDescription}>내 카드 보기</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => handleNavigate('/forge')}
          >
            <Text style={styles.menuIcon}>⚒️</Text>
            <Text style={styles.menuText}>강화소</Text>
            <Text style={styles.menuDescription}>카드 강화</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => handleNavigate('/packs')}
          >
            <Text style={styles.menuIcon}>🎁</Text>
            <Text style={styles.menuText}>카드팩</Text>
            <Text style={styles.menuDescription}>새로운 카드</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => handleNavigate('/exchange')}
          >
            <Text style={styles.menuIcon}>🪙</Text>
            <Text style={styles.menuText}>교환소</Text>
            <Text style={styles.menuDescription}>아이템 교환</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  /* 전체 화면 배경 지정 */
  fullBackground: {
    flex: 1,
    width: '100%',
    height: '100%',
  },

  /* 앱 내 UI 가독성을 확보해 주는 어두운 필터 (투명도 조절 가능) */
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(240, 242, 245, 0.65)', // 배경 이미지를 보면서도 흰색 카드들이 떠 보이게 연한 톤 처리
  },

  container: {
    flex: 1,
  },

  content: {
    padding: 16,
    paddingBottom: 32,
  },

  /* =========================
  플레이어 카드
  ========================= */

  playerCard: {
    height: 220,
    backgroundColor: 'rgba(37, 43, 66, 0.95)', // 전체 배경 위에서 잘 보이도록 불투명도 부여
    borderRadius: 24,
    marginBottom: 28,
    overflow: 'hidden',
    position: 'relative',
    flexDirection: 'row',
  },

  backgroundCircleLarge: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#343D61',
    left: -50,
    top: -80,
  },

  backgroundCircleSmall: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#2F3654',
    left: 80,
    bottom: -80,
  },

  playerInfo: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    zIndex: 2,
  },

  gameTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#AEB8D8',
    letterSpacing: 2,
    marginBottom: 6,
  },

  nickname: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },

  levelText: {
    fontSize: 12,
    color: '#B7C0DD',
    marginBottom: 14,
  },

  /* =========================
  재화
  ========================= */

  currencyContainer: {
    gap: 6,
  },

  currencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },

  currencyIcon: {
    fontSize: 16,
    marginRight: 6,
  },

  currencyTextWrapper: {
    flex: 1,
  },

  currencyLabel: {
    fontSize: 10,
    color: '#AEB8D8',
  },

  currencyValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* =========================
  캐릭터
  ========================= */

  characterContainer: {
    width: '45%',
    height: '100%',
    position: 'relative',
    zIndex: 1,
  },

  characterImage: {
    width: '100%',
    height: '100%',
  },

  starsOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingVertical: 6,
    alignItems: 'center',
  },

  characterStars: {
    fontSize: 11,
    color: '#FFD56A',
    letterSpacing: 2,
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
    backgroundColor: 'rgba(255, 255, 255, 0.92)', // 배경 이미지에 맞춘 반투명 흰색 카드
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