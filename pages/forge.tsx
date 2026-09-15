import { createRoute } from '@granite-js/react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  ImageBackground,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { styles } from '../assets/sytle/forge.style';
import { BannerAd } from '../src/components/banner-ad';
import { cardOutlineColors } from '../src/components/card';
import { CardArtwork } from '../src/components/card-artwork';
import { CardPicker } from '../src/components/card-picker';
import {
  type DevRewardedAdMode,
  DevRewardedAdToggle,
} from '../src/components/dev-rewarded-ad-toggle';
import { MaxLevelAura } from '../src/components/max-level-aura';
import {
  FORGE_ANVIL_DATA_URI,
  FORGE_CLANG_DATA_URI,
  FORGE_HAMMER_DATA_URI,
} from '../src/features/forge/forgeImageData.generated';
import {
  gameRuntime,
  gradeLabels,
  useGameCache,
} from '../src/features/game-cache';
import { MAX_ENHANCEMENT_LEVEL } from '../src/services/enhancementService';
import {
  isRewardedAdSuccess,
  rewardedAdService,
} from '../src/services/rewardedAdService';
import { appLogger } from '../src/utils/appLogger';

export const Route = createRoute('/forge', {
  validateParams: (params) => params,
  component: ForgePage,
});

type Phase = 'idle' | 'loading' | 'ad' | 'striking' | 'result';

const wait = (durationMs: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, durationMs));

export function ForgePage() {
  const game = useGameCache();
  const routeCardId = (Route?.useParams?.() as { cardId?: string } | undefined)
    ?.cardId;
  const [selectedId, setSelectedId] = useState<string | null>(
    routeCardId ?? null,
  );
  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<'SUCCESS' | 'FAILURE' | null>(null);
  const [attemptedLevel, setAttemptedLevel] = useState<number | null>(null);
  const [strikeCount, setStrikeCount] = useState(0);
  const [error, setError] = useState('');
  const [devRewardedAdMode, setDevRewardedAdMode] =
    useState<DevRewardedAdMode>(true);
  const busy = useRef(false);
  const activeStrike = useRef<Animated.CompositeAnimation | null>(null);
  const hammerProgress = useRef(new Animated.Value(0)).current;
  const impactProgress = useRef(new Animated.Value(0)).current;
  const selected = game.cards.find((card) => card.cardId === selectedId);
  const unavailable =
    !selected ||
    selected.status !== 'ENHANCEABLE' ||
    selected.enhancementLevel >= MAX_ENHANCEMENT_LEVEL;
  const displayedLevel =
    phase === 'striking' && attemptedLevel !== null
      ? attemptedLevel
      : selected?.enhancementLevel;
  const failed = phase === 'result' && result === 'FAILURE';
  const heroAuraColor =
    selected && (displayedLevel ?? 0) < MAX_ENHANCEMENT_LEVEL
      ? cardOutlineColors[selected.grade]
      : '#FFD76A';

  useEffect(() => {
    if (phase !== 'striking') return;

    hammerProgress.setValue(0);
    impactProgress.setValue(0);
    setStrikeCount(1);
    const countTimers = [
      setTimeout(() => setStrikeCount(2), 1_100),
      setTimeout(() => setStrikeCount(3), 2_200),
    ];
    const strike = () =>
      Animated.sequence([
        Animated.timing(hammerProgress, {
          toValue: 1,
          duration: 400,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.parallel([
          Animated.timing(impactProgress, {
            toValue: 1,
            duration: 70,
            useNativeDriver: true,
          }),
          Animated.timing(hammerProgress, {
            toValue: 0.78,
            duration: 80,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(hammerProgress, {
            toValue: 0,
            duration: 300,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(impactProgress, {
            toValue: 0,
            duration: 260,
            useNativeDriver: true,
          }),
        ]),
      ]);
    const timeline = Animated.sequence([
      strike(),
      Animated.delay(320),
      strike(),
      Animated.delay(320),
      strike(),
      Animated.delay(2_020),
    ]);
    activeStrike.current = timeline;
    timeline.start();
    return () => {
      for (const timer of countTimers) clearTimeout(timer);
      activeStrike.current?.stop();
      activeStrike.current = null;
    };
  }, [hammerProgress, impactProgress, phase]);

  const enhance = async () => {
    if (!selected || unavailable || busy.current || phase !== 'idle') return;
    busy.current = true;
    setError('');
    setResult(null);
    setAttemptedLevel(selected.enhancementLevel);
    setPhase('loading');
    appLogger.info('FORGE', '강화 시도 시작', {
      cardId: selected.cardId,
      enhancementLevel: selected.enhancementLevel,
      devRewardedAdMode,
    });
    try {
      if (devRewardedAdMode !== 'NO_AD') {
        await rewardedAdService.load();
        setPhase('ad');
        const ad = await rewardedAdService.show(devRewardedAdMode);
        const rewardSuccess = isRewardedAdSuccess(ad);
        if (!rewardSuccess) {
          throw new Error('REWARDED_AD_REWARD_FAILED');
        }
      }

      setPhase('striking');
      const [outcome] = await Promise.all([
        gameRuntime.actions.enhanceCard({
          accessToken: gameRuntime.requireAccessToken(),
          requestId: gameRuntime.nextRequestId(),
          cardId: selected.cardId,
        }),
        wait(5_000),
      ]);

      appLogger.info('FORGE', '강화 결과 수신', {
        cardId: selected.cardId,
        attemptedLevel: selected.enhancementLevel,
        result: outcome.result,
      });
      setResult(outcome.result);
      setStrikeCount(0);
      setPhase('result');
      busy.current = false;
    } catch (reason) {
      const code = reason instanceof Error ? reason.message : '';
      appLogger.error('FORGE', '강화 처리 실패', {
        cardId: selected.cardId,
        enhancementLevel: selected.enhancementLevel,
        devRewardedAdMode,
        code: code || 'UNKNOWN_ERROR',
        name: reason instanceof Error ? reason.name : typeof reason,
        stack: reason instanceof Error ? reason.stack : undefined,
        raw: reason instanceof Error ? undefined : reason,
      });
      setError(
        code === 'REWARDED_AD_NOT_SUPPORTED'
          ? '현재 환경에서는 광고를 재생할 수 없어요. 토스 앱에서 다시 실행해 주세요.'
          : code === 'REWARDED_AD_DISMISSED_WITHOUT_REWARD' ||
              code === 'REWARDED_AD_REWARD_FAILED'
            ? '광고를 끝까지 시청해야 강화를 시도할 수 있어요.'
            : code === 'ENHANCEMENT_PERMANENTLY_LOCKED'
              ? '이미 강화 실패로 잠긴 카드예요.'
              : code === 'MAX_ENHANCEMENT_LEVEL'
                ? '이미 최고 강화 단계에 도달한 카드예요.'
                : '강화를 시작하지 못했어요. 잠시 후 다시 시도해 주세요.',
      );
      setAttemptedLevel(null);
      setPhase('idle');
      busy.current = false;
    }
  };

  const hammerStyle = {
    opacity: hammerProgress.interpolate({
      inputRange: [0, 0.05, 1],
      outputRange: [0.82, 1, 1],
    }),
    transform: [
      {
        translateY: hammerProgress.interpolate({
          inputRange: [0, 0.72, 1],
          outputRange: [-18, 118, 128],
        }),
      },
      {
        translateX: hammerProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [34, -8],
        }),
      },
      {
        rotate: hammerProgress.interpolate({
          inputRange: [0, 0.72, 1],
          outputRange: ['8deg', '-24deg', '-18deg'],
        }),
      },
    ],
  };
  const impactStyle = {
    opacity: impactProgress,
    transform: [
      {
        scale: impactProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.5, 1.35],
        }),
      },
    ],
  };
  const overlayShakeStyle = {
    transform: [
      {
        translateX: impactProgress.interpolate({
          inputRange: [0, 0.35, 0.7, 1],
          outputRange: [0, -7, 6, 0],
        }),
      },
    ],
  };
  const failedImageStyle =
    Platform.OS === 'ios' ? styles.failedImageIos : styles.failedImageGrayscale;

  return (
    <ImageBackground
      source={require('../assets/images/index/index.jpg')}
      resizeMode="cover"
      style={styles.background}
    >
      <View pointerEvents="none" style={styles.shade} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>CARD FORGE</Text>
        <Text style={styles.title}>카드 강화소</Text>
        <Text style={styles.subtitle}>
          보유 카드 중 원하는 카드를 선택하세요.
        </Text>
        <Text style={styles.previewNote}>
          화면은 캐시를 표시하고 결과는 서버가 확정해요
        </Text>
        <View style={styles.stage} accessibilityLiveRegion="polite">
          {phase === 'result' && result && (
            <Text
              style={[
                styles.resultTitle,
                result === 'FAILURE' && styles.failure,
              ]}
            >
              {result === 'SUCCESS' ? '강화 성공!' : '강화 실패'}
            </Text>
          )}
          {selected ? (
            <View style={styles.strikeScene}>
              <View
                style={[
                  styles.heroAuraFrame,
                  {
                    borderColor: heroAuraColor,
                    shadowColor: heroAuraColor,
                  },
                ]}
              >
                <MaxLevelAura
                  level={displayedLevel ?? 0}
                  borderRadius={17}
                  color={cardOutlineColors[selected.grade]}
                />
                <View
                  style={[styles.cardFrame, failed && styles.failedCardFrame]}
                >
                  <CardArtwork
                    imageKey={selected.imageKey}
                    thumbnail
                    style={[styles.heroCard, failed && failedImageStyle]}
                    resizeMode="cover"
                    accessibilityLabel={`${selected.name} ${gradeLabels[selected.grade]} ${displayedLevel}강`}
                  />
                  {failed && (
                    <View pointerEvents="none" style={styles.failedShade} />
                  )}
                  <View
                    style={[
                      styles.gradeBadge,
                      { backgroundColor: cardOutlineColors[selected.grade] },
                    ]}
                  >
                    <Text style={styles.gradeText}>
                      {gradeLabels[selected.grade]}
                    </Text>
                  </View>
                  <View style={styles.heroLevelBadge}>
                    <Text style={styles.heroLevelText}>{displayedLevel}강</Text>
                  </View>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>✦</Text>
              <Text style={styles.emptyText}>
                강화할 카드를{'\n'}선택해 주세요
              </Text>
            </View>
          )}
          <Text style={styles.stageText}>
            {phase === 'ad'
              ? '광고 시청이 끝나면 강화가 시작돼요'
              : phase === 'striking'
                ? `모루를 두드리는 중… ${strikeCount}/3`
                : phase === 'result' && result
                  ? result === 'SUCCESS'
                    ? '강화 단계가 캐시에 반영됐어요.'
                    : '현재 단계는 유지되고 추가 강화가 잠겼어요.'
                  : selected?.status === 'ENHANCEMENT_LOCKED'
                    ? '강화 실패로 추가 강화가 잠긴 카드예요.'
                    : selected?.status === 'MAX_LEVEL'
                      ? '최고 강화 단계에 도달했어요.'
                      : selected
                        ? `${selected.enhancementLevel}강 → ${selected.enhancementLevel + 1}강`
                        : '아래 보유 카드 중 원하는 카드 한 장을 골라주세요.'}
          </Text>
        </View>
        <CardPicker
          cards={game.cards}
          selectedId={selectedId}
          disabled={phase !== 'idle'}
          onSelect={(cardId) => {
            setSelectedId(cardId);
            setError('');
            setResult(null);
            setAttemptedLevel(null);
          }}
        />
        <View style={styles.actions}>
          {!!error && (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          )}
          {phase === 'result' ? (
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.button}
              onPress={() => {
                setResult(null);
                setAttemptedLevel(null);
                setPhase('idle');
              }}
            >
              <Text style={styles.buttonText}>확인</Text>
            </TouchableOpacity>
          ) : (
            <>
              <Text style={styles.hint}>
                {devRewardedAdMode === 'NO_AD'
                  ? 'DEV 모드에서 광고 없이 선택한 카드 한 장을 강화해요.'
                  : '광고 완료 후 선택한 카드 한 장만 강화해요.'}
              </Text>
              <DevRewardedAdToggle
                value={devRewardedAdMode}
                disabled={phase !== 'idle'}
                onChange={setDevRewardedAdMode}
              />
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="강화 시도"
                disabled={unavailable || phase !== 'idle'}
                onPress={enhance}
                style={[
                  styles.button,
                  (unavailable || phase !== 'idle') && styles.disabled,
                ]}
              >
                {phase !== 'idle' && <ActivityIndicator color="#292015" />}
                <Text style={styles.buttonText}>
                  {phase === 'loading'
                    ? '광고 준비 중'
                    : phase === 'ad'
                      ? '광고 시청 중'
                      : phase === 'striking'
                        ? `강화 중 ${strikeCount}/3`
                        : unavailable
                          ? '강화할 수 없음'
                          : '강화 시도'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
      {phase === 'striking' && selected && (
        <Animated.View
          accessible
          accessibilityLabel={`카드 강화 중, 모루 타격 ${strikeCount}/3`}
          style={[styles.strikeOverlay, overlayShakeStyle]}
        >
          <CardArtwork
            imageKey={selected.imageKey}
            thumbnail
            style={styles.strikeBackdrop}
            resizeMode="cover"
            blurRadius={18}
          />
          <View style={styles.strikeBackdropShade} />
          <View style={styles.forgeVignette} />
          <View pointerEvents="none" style={styles.forgeHeader}>
            <Text style={styles.forgeCaption}>ARCANE FORGE</Text>
            <Text style={styles.forgeTitle}>카드의 힘을 제련하는 중</Text>
          </View>
          <View style={styles.fullForgeScene}>
            <View pointerEvents="none" style={styles.furnaceGlow} />
            <View pointerEvents="none" style={styles.emberField}>
              <Text style={[styles.ember, styles.emberOne]}>✦</Text>
              <Text style={[styles.ember, styles.emberTwo]}>•</Text>
              <Text style={[styles.ember, styles.emberThree]}>✦</Text>
              <Text style={[styles.ember, styles.emberFour]}>•</Text>
            </View>
            <Animated.View style={[styles.fullHammer, hammerStyle]}>
              <Animated.Image
                accessibilityLabel="강화용 망치"
                resizeMode="contain"
                source={{ uri: FORGE_HAMMER_DATA_URI }}
                style={styles.fullHammerImage}
              />
            </Animated.View>
            <View style={styles.anvilWrap}>
              <View pointerEvents="none" style={styles.anvilGlow} />
              <ImageBackground
                accessibilityLabel="강화용 모루"
                resizeMode="contain"
                source={{ uri: FORGE_ANVIL_DATA_URI }}
                style={styles.anvilImage}
              >
                <View style={styles.heatedMetal}>
                  <View style={styles.heatedMetalCore} />
                </View>
              </ImageBackground>
            </View>
            <Animated.View
              pointerEvents="none"
              style={[styles.fullImpact, impactStyle]}
            >
              <View style={styles.impactRingOuter} />
              <View style={styles.impactRingInner} />
              <Text style={styles.sparkText}>✦ ✦ ✦</Text>
              <Animated.Image
                accessibilityLabel="망치 타격 불꽃 효과"
                resizeMode="contain"
                source={{ uri: FORGE_CLANG_DATA_URI }}
                style={styles.bangImage}
              />
            </Animated.View>
          </View>
          <View pointerEvents="none" style={styles.strikeStatus}>
            <Text style={styles.strikeProgress}>강화 중</Text>
            <View style={styles.strikeDots}>
              {[1, 2, 3].map((step) => (
                <View
                  key={step}
                  style={[
                    styles.strikeDot,
                    step === strikeCount && styles.strikeDotActive,
                  ]}
                />
              ))}
            </View>
            <Text style={styles.strikeCount}>{strikeCount} / 3</Text>
          </View>
          <View style={styles.strikeBanner}>
            <BannerAd />
          </View>
        </Animated.View>
      )}
    </ImageBackground>
  );
}
