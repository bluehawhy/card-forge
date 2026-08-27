import { ConflictException } from '@nestjs/common';
import type { PoolClient } from 'pg';
import type { ServerConfig } from '../config';
import { PostgresGameRepository } from './postgres-game.repository';

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

describe('PostgresGameRepository card sale', () => {
  it('카드 상태·결정 지갑·원장·감사 로그를 한 트랜잭션으로 확정한다', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.startsWith('SELECT u.id')) return { rows: [{ id: 'user-id' }] };
      if (sql.startsWith('INSERT INTO idempotency_requests'))
        return { rows: [], rowCount: 1 };
      if (sql.startsWith('SELECT enhancement_level'))
        return { rows: [{ enhancement_level: 3 }] };
      if (sql.startsWith('UPDATE user_wallets'))
        return { rows: [{ enhancement_crystal: '3200' }] };
      return { rows: [], rowCount: 1 };
    });
    const client = {
      query,
      release: jest.fn(),
    } as unknown as PoolClient;
    const repository = new PostgresGameRepository(config);
    Object.assign(repository, {
      pool: { connect: jest.fn().mockResolvedValue(client) },
    });

    const result = await repository.sellCard({
      tokenDigest: 'digest',
      requestId: 'request_1234',
      cardId: '11111111-1111-4111-8111-111111111111',
    });

    expect(result).toEqual({
      cardId: '11111111-1111-4111-8111-111111111111',
      enhancementLevel: 3,
      crystalReward: 300,
      crystalBalance: 3200,
      replayed: false,
    });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("SET status='SOLD'"),
      ['11111111-1111-4111-8111-111111111111', 'user-id'],
    );
    expect(query).toHaveBeenCalledWith(expect.stringContaining("'CARD_SOLD'"), [
      'user-id',
      300,
      3200,
      '11111111-1111-4111-8111-111111111111',
      'request_1234',
    ]);
    expect(query).toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });
});

describe('PostgresGameRepository free pack availability', () => {
  it('서울 시간 기준 오늘 사용량과 다음 초기화 시각을 반환한다', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.startsWith('SELECT u.id')) return { rows: [{ id: 'user-id' }] };
      return {
        rows: [
          {
            used_today: '0',
            next_reset_at: new Date('2026-08-28T15:00:00.000Z'),
          },
        ],
      };
    });
    const repository = new PostgresGameRepository(config);
    Object.assign(repository, { pool: { query } });

    await expect(
      repository.getPackAvailability('digest', 'FREE'),
    ).resolves.toEqual({
      packType: 'FREE',
      dailyLimit: 1,
      usedToday: 0,
      remainingToday: 1,
      nextResetAt: '2026-08-28T15:00:00.000Z',
    });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("timezone('Asia/Seoul', now())"),
      ['user-id', 'FREE'],
    );
  });

  it('오늘 이미 무료팩을 열었다면 카드 발급 전에 롤백한다', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.startsWith('SELECT u.id')) return { rows: [{ id: 'user-id' }] };
      if (sql.startsWith('INSERT INTO idempotency_requests'))
        return { rows: [], rowCount: 1 };
      if (sql.startsWith('SELECT count(*)')) return { rows: [{ count: '1' }] };
      return { rows: [], rowCount: 1 };
    });
    const client = {
      query,
      release: jest.fn(),
    } as unknown as PoolClient;
    const repository = new PostgresGameRepository(config);
    Object.assign(repository, {
      pool: { connect: jest.fn().mockResolvedValue(client) },
    });

    await expect(
      repository.openPack({
        tokenDigest: 'digest',
        requestId: 'free_pack_1234',
        packType: 'FREE',
        element: 'FIRE',
        grade: 'NORMAL',
        probabilityVersion: 'pack-test-v1',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(query).toHaveBeenCalledWith('ROLLBACK');
    expect(query).not.toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO user_cards'),
      expect.anything(),
    );
    expect(client.release).toHaveBeenCalled();
  });
});
