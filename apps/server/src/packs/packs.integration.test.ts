import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GAME_REPOSITORY, type GameRepository } from '../cards/gameplay.types';
import { SERVER_CONFIG, type ServerConfig } from '../config';
import {
  PACK_REWARD_POLICY,
  type PackRewardPolicy,
} from './pack-reward.policy';
import { PacksController } from './packs.controller';
import { PacksService } from './packs.service';

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

describe('free pack HTTP integration', () => {
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
    version: 'pack-test-v1',
    draw: () => ({ element: 'FIRE', grade: 'NORMAL' }),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [PacksController],
      providers: [
        PacksService,
        { provide: GAME_REPOSITORY, useValue: repository },
        { provide: SERVER_CONFIG, useValue: config },
        { provide: PACK_REWARD_POLICY, useValue: rewardPolicy },
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

  it('GET /free/status에서 오늘 남은 무료팩을 반환한다', async () => {
    repository.getPackAvailability.mockResolvedValue({
      packType: 'FREE',
      dailyLimit: 1,
      usedToday: 0,
      remainingToday: 1,
      nextResetAt: '2026-08-28T15:00:00.000Z',
    });

    const response = await fetch(
      `${baseUrl}/api/v1/pack-openings/free/status`,
      {
        headers: { authorization },
      },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({ remainingToday: 1, dailyLimit: 1 }),
    );
  });

  it('POST /free가 서버 정책 결과와 idempotency key로 카드 발급을 요청한다', async () => {
    repository.openPack.mockResolvedValue({
      card: {
        cardId: '11111111-1111-4111-8111-111111111111',
        templateId: '22222222-2222-4222-8222-222222222222',
        name: 'Fire Normal',
        element: 'FIRE',
        grade: 'NORMAL',
        imageKey: 'cards/fire/normal.webp',
        enhancementLevel: 0,
        status: 'OWNED',
        acquiredAt: '2026-08-27T00:00:00.000Z',
      },
      replayed: false,
    });

    const response = await fetch(`${baseUrl}/api/v1/pack-openings/free`, {
      method: 'POST',
      headers: { authorization, 'idempotency-key': 'free_pack_1234' },
    });

    expect(response.status).toBe(201);
    expect(repository.openPack).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'free_pack_1234',
        packType: 'FREE',
        element: 'FIRE',
        grade: 'NORMAL',
        probabilityVersion: 'pack-test-v1',
      }),
    );
  });
});
