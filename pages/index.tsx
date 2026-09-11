import { createRoute, useNavigation } from '@granite-js/react-native';
import React from 'react';
import {
  Image,
  type ImageSourcePropType,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { styles } from '../assets/sytle/index.style';
import { BannerAd } from '../src/components/banner-ad';
import {
  INVALID_ACCESS_ERROR_CODE,
  useGameCache,
} from '../src/features/game-cache';

type AppRoutes = '/cards' | '/forge' | '/packs' | '/exchange';
type MenuItem = {
  path: AppRoutes;
  title: string;
  description: string;
  icon: ImageSourcePropType;
  accent: string;
};

export const Route = createRoute('/', {
  validateParams: (params) => params,
  component: HomePage,
});

const menuItems: MenuItem[] = [
  {
    path: '/cards',
    title: '카드 보관함',
    description: '수집한 원소 카드 확인',
    icon: {
      uri: 'https://nmbdwukrvwfaxpasbppj.supabase.co/storage/v1/object/public/images/characters/rose.jpg',
    },
    accent: '#72B6FF',
  },
  {
    path: '/forge',
    title: '카드 강화소',
    description: '광고를 보고 카드 강화',
    icon: {
      uri: 'https://nmbdwukrvwfaxpasbppj.supabase.co/storage/v1/object/public/images/index/forge.png',
    },
    accent: '#FFAF72',
  },
  {
    path: '/packs',
    title: '카드 상점',
    description: '새로운 원소 카드 뽑기',
    icon: {
      uri: 'https://nmbdwukrvwfaxpasbppj.supabase.co/storage/v1/object/public/images/index/packs.png',
    },
    accent: '#C497FF',
  },
  {
    path: '/exchange',
    title: '포인트 교환소',
    description: '카드와 결정을 포인트로',
    icon: {
      uri: 'https://nmbdwukrvwfaxpasbppj.supabase.co/storage/v1/object/public/images/index/exchange.png',
    },
    accent: '#76CFA3',
  },
];

export function HomePage() {
  const navigation = useNavigation();
  const game = useGameCache();

  if (
    game.status === 'error' &&
    game.error?.code === INVALID_ACCESS_ERROR_CODE
  ) {
    return <AccessStatusPage title="잘못된 접근입니다" />;
  }

  if (game.currentUser === null && game.status !== 'ready') {
    return (
      <AccessStatusPage
        title={
          game.status === 'error'
            ? '사용자 정보를 확인하지 못했습니다'
            : '사용자 정보를 확인하고 있습니다'
        }
      />
    );
  }

  const user = {
    nickname: game.currentUser?.displayName ?? '모험가',
    level: 1,
    crystals: game.crystalBalance ?? 0,
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow}>CARD FORGE</Text>
        <Text style={styles.welcome}>다시 오셨군요, {user.nickname}</Text>
        <Text style={styles.subtitle}>
          오늘도 새로운 카드의 힘을 깨워보세요.
        </Text>

        <View style={styles.playerCard}>
          <View style={styles.glowLarge} />
          <View style={styles.glowSmall} />
          <View style={styles.playerInfo}>
            <Text style={styles.profileLabel}>CARD COLLECTOR</Text>
            <Text style={styles.nickname}>{user.nickname}</Text>
            <Text style={styles.levelText}>Lv. {user.level} · 카드 수집가</Text>
            <View style={styles.currencyCard}>
              <Text style={styles.crystalIcon}>◆</Text>
              <View>
                <Text style={styles.currencyLabel}>보유 결정</Text>
                <Text style={styles.currencyValue}>
                  {user.crystals.toLocaleString('ko-KR')}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.characterWrap}>
            <Image
              source={{
                uri: 'https://nmbdwukrvwfaxpasbppj.supabase.co/storage/v1/object/sign/images/characters/night_girl.png?token=eyJraWQiOiJkZjZkMjkwNS02MTg4LTRmMWItOWQxYi1iMTJjYThlODc4YmUiLCJhbGciOiJIUzUxMiJ9.eyJ1cmwiOiJpbWFnZXMvY2hhcmFjdGVycy9uaWdodF9naXJsLnBuZyIsInNjb3BlIjoiZG93bmxvYWQiLCJpYXQiOjE3ODkwMzgxODYsImV4cCI6MTg4MzY0NjE4Nn0.5FhEqsxsGAjJAYS5hQaFChWchDF2Hs9_VQKx7yeME3Fu8mBN1SYMZlUy9TGxEb26VSFGnJ9wTJG7Ma5OQl06gg',
              }}
              style={styles.character}
              resizeMode="cover"
            />
            <View style={styles.characterShade} />
            <View style={styles.stars}>
              <Text style={styles.starText}>★ ★ ★ ★ ★</Text>
            </View>
          </View>
        </View>

        <BannerAd />

        <View style={styles.grid}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.path}
              accessibilityRole="button"
              accessibilityLabel={`${item.title} 이동`}
              activeOpacity={0.82}
              // biome-ignore lint/suspicious/noExplicitAny: Granite generated route types are stale until the next build.
              onPress={() => navigation.navigate(item.path as any)}
              style={styles.menuCard}
            >
              <View style={[styles.iconWrap, { borderColor: item.accent }]}>
                <Image
                  source={item.icon}
                  style={styles.icon}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.menuCopy}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuDescription}>{item.description}</Text>
              </View>
              <Text style={[styles.arrow, { color: item.accent }]}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.guideCard}>
          <Text style={styles.guideMark}>✦</Text>
          <View style={styles.guideCopy}>
            <Text style={styles.guideTitle}>카드를 뽑고 강화해 보세요</Text>
            <Text style={styles.guideText}>
              수집한 카드는 결정으로 교환하고, 결정은 포인트로 바꿀 수 있어요.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="앱 로그 보기"
          activeOpacity={0.8}
          // biome-ignore lint/suspicious/noExplicitAny: Granite generated route types are stale until the next build.
          onPress={() => navigation.navigate('/debug-logs' as any)}
          style={styles.debugButton}
        >
          <Text style={styles.debugButtonText}>DEV · 앱 로그 보기</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function AccessStatusPage({ title }: { title: string }) {
  return (
    <View style={styles.accessStatusScreen}>
      <Text style={styles.accessStatusMark}>◆</Text>
      <Text style={styles.accessStatusTitle}>{title}</Text>
    </View>
  );
}
