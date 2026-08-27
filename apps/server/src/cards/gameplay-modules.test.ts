import {
  BadRequestException,
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { ServerConfig } from '../config';
import { EnhancementService } from '../enhancement/enhancement.service';
import { ExchangeService } from '../exchange/exchange.service';
import { FraudDetectionService } from '../fraud-detection/fraud-detection.service';
import { UNCONFIGURED_PACK_REWARD_POLICY } from '../packs/pack-reward.policy';
import { PacksService } from '../packs/packs.service';
import { CardsService } from './cards.service';
import type { GameRepository, OwnedCard } from './gameplay.types';
import { saleRewardForLevel } from './postgres-game.repository';

const config: ServerConfig = {
  port: 3000,
  databaseUrl: 'postgres://test',
  sessionPepper: 'a'.repeat(32),
  sessionTtlSeconds: 3600,
  tossVerifyUrl: 'https://example.test/verify',
  tossMtlsCertPath: 'cert',
  tossMtlsKeyPath: 'key',
  tossMtlsCaPath: 'ca',
};

const authorization = `Bearer ${'a'.repeat(43)}`;
const requestId = 'request_1234';

function createRepository(): jest.Mocked<GameRepository> {
  return {
    listCards: jest.fn(),
    getCard: jest.fn(),
    sellCard: jest.fn(),
    getPackAvailability: jest.fn(),
    openPack: jest.fn(),
    enhance: jest.fn(),
    exchange: jest.fn(),
    recordAudit: jest.fn(),
  };
}

function card(level = 0): OwnedCard {
  return {
    cardId: '11111111-1111-1111-1111-111111111111',
    templateId: '22222222-2222-2222-2222-222222222222',
    name: 'Fire Normal',
    element: 'FIRE',
    grade: 'NORMAL',
    imageKey: 'cards/fire/normal.webp',
    enhancementLevel: level,
    status: 'OWNED',
    acquiredAt: new Date(0).toISOString(),
  };
}

describe('server gameplay modules', () => {
  it('강화 단계별 판매 결정량은 게임 규칙 보상표와 일치한다', () => {
    expect(
      Array.from({ length: 11 }, (_, level) => saleRewardForLevel(level)),
    ).toEqual([30, 60, 120, 300, 600, 1200, 2400, 4500, 7500, 15000, 30000]);
  });

  it('카드 판매 요청은 토큰 digest와 idempotency key를 저장소에 전달한다', async () => {
    const repository = createRepository();
    repository.sellCard.mockResolvedValue({
      cardId: '11111111-1111-4111-8111-111111111111',
      enhancementLevel: 3,
      crystalReward: 300,
      crystalBalance: 3200,
      replayed: false,
    });
    const service = new CardsService(repository, config);

    await service.sell(
      authorization,
      requestId,
      '11111111-1111-4111-8111-111111111111',
    );

    expect(repository.sellCard).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId,
        cardId: '11111111-1111-4111-8111-111111111111',
        tokenDigest: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    );
  });

  it('잘못된 카드 ID는 판매 저장소 호출 전에 거절한다', () => {
    const repository = createRepository();
    const service = new CardsService(repository, config);

    expect(() => service.sell(authorization, requestId, 'not-a-card')).toThrow(
      BadRequestException,
    );
    expect(repository.sellCard).not.toHaveBeenCalled();
  });

  it('미확정 팩 등급 확률로는 카드를 발급하지 않는다', () => {
    const repository = createRepository();
    const service = new PacksService(
      repository,
      config,
      UNCONFIGURED_PACK_REWARD_POLICY,
    );

    expect(() => service.open(authorization, requestId, 'FREE')).toThrow(
      ServiceUnavailableException,
    );
    expect(repository.openPack).not.toHaveBeenCalled();
  });

  it('지원하지 않는 팩 종류는 저장소 호출 전에 거절한다', () => {
    const repository = createRepository();
    const service = new PacksService(
      repository,
      config,
      UNCONFIGURED_PACK_REWARD_POLICY,
    );

    expect(() => service.open(authorization, requestId, 'PAID')).toThrow(
      BadRequestException,
    );
    expect(repository.openPack).not.toHaveBeenCalled();
  });

  it('+10 카드는 난수 판정이나 DB 변경 전에 강화 요청을 거절한다', async () => {
    const repository = createRepository();
    repository.getCard.mockResolvedValue(card(10));
    const service = new EnhancementService(repository, config);

    await expect(
      service.enhance(
        authorization,
        requestId,
        '11111111-1111-1111-1111-111111111111',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.enhance).not.toHaveBeenCalled();
  });

  it('미확정 강화 비용·파괴 보상으로는 강화하지 않는다', async () => {
    const repository = createRepository();
    repository.getCard.mockResolvedValue(card(0));
    const service = new EnhancementService(repository, config);

    await expect(
      service.enhance(
        authorization,
        requestId,
        '11111111-1111-1111-1111-111111111111',
      ),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(repository.enhance).not.toHaveBeenCalled();
  });

  it('포인트 교환은 1P당 결정 3,000개를 서버에서 계산한다', async () => {
    const repository = createRepository();
    repository.exchange.mockResolvedValue({
      exchangeId: 'exchange-id',
      pointAmount: 2,
      crystalAmount: 6000,
      status: 'PENDING',
      replayed: false,
    });
    const service = new ExchangeService(repository, config);

    await service.request(authorization, requestId, 2);

    expect(repository.exchange).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId,
        pointAmount: 2,
        crystalAmount: 6000,
      }),
    );
  });

  it('일일 한도를 넘는 단일 교환 요청은 저장소 호출 전에 거절한다', () => {
    const repository = createRepository();
    const service = new ExchangeService(repository, config);

    expect(() => service.request(authorization, requestId, 4)).toThrow(
      BadRequestException,
    );
    expect(repository.exchange).not.toHaveBeenCalled();
  });

  it('감사 서비스는 원문 access token 대신 digest만 저장 계층에 전달한다', async () => {
    const repository = createRepository();
    repository.recordAudit.mockResolvedValue();
    const service = new FraudDetectionService(repository, config);

    await service.record(authorization, 'SUSPICIOUS_REQUEST', requestId, {
      reason: 'rate',
    });

    const input = repository.recordAudit.mock.calls[0]?.[0];
    expect(input?.tokenDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(input?.tokenDigest).not.toContain('a'.repeat(43));
  });
});
