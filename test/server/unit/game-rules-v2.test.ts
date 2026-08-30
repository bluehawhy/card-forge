import {
  CARD_STORAGE_CAPACITY,
  CLIMATE_ELEMENTS,
  CRYSTALS_PER_TOSS_POINT_V2,
  DAILY_AD_PACK_LIMIT,
  calculateBatchSale,
  calculateCardSaleValue,
  createClimateBag,
  successRateForTargetLevel,
} from '../../../apps/server/src/cards/game-rules-v2';

describe('card-forge-rules-v2', () => {
  it('v2 보관칸·광고팩·포인트 환율을 고정한다', () => {
    expect(CARD_STORAGE_CAPACITY).toBe(5);
    expect(DAILY_AD_PACK_LIMIT).toBe(20);
    expect(CRYSTALS_PER_TOSS_POINT_V2).toBe(10_000);
  });

  it('강화 성공률과 최종 누적 확률이 규칙표와 일치한다', () => {
    expect(successRateForTargetLevel(2)).toBe(1);
    expect(successRateForTargetLevel(9)).toBe(0.3313);
    expect(successRateForTargetLevel(10)).toBe(0.2);
    const cumulative = [2, 3, 4, 5, 6, 7, 8, 9, 10].reduce(
      (value, level) => value * successRateForTargetLevel(level),
      1,
    );
    expect(cumulative).toBeCloseTo(0.0040074048, 10);
  });

  it('첫 판매의 오늘 원소 카드에만 1.5배를 적용한다', () => {
    expect(
      calculateCardSaleValue(
        { grade: 'RARE', element: 'WATER', enhancementLevel: 7 },
        'WATER',
        true,
      ),
    ).toMatchObject({
      baseValue: 30_000,
      multiplier: 1.5,
      crystalReward: 315_000,
    });
    expect(
      calculateCardSaleValue(
        { grade: 'RARE', element: 'WATER', enhancementLevel: 7 },
        'WATER',
        false,
      ).crystalReward,
    ).toBe(210_000);
  });

  it('정확히 카드 5장의 가치를 합산한다', () => {
    const cards = [
      {
        grade: 'NORMAL' as const,
        element: 'LIGHT' as const,
        enhancementLevel: 1,
      },
      {
        grade: 'MAGIC' as const,
        element: 'WATER' as const,
        enhancementLevel: 2,
      },
      {
        grade: 'RARE' as const,
        element: 'WATER' as const,
        enhancementLevel: 3,
      },
      {
        grade: 'SUPER_RARE' as const,
        element: 'FIRE' as const,
        enhancementLevel: 4,
      },
      {
        grade: 'LEGENDARY' as const,
        element: 'EARTH' as const,
        enhancementLevel: 10,
      },
    ];
    const result = calculateBatchSale(cards, 'WATER', true);
    expect(result.items).toHaveLength(5);
    expect(result.crystalReward).toBe(1_405_000);
    expect(() => calculateBatchSale(cards.slice(0, 4), 'WATER', true)).toThrow(
      'SALE_REQUIRES_FIVE_CARDS',
    );
  });

  it('기후 주머니에 6개 기후와 원소가 중복 없이 한 번씩 들어간다', () => {
    const bag = createClimateBag();
    expect(new Set(bag).size).toBe(6);
    expect(new Set(bag.map((climate) => CLIMATE_ELEMENTS[climate])).size).toBe(
      6,
    );
  });
});
