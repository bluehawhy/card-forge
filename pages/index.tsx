import {
  getOperationalEnvironment,
  getUserKeyForGame,
} from '@apps-in-toss/framework';
import { createRoute, useNavigation } from '@granite-js/react-native';
import { Settings } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SvgUri } from 'react-native-svg';
import {
  indexCharacterAura,
  styles,
} from '../assets/sytle/index.style';
import {
  getPlayerLevel,
  getPlayerLevelStarCount,
} from '../src/features/player-level/playerLevel';
import { BannerAd } from '../src/components/banner-ad';
import { MaxLevelAura } from '../src/components/max-level-aura';
import { useGameCache } from '../src/features/game-cache';

type AppRoutes =
  | '/card-storage'
  | '/forge'
  | '/packs'
  | '/exchange'
  | '/card_collection';
type MenuItem = {
  path: AppRoutes;
  title: string;
  description: string;
  iconUri?: string;
  accent: string;
};

export const Route = createRoute('/', {
  validateParams: (params) => params,
  component: HomePage,
});

const characterCardUri =
  'https://nmbdwukrvwfaxpasbppj.supabase.co/storage/v1/object/public/images/characters/webp/night_girl.webp?v=1';

const menuItems: MenuItem[] = [
  {
    path: '/packs',
    title: '카드 상점',
    description: '새로운 원소 카드 뽑기',
    iconUri:
      'https://nmbdwukrvwfaxpasbppj.supabase.co/storage/v1/object/public/images/icons/cards.svg',
    accent: '#C497FF',
  },
  {
    path: '/card-storage',
    title: '카드 보관함',
    description: '수집한 원소 카드 확인',
    iconUri:
      'https://nmbdwukrvwfaxpasbppj.supabase.co/storage/v1/object/public/images/icons/card_storage.svg',
    accent: '#72B6FF',
  },
  {
    path: '/forge',
    title: '카드 강화소',
    description: '광고를 보고 카드 강화',
    iconUri:
      'https://nmbdwukrvwfaxpasbppj.supabase.co/storage/v1/object/public/images/icons/forge.svg',
    accent: '#FFAF72',
  },
  {
    path: '/exchange',
    title: '포인트 교환소',
    description: '카드와 결정을 포인트로',
    iconUri:
      'https://nmbdwukrvwfaxpasbppj.supabase.co/storage/v1/object/public/images/icons/exchange.svg',
    accent: '#76CFA3',
  },
  {
    path: '/card_collection',
    title: '카드 도감',
    description: '발견한 6원소 카드 확인',
    iconUri:
      'https://nmbdwukrvwfaxpasbppj.supabase.co/storage/v1/object/public/images/icons/card_collection.svg',
    accent: '#72B6FF',
  },
];

export function HomePage() {
  const navigation = useNavigation();
  const game = useGameCache();
  const [gameUserHash, setGameUserHash] = useState<string | null>(null);
  const [hasMinimumLoadingElapsed, setHasMinimumLoadingElapsed] =
    useState(false);
  const [isCharacterCardLoaded, setIsCharacterCardLoaded] = useState(false);
  const environment =
    getOperationalEnvironment() === 'sandbox' ? '샌드박스' : '디폴트';

  useEffect(() => {
    let isMounted = true;

    void getUserKeyForGame()
      .then((result) => {
        if (!isMounted) return;

        if (
          typeof result === 'object' &&
          result !== null &&
          result.type === 'HASH'
        ) {
          setGameUserHash(result.hash);
          return;
        }

        setGameUserHash('hash 확인 실패');
      })
      .catch(() => {
        if (isMounted) setGameUserHash('hash 확인 실패');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const minimumLoadingTimer = setTimeout(() => {
      setHasMinimumLoadingElapsed(true);
    }, 5_000);

    return () => clearTimeout(minimumLoadingTimer);
  }, []);

  const isInitialLoading =
    game.status === 'idle' ||
    game.status === 'loading' ||
    gameUserHash === null ||
    !isCharacterCardLoaded ||
    !hasMinimumLoadingElapsed;

  if (isInitialLoading) {
    const loadingMessage = '카드의 세계로 들어가는 중';
    return (
      <View
        accessibilityLiveRegion="polite"
        accessibilityLabel={loadingMessage}
        style={styles.loadingScreen}
      >
        <View pointerEvents="none" style={styles.loadingIcon}>
          <View style={[styles.loadingCard, styles.loadingCardLeft]} />
          <View style={[styles.loadingCard, styles.loadingCardRight]} />
          <View style={[styles.loadingCard, styles.loadingCardFront]}>
            <Text style={styles.loadingCardMark}>✦</Text>
          </View>
        </View>
        {!isCharacterCardLoaded ? (
          <Image
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            onLoadEnd={() => setIsCharacterCardLoaded(true)}
            source={{ uri: characterCardUri }}
            style={styles.characterPreload}
          />
        ) : null}
        <Text style={styles.loadingTitle}>{loadingMessage}…</Text>
        <ActivityIndicator color="#D5B87F" size="small" />
        <View style={styles.loadingBanner}>
          <BannerAd />
        </View>
      </View>
    );
  }

  const nickname = game.currentUser?.displayName ?? '모험가';
  const playerLevel = getPlayerLevel(game.totalCrystalsEarned ?? 0);
  const levelStars = Array.from(
    { length: getPlayerLevelStarCount(playerLevel.level) },
    () => '★',
  ).join(' ');
  const user = {
    nickname,
    level: playerLevel.level,
    title: playerLevel.name,
    crystals: game.crystalBalance ?? 0,
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <View style={styles.brand}>
            <Text style={styles.eyebrow}>CARD FORGE</Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="설정 열기"
            activeOpacity={0.8}
            // biome-ignore lint/suspicious/noExplicitAny: Granite generated route types are stale until the next build.
            onPress={() => navigation.navigate('/setting' as any)}
            style={styles.settingButton}
          >
            <Settings color="#D5B87F" size={16} strokeWidth={2} />
          </TouchableOpacity>
        </View>
        <Text style={styles.welcome}>다시 오셨군요, {nickname}</Text>
        <Text style={styles.subtitle}>실행 환경: {environment}</Text>
        <Text style={styles.subtitle}>HASH: {gameUserHash}</Text>
        <Text style={styles.subtitle}>
          오늘도 새로운 카드의 힘을 깨워보세요.
        </Text>

        <View style={styles.playerCard}>
          <View style={styles.glowLarge} />
          <View style={styles.glowSmall} />
          <View style={styles.playerInfo}>
            <Text style={styles.profileLabel}>CARD COLLECTOR</Text>
            <Text style={styles.nickname}>{user.nickname}</Text>
            <Text style={styles.levelText}>
              Lv. {user.level} · {user.title}
            </Text>
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
            <MaxLevelAura
              level={10}
              borderRadius={0}
              {...indexCharacterAura}
            />
            <Image
              source={{ uri: characterCardUri }}
              style={styles.character}
              resizeMode="cover"
            />
            <View style={styles.characterShade} />
            <View style={styles.stars}>
              <Text style={styles.starText}>{levelStars}</Text>
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
              onPress={() =>
                item.path === '/card_collection'
                  ? navigation.navigate('/card_collection_loading' as any)
                  : navigation.navigate(item.path as any)
              }
              style={styles.menuCard}
            >
              <View style={[styles.iconWrap, { borderColor: item.accent }]}>
                {item.iconUri ? (
                  <SvgUri uri={item.iconUri} width={31} height={31} />
                ) : null}
              </View>
              <View style={styles.menuCopy}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuDescription}>{item.description}</Text>
              </View>
              <Text style={[styles.arrow, { color: item.accent }]}>{'›'}</Text>
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
