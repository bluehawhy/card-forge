import { getCardCrystalValue } from '../../services/cardValues';
import { getEnhancementSuccessRate } from '../../services/enhancementService';
import type { GameServerGateway } from './gameActionService';
import type {
  CachedOwnedCard,
  CardElement,
  CardGrade,
  ServerGameSnapshot,
} from './gameCache';
import { gameRuntime } from './gameRuntime';
import { probabilityConfigCache } from './probabilityConfig';

/**
 * 앱인토스 공식 테스트 광고 뒤의 UI/캐시 흐름을 확인하기 위한 로컬 게이트웨이입니다.
 * 실제 포인트 지급이나 운영 데이터 저장에는 사용하면 안 됩니다.
 */
export const ALLOW_LOCAL_GAMEPLAY_TEST_FALLBACK = true;

type TestCardTemplate = {
  name: string;
  element: CardElement;
  grade: CardGrade;
  imageKey: string;
};

const defaultTemplate: TestCardTemplate = {
  name: '대지의 수호자',
  element: 'EARTH',
  grade: 'NORMAL',
  imageKey: 'earth_guardian',
};

const templates: readonly TestCardTemplate[] = [
  defaultTemplate,
  {
    name: '심해의 파도',
    element: 'WATER',
    grade: 'MAGIC',
    imageKey: 'deep_sea_wave',
  },
  {
    name: '질풍의 정령',
    element: 'WIND',
    grade: 'RARE',
    imageKey: 'gale_spirit',
  },
  {
    name: '불꽃 드래곤',
    element: 'FIRE',
    grade: 'SUPER_RARE',
    imageKey: 'flame_dragon',
  },
  {
    name: '찬란한 심판',
    element: 'LIGHT',
    grade: 'UNIQUE',
    imageKey: 'radiant_judgment',
  },
  {
    name: '심연의 군주',
    element: 'DARK',
    grade: 'LEGENDARY',
    imageKey: 'abyss_lord',
  },
];

const cardDrawGradeOrder: readonly CardGrade[] = [
  'NORMAL',
  'MAGIC',
  'RARE',
  'SUPER_RARE',
  'UNIQUE',
  'LEGENDARY',
];

function drawLocalTemplate(randomValue: number): TestCardTemplate {
  const cardDrawRates = probabilityConfigCache.cardDrawRates;
  const scale = cardDrawRates.probabilityScale;
  const ticket = Math.min(
    scale - 1,
    Math.max(0, Math.floor(randomValue * scale)),
  );
  let upperBound = 0;
  const grade =
    cardDrawGradeOrder.find((candidate) => {
      upperBound += cardDrawRates.grades[candidate].weight;
      return ticket < upperBound;
    }) ?? 'LEGENDARY';
  return (
    templates.find((template) => template.grade === grade) ?? defaultTemplate
  );
}

export function createLocalGameplayTestGateway(
  random: () => number = Math.random,
): GameServerGateway {
  let cards: CachedOwnedCard[] = [];
  let crystalBalance = 0;
  let totalCrystalsEarned = 0;
  let usedToday = 0;
  let sequence = 0;
  let lastPackReservationAt = 0;
  let pendingPackTemplate: TestCardTemplate | null = null;

  const availability = () => ({
    packType: 'AD_TEST',
    dailyLimit: 20,
    usedToday,
    remainingToday: Math.max(0, 20 - usedToday),
    ownedCardCount: cards.length,
    storageCapacity: 5,
    storageFull: cards.length >= 5,
    nextResetAt: nextUtcDay(),
  });
  const snapshot = (): ServerGameSnapshot => ({
    cards: cards.map((card) => ({ ...card })),
    crystalBalance,
    totalCrystalsEarned,
    packAvailability: availability(),
    syncedAt: new Date().toISOString(),
  });

  return {
    async loadGame() {
      return snapshot();
    },
    async reservePackOpening() {
      const now = Date.now();
      if (!pendingPackTemplate && now < lastPackReservationAt + 20_000) {
        throw new Error('PACK_OPEN_COOLDOWN_ACTIVE');
      }
      const replayed = pendingPackTemplate !== null;
      pendingPackTemplate ??= drawLocalTemplate(random());
      lastPackReservationAt = now;
      return {
        imageKey: pendingPackTemplate.imageKey,
        startedAt: new Date(now).toISOString(),
        nextAvailableAt: new Date(now + 20_000).toISOString(),
        replayed,
      };
    },
    async openPack() {
      if (cards.length >= 5) throw new Error('CARD_STORAGE_FULL');
      if (usedToday >= 20) throw new Error('DAILY_PACK_LIMIT_REACHED');
      if (!pendingPackTemplate) throw new Error('PACK_AD_RESERVATION_REQUIRED');
      const template = pendingPackTemplate;
      sequence += 1;
      usedToday += 1;
      const card: CachedOwnedCard = {
        cardId: `local-card-${Date.now()}-${sequence}`,
        templateId: `${template.element}-${template.grade}`,
        ...template,
        enhancementLevel: 1,
        status: 'ENHANCEABLE',
        acquiredAt: new Date().toISOString(),
      };
      cards.push(card);
      pendingPackTemplate = null;
      return { card: { ...card }, packAvailability: availability() };
    },
    async enhanceCard({ cardId }) {
      const current = cards.find((card) => card.cardId === cardId);
      if (!current) throw new Error('CARD_NOT_FOUND');
      if (current.status !== 'ENHANCEABLE')
        throw new Error('CARD_NOT_ENHANCEABLE');
      if (current.enhancementLevel >= 10)
        throw new Error('MAX_ENHANCEMENT_LEVEL');
      const success =
        random() * 100 <
        getEnhancementSuccessRate(current.enhancementLevel, current.grade);
      const card: CachedOwnedCard = success
        ? {
            ...current,
            enhancementLevel: current.enhancementLevel + 1,
            status:
              current.enhancementLevel + 1 >= 10 ? 'MAX_LEVEL' : 'ENHANCEABLE',
          }
        : { ...current, status: 'ENHANCEMENT_LOCKED' };
      cards = cards.map((candidate) =>
        candidate.cardId === cardId ? card : candidate,
      );
      return { card: { ...card }, result: success ? 'SUCCESS' : 'FAILURE' };
    },
    async sellCards({ cardIds }) {
      const unique = new Set(cardIds);
      if (
        cardIds.length < 1 ||
        cardIds.length > 5 ||
        unique.size !== cardIds.length
      ) {
        throw new Error('INVALID_CARD_SELECTION');
      }
      const selected = cardIds.map((id) => {
        const card = cards.find((candidate) => candidate.cardId === id);
        if (!card) throw new Error('CARD_NOT_FOUND');
        return card;
      });
      const crystalReward = selected.reduce(
        (sum, card) =>
          sum + getCardCrystalValue(card.grade, card.enhancementLevel),
        0,
      );
      cards = cards.filter((card) => !unique.has(card.cardId));
      crystalBalance += crystalReward;
      totalCrystalsEarned += crystalReward;
      return {
        soldCardIds: [...cardIds],
        crystalReward,
        crystalBalance,
        packAvailability: availability(),
      };
    },
    async exchangePoints({ pointAmount }) {
      const crystalAmount = pointAmount * 10_000;
      if (!Number.isSafeInteger(pointAmount) || pointAmount < 1)
        throw new Error('INVALID_POINT_AMOUNT');
      if (crystalAmount > crystalBalance)
        throw new Error('INSUFFICIENT_CRYSTALS');
      crystalBalance -= crystalAmount;
      return {
        exchangeId: `local-exchange-${Date.now()}`,
        pointAmount,
        crystalAmount,
        crystalBalance,
        status: 'TEST_ONLY',
      };
    },
  };
}

export function getAdCompletionProof(value: unknown): string {
  if (gameRuntime.isLocalTestMode()) return `local-test-ad-${Date.now()}`;
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error('AD_COMPLETION_PROOF_UNAVAILABLE');
  }
  return value;
}

function nextUtcDay(): string {
  const next = new Date();
  next.setUTCHours(24, 0, 0, 0);
  return next.toISOString();
}
