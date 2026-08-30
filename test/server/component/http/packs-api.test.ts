import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  AD_REWARD_VERIFIER,
  type AdRewardVerifier,
} from '../../../../apps/server/src/ads/ad-reward.verifier';
import {
  GAME_REPOSITORY,
  type GameRepository,
} from '../../../../apps/server/src/cards/gameplay.types';
import {
  SERVER_CONFIG,
  type ServerConfig,
} from '../../../../apps/server/src/config';
import {
  PACK_REWARD_POLICY,
  type PackRewardPolicy,
} from '../../../../apps/server/src/packs/pack-reward.policy';
import { PacksController } from '../../../../apps/server/src/packs/packs.controller';
import { PacksService } from '../../../../apps/server/src/packs/packs.service';

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

describe('v2 ad pack HTTP integration', () => {
  let app: INestApplication;
  let baseUrl: string;
  const repository: jest.Mocked<GameRepository> = {
    listCards: jest.fn(),
    getCard: jest.fn(),
    sellCard: jest.fn(),
    getPackAvailability: jest.fn(),
    openPack: jest.fn(),
    enhance: jest.fn(),
    exchange: jest.fn(),
    recordAudit: jest.fn(),
  };
  const rewardPolicy: PackRewardPolicy = {
    version: 'pack-test-v2',
    draw: () => ({ element: 'FIRE', grade: 'NORMAL' }),
  };
  const adVerifier: jest.Mocked<AdRewardVerifier> = {
    verify: jest.fn(),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [PacksController],
      providers: [
        PacksService,
        { provide: GAME_REPOSITORY, useValue: repository },
        { provide: SERVER_CONFIG, useValue: config },
        { provide: PACK_REWARD_POLICY, useValue: rewardPolicy },
        { provide: AD_REWARD_VERIFIER, useValue: adVerifier },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /status에서 오늘 남은 광고 카드팩을 반환한다', async () => {
    repository.getPackAvailability.mockResolvedValue({
      packType: 'AD',
      dailyLimit: 20,
      usedToday: 0,
      remainingToday: 20,
      nextResetAt: '2026-08-28T15:00:00.000Z',
    });

    const response = await fetch(`${baseUrl}/api/v1/pack-openings/status`, {
      headers: { authorization },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({ remainingToday: 20, dailyLimit: 20 }),
    );
  });

  it('검증된 광고 완료 1건과 idempotency key로 카드 1장을 요청한다', async () => {
    adVerifier.verify.mockResolvedValue(true);
    repository.openPack.mockResolvedValue({
      card: {
        cardId: '11111111-1111-4111-8111-111111111111',
        templateId: '22222222-2222-4222-8222-222222222222',
        name: 'Fire Normal',
        element: 'FIRE',
        grade: 'NORMAL',
        imageKey: 'cards/fire/normal.webp',
        enhancementLevel: 1,
        status: 'ENHANCEABLE',
        acquiredAt: '2026-08-27T00:00:00.000Z',
      },
      replayed: false,
    });

    const response = await fetch(`${baseUrl}/api/v1/pack-openings`, {
      method: 'POST',
      headers: {
        authorization,
        'content-type': 'application/json',
        'idempotency-key': 'ad_pack_1234',
      },
      body: JSON.stringify({ adCompletionId: 'ad_completion_1234' }),
    });

    expect(response.status).toBe(201);
    expect(repository.openPack).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'ad_pack_1234',
        packType: 'AD',
        element: 'FIRE',
        grade: 'NORMAL',
        probabilityVersion: 'pack-test-v2',
        adCompletionId: 'ad_completion_1234',
      }),
    );
    expect(adVerifier.verify).toHaveBeenCalledWith({
      completionId: 'ad_completion_1234',
      purpose: 'PACK',
      subjectDigest: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
  });

  it('광고 완료 검증이 실패하면 카드 지급 저장소를 호출하지 않는다', async () => {
    adVerifier.verify.mockResolvedValue(false);

    const response = await fetch(`${baseUrl}/api/v1/pack-openings`, {
      method: 'POST',
      headers: {
        authorization,
        'content-type': 'application/json',
        'idempotency-key': 'ad_pack_rejected_1234',
      },
      body: JSON.stringify({ adCompletionId: 'ad_completion_rejected' }),
    });

    expect(response.status).toBe(403);
    expect(repository.openPack).not.toHaveBeenCalled();
  });
});
