import { createRoute } from '@granite-js/react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  ImageBackground,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { styles } from '../assets/sytle/packs.style';
import { BannerAd } from '../src/components/banner-ad';
import { cardOutlineColors } from '../src/components/card';
import {
  type DevRewardedAdMode,
  DevRewardedAdToggle,
} from '../src/components/dev-rewarded-ad-toggle';
import { MaxLevelAura } from '../src/components/max-level-aura';
import {
  type CachedOwnedCard,
  elementLabels,
  gameRuntime,
  getCardImage,
  gradeLabels,
  prefetchCardImage,
  useGameCache,
} from '../src/features/game-cache';
import {
  isRewardedAdSuccess,
  rewardedAdService,
} from '../src/services/rewardedAdService';

export const Route = createRoute('/packs', {
  validateParams: (params) => params,
  component: PacksPage,
});

type Phase = 'idle' | 'loading' | 'ad' | 'drawing' | 'result';

const wait = (durationMs: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, durationMs));

export function PacksPage() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [message, setMessage] = useState('');
  const [reward, setReward] = useState<CachedOwnedCard | null>(null);
  const [devRewardedAdMode, setDevRewardedAdMode] =
    useState<DevRewardedAdMode>(true);
  const [bannerRefreshKey, setBannerRefreshKey] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [clock, setClock] = useState(() => Date.now());
  const game = useGameCache();
  const availability = game.packAvailability;
  const checkingStorage = game.status !== 'ready';
  const storageFull = Boolean(
    availability?.storageFull ||
      game.cards.length >= (availability?.storageCapacity ?? 5),
  );
  const cooldownSeconds = cooldownUntil
    ? Math.max(0, Math.ceil((cooldownUntil - clock) / 1_000))
    : 0;
  const cooldownActive = cooldownSeconds > 0;
  const drawDisabled =
    phase !== 'idle' || checkingStorage || storageFull || cooldownActive;
  const busy = useRef(false);
  const mounted = useRef(false);
  const animation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      animation.stopAnimation();
    };
  }, [animation]);

  useEffect(() => {
    if (cooldownUntil === null) return;

    const tick = () => {
      const now = Date.now();
      setClock(now);
      if (now >= cooldownUntil) setCooldownUntil(null);
    };
    tick();
    const timer = setInterval(tick, 1_000);
    return () => clearInterval(timer);
  }, [cooldownUntil]);

  useEffect(() => {
    if (phase !== 'drawing') return;
    animation.setValue(0);
    const effect = Animated.sequence([
      Animated.timing(animation, {
        toValue: 1,
        duration: 650,
        useNativeDriver: true,
      }),
      Animated.timing(animation, {
        toValue: 0.4,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(animation, {
        toValue: 1,
        duration: 550,
        useNativeDriver: true,
      }),
    ]);
    effect.start();
    return () => effect.stop();
  }, [phase, animation]);

  const draw = async () => {
    if (busy.current || drawDisabled) return;
    busy.current = true;
    setMessage('');
    setPhase('loading');
    try {
      const accessToken = gameRuntime.requireAccessToken();
      const requestId = gameRuntime.nextRequestId();

      // 광고 모드에서는 광고 로드가 성공한 뒤에만 예약과 쿨다운을 시작합니다.
      if (devRewardedAdMode !== 'NO_AD') {
        await rewardedAdService.load();
        if (!mounted.current) return;
      }

      const reservation = await gameRuntime.actions.reservePackOpening({
        accessToken,
        requestId,
      });
      if (!mounted.current) return;
      const nextAvailableAt = new Date(reservation.nextAvailableAt).getTime();
      setClock(Date.now());
      setCooldownUntil(nextAvailableAt);
      const imagePrefetch = prefetchCardImage(reservation.imageKey);
      if (devRewardedAdMode !== 'NO_AD') {
        setPhase('ad');
        const ad = await rewardedAdService.show(devRewardedAdMode);
        if (!mounted.current) return;

        const rewardSuccess = isRewardedAdSuccess(ad);
        if (!rewardSuccess) {
          throw new Error('REWARDED_AD_REWARD_FAILED');
        }
        setBannerRefreshKey((key) => key + 1);
      }

      setPhase('drawing');
      const [result] = await Promise.all([
        gameRuntime.actions.openPack({
          accessToken,
          requestId,
        }),
        imagePrefetch,
        wait(5_000),
      ]);
      if (!mounted.current) return;

      setReward(result.card);
      setPhase('result');
      busy.current = false;
    } catch (error) {
      if (!mounted.current) return;
      const errorCode = error instanceof Error ? error.message : '';
      setMessage(
        errorCode === 'CARD_STORAGE_FULL'
          ? '카드는 최대 5장까지 보유할 수 있어요. 보관함을 정리한 후 다시 시도해 주세요.'
          : errorCode === 'PACK_OPEN_COOLDOWN_ACTIVE'
            ? '카드는 1분에 한 번만 뽑을 수 있어요. 잠시 후 다시 시도해 주세요.'
            : errorCode === 'INVALID_PACK_RESERVATION_RESPONSE'
              ? '카드 뽑기 준비 응답이 올바르지 않아요. 잠시 후 다시 시도해 주세요.'
              : errorCode === 'GAME_SESSION_NOT_INITIALIZED' ||
                  errorCode === 'GAME_SERVER_NOT_CONFIGURED'
                ? '서버 연결 설정이 필요해요.'
                : errorCode === 'REWARDED_AD_NOT_SUPPORTED'
                  ? '현재 환경에서는 광고를 재생할 수 없어요. 토스 앱을 최신 버전으로 업데이트해 주세요.'
                  : errorCode === 'REWARDED_AD_DISMISSED_WITHOUT_REWARD' ||
                      errorCode === 'REWARDED_AD_REWARD_FAILED'
                    ? '광고를 끝까지 시청해야 카드를 뽑을 수 있어요.'
                    : errorCode.startsWith('REWARDED_AD_LOAD_FAILED')
                      ? `광고 로드 실패: ${errorCode.slice('REWARDED_AD_LOAD_FAILED:'.length).trim() || '상세 정보 없음'}`
                      : errorCode.startsWith('REWARDED_AD_SHOW_FAILED') ||
                          errorCode === 'REWARDED_AD_FAILED_TO_SHOW'
                        ? `광고 표시 실패: ${errorCode}`
                        : `카드 뽑기 실패: ${errorCode || '알 수 없는 오류'}`,
      );
      setPhase('idle');
      busy.current = false;
    }
  };

  const reset = () => {
    setReward(null);
    setPhase('idle');
  };
  return (
    <ImageBackground
      source={require('../assets/images/index/index.jpg')}
      resizeMode="cover"
      style={styles.background}
    >
      <View pointerEvents="none" style={styles.shade} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>CARD FORGE</Text>
        <Text style={styles.title}>카드 상점</Text>
        <Text style={styles.subtitle}>카드를 뽑는 장소입니다.</Text>

        <View style={styles.stage} accessibilityLiveRegion="polite">
          {phase === 'result' && reward ? (
            <>
              <Text style={styles.resultTitle}>카드 당첨!</Text>
              <View
                style={[
                  styles.rewardAuraFrame,
                  {
                    borderColor:
                      reward.enhancementLevel >= 10
                        ? '#FFD76A'
                        : cardOutlineColors[reward.grade],
                    shadowColor:
                      reward.enhancementLevel >= 10
                        ? '#FFD76A'
                        : cardOutlineColors[reward.grade],
                    shadowOpacity:
                      reward.enhancementLevel >= 10 ? 0.98 : 0.82,
                    shadowRadius:
                      reward.enhancementLevel >= 10 ? 30 : 22,
                    elevation:
                      reward.enhancementLevel >= 10 ? 18 : 12,
                  },
                ]}
              >
                <MaxLevelAura
                  level={reward.enhancementLevel}
                  borderRadius={15}
                  color={cardOutlineColors[reward.grade]}
                />
                <View style={styles.rewardCard}>
                  <Image
                    source={getCardImage(reward.imageKey)}
                    style={styles.cardImage}
                    resizeMode="cover"
                    accessibilityLabel={`${reward.name} ${gradeLabels[reward.grade]} ${reward.enhancementLevel}강`}
                  />
                  <View
                    style={[
                      styles.gradeBadge,
                      { backgroundColor: cardOutlineColors[reward.grade] },
                    ]}
                  >
                    <Text style={styles.gradeText}>
                      {gradeLabels[reward.grade]}
                    </Text>
                  </View>
                  <View style={styles.levelBadge}>
                    <Text style={styles.levelText}>
                      {reward.enhancementLevel}강
                    </Text>
                  </View>
                </View>
              </View>
              <Text style={styles.resultName}>{reward.name}</Text>
              <Text style={styles.resultElement}>
                {elementLabels[reward.element]} 원소
              </Text>
            </>
          ) : (
            <>
              <Animated.View
                style={[
                  styles.sealedCard,
                  phase === 'drawing' && {
                    opacity: animation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.55, 1],
                    }),
                    transform: [
                      {
                        scale: animation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.92, 1.12],
                        }),
                      },
                      {
                        rotate: animation.interpolate({
                          inputRange: [0, 0.4, 1],
                          outputRange: ['-5deg', '5deg', '0deg'],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Text style={styles.sparkle}>✦</Text>
                <Text style={styles.cardBackTitle}>CARD{'\n'}FORGE</Text>
                <Text style={styles.cardBackCaption}>여섯 원소의 힘</Text>
              </Animated.View>
              <Text style={styles.stageText}>
                {phase === 'drawing'
                  ? '원소의 힘이 모이고 있어요…'
                  : phase === 'ad'
                    ? '광고 시청이 끝나면 뽑기가 시작돼요'
                    : '어떤 원소의 카드가 기다리고 있을까요?'}
              </Text>
            </>
          )}
        </View>

        <View style={styles.actions}>
          {!!message && (
            <Text accessibilityRole="alert" style={styles.message}>
              {message}
            </Text>
          )}
          {phase === 'result' ? (
            <>
              <View style={styles.resultButtonBanner}>
                <BannerAd key={`result-${bannerRefreshKey}`} />
              </View>
              <TouchableOpacity
              accessibilityRole="button"
              style={styles.button}
              onPress={reset}
            >
                <Text style={styles.buttonText}>확인</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.hint}>
                {checkingStorage
                  ? '카드 보관함을 확인하고 있어요'
                  : storageFull
                    ? `보관함이 가득 찼어요 (${availability.ownedCardCount}/${availability.storageCapacity})`
                    : devRewardedAdMode === 'NO_AD'
                      ? `DEV 광고 생략 후 카드 1장을 뽑아요 (${availability?.ownedCardCount ?? 0}/${availability?.storageCapacity ?? 5})`
                      : `광고 시청 완료 후 카드 1장을 뽑아요 (${availability?.ownedCardCount ?? 0}/${availability?.storageCapacity ?? 5})`}
              </Text>
              <DevRewardedAdToggle
                value={devRewardedAdMode}
                disabled={phase !== 'idle'}
                onChange={setDevRewardedAdMode}
              />
              <View style={styles.drawButtonBanner}>
                <BannerAd key={bannerRefreshKey} />
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="카드 뽑기"
                disabled={drawDisabled}
                onPress={draw}
                style={[
                  styles.button,
                  drawDisabled && styles.disabled,
                  (storageFull || cooldownActive) && styles.storageFullButton,
                ]}
              >
                {phase !== 'idle' && <ActivityIndicator color="#292015" />}
                <Text
                  style={[
                    styles.buttonText,
                    (storageFull || cooldownActive) &&
                      styles.storageFullButtonText,
                  ]}
                >
                  {storageFull
                    ? '카드가 가득 찼습니다.'
                    : cooldownActive && phase === 'idle'
                      ? `${cooldownSeconds}초 후 다시 뽑기`
                      : phase === 'drawing'
                        ? '카드 뽑는 중'
                        : phase === 'ad'
                          ? '광고 시청 중'
                          : phase === 'loading'
                            ? '광고 준비 중'
                            : '카드 뽑기'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

      </ScrollView>
    </ImageBackground>
  );
}
