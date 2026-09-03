import {
  PACK_GRADE_WEIGHTS_V2,
  PACK_PROBABILITY_SCALE,
  PACK_PROBABILITY_VERSION_V2,
  V2PackRewardPolicy,
} from '../../../apps/server/src/packs/v2-pack-reward.policy';

function policyWithTickets(...tickets: number[]): V2PackRewardPolicy {
  let cursor = 0;
  return new V2PackRewardPolicy(() => {
    const ticket = tickets[cursor];
    cursor += 1;
    if (ticket === undefined) throw new Error('TEST_TICKET_MISSING');
    return ticket;
  });
}

describe('V2PackRewardPolicy', () => {
  it('NestJS가 별도 난수 설정 없이 실제 정책을 생성한다', async () => {
    const module = await Test.createTestingModule({
      providers: [V2PackRewardPolicy],
    }).compile();

    expect(module.get(V2PackRewardPolicy)).toBeInstanceOf(V2PackRewardPolicy);
    await module.close();
  });

  it('등급 가중치 합계가 정확히 100%다', () => {
    expect(
      PACK_GRADE_WEIGHTS_V2.reduce((sum, entry) => sum + entry.weight, 0),
    ).toBe(PACK_PROBABILITY_SCALE);
  });

  it.each([
    [0, 'NORMAL'],
    [5_999, 'NORMAL'],
    [6_000, 'MAGIC'],
    [9_312, 'MAGIC'],
    [9_313, 'RARE'],
    [9_912, 'RARE'],
    [9_913, 'SUPER_RARE'],
    [9_955, 'SUPER_RARE'],
    [9_956, 'UNIQUE'],
    [9_988, 'UNIQUE'],
    [9_989, 'LEGENDARY'],
    [9_999, 'LEGENDARY'],
  ])('등급 경계값 %i를 %s로 판정한다', (gradeTicket, expectedGrade) => {
    const policy = policyWithTickets(gradeTicket as number, 0);
    expect(policy.draw().grade).toBe(expectedGrade);
  });

  it.each([
    [0, 'FIRE'],
    [1, 'WATER'],
    [2, 'EARTH'],
    [3, 'WIND'],
    [4, 'LIGHT'],
    [5, 'DARK'],
  ])('원소 인덱스 %i를 %s로 판정한다', (elementTicket, expectedElement) => {
    const policy = policyWithTickets(0, elementTicket as number);
    expect(policy.draw()).toEqual({
      grade: 'NORMAL',
      element: expectedElement,
    });
  });

  it('저장소에 기록할 고정 확률 버전을 제공한다', () => {
    expect(policyWithTickets(0, 0).version).toBe(PACK_PROBABILITY_VERSION_V2);
  });

  it('난수 공급자가 범위를 벗어난 값을 반환하면 안전하게 중단한다', () => {
    expect(() => policyWithTickets(10_000, 0).draw()).toThrow(
      'INVALID_SECURE_RANDOM_VALUE',
    );
    expect(() => policyWithTickets(0, 6).draw()).toThrow(
      'INVALID_SECURE_RANDOM_VALUE',
    );
  });
});
import { Test } from '@nestjs/testing';
