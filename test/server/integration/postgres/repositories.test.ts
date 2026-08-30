import { Pool } from 'pg';
import { PostgresGameRepository } from '../../../../apps/server/src/cards/postgres-game.repository';
import type { ServerConfig } from '../../../../apps/server/src/config';
import { runMigrations } from '../../../../apps/server/src/database/migrations';
import { PostgresUserRepository } from '../../../../apps/server/src/membership/postgres-user.repository';

const databaseUrl = process.env.TEST_DATABASE_URL?.trim();
if (!databaseUrl) {
  throw new Error(
    'TEST_DATABASE_URL is required for the real PostgreSQL integration test.',
  );
}

const parsedDatabaseUrl = new URL(databaseUrl);
if (!parsedDatabaseUrl.pathname.slice(1).endsWith('_test')) {
  throw new Error('TEST_DATABASE_URL database name must end with _test.');
}

const config: ServerConfig = {
  port: 3000,
  databaseUrl,
  sessionPepper: 'a-secure-test-pepper-with-more-than-32-characters',
  sessionTtlSeconds: 3600,
  tossApiBaseUrl: 'https://apps-in-toss-api.toss.im',
  tossVerifyUrl:
    'https://apps-in-toss-api.toss.im/api-partner/v1/apps-in-toss/users/anon-key/verify',
  tossMtlsCertPath: 'unused-in-database-tests',
  tossMtlsKeyPath: 'unused-in-database-tests',
};

describe('real PostgreSQL repositories', () => {
  const adminPool = new Pool({ connectionString: databaseUrl, max: 6 });
  let users: PostgresUserRepository;
  let game: PostgresGameRepository;

  beforeAll(async () => {
    await adminPool.query('DROP SCHEMA public CASCADE');
    await adminPool.query('CREATE SCHEMA public');
    const applied = await runMigrations(adminPool);
    expect(applied.map(({ filename }) => filename)).toEqual([
      '001_user_membership.sql',
      '002_gameplay_modules.sql',
      '003_game_rules_v2.sql',
    ]);
    users = new PostgresUserRepository(config);
    game = new PostgresGameRepository(config);
  });

  afterAll(async () => {
    await users?.onModuleDestroy();
    await game?.onModuleDestroy();
    await adminPool.end();
  });

  it('모든 마이그레이션을 적용하고 재실행해도 중복 적용하지 않는다', async () => {
    await expect(runMigrations(adminPool)).resolves.toEqual([]);
    const tables = await adminPool.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema='public' ORDER BY table_name`,
    );
    expect(tables.rows.map(({ table_name }) => table_name)).toEqual(
      expect.arrayContaining([
        'users',
        'user_wallets',
        'user_sessions',
        'card_templates',
        'user_cards',
        'pack_openings',
        'enhancement_logs',
        'point_exchanges',
        'card_sale_batches',
        'schema_migrations',
      ]),
    );
    const templates = await adminPool.query<{ count: string }>(
      'SELECT count(*)::text count FROM card_templates',
    );
    expect(Number(templates.rows[0]?.count)).toBe(36);
  });

  it('회원·지갑·세션을 실제 트랜잭션으로 생성한다', async () => {
    const result = await users.initializeUser(
      'digest-membership',
      'token-membership',
      new Date(Date.now() + 60_000),
    );
    expect(result.isNewUser).toBe(true);
    await expect(
      users.findUserBySessionToken('token-membership'),
    ).resolves.toMatchObject({ userId: result.user.userId });
    const wallet = await adminPool.query(
      'SELECT user_id FROM user_wallets WHERE user_id=$1',
      [result.user.userId],
    );
    expect(wallet.rowCount).toBe(1);
  });

  it('세션 저장 실패 시 새 회원과 지갑까지 롤백한다', async () => {
    await expect(
      users.initializeUser(
        'digest-rollback',
        'token-membership',
        new Date(Date.now() + 60_000),
      ),
    ).rejects.toMatchObject({ code: '23505' });
    const result = await adminPool.query<{ count: string }>(
      'SELECT count(*)::text count FROM users WHERE toss_game_user_digest=$1',
      ['digest-rollback'],
    );
    expect(Number(result.rows[0]?.count)).toBe(0);
  });

  it('동시에 같은 회원을 초기화해도 회원은 하나이고 세션은 각각 생성한다', async () => {
    const expiresAt = new Date(Date.now() + 60_000);
    const results = await Promise.all([
      users.initializeUser(
        'digest-concurrent',
        'token-concurrent-a',
        expiresAt,
      ),
      users.initializeUser(
        'digest-concurrent',
        'token-concurrent-b',
        expiresAt,
      ),
    ]);
    expect(new Set(results.map(({ user }) => user.userId)).size).toBe(1);
    expect(results.filter(({ isNewUser }) => isNewUser)).toHaveLength(1);
    const sessions = await adminPool.query<{ count: string }>(
      `SELECT count(*)::text count FROM user_sessions s
       JOIN users u ON u.id=s.user_id WHERE u.toss_game_user_digest=$1`,
      ['digest-concurrent'],
    );
    expect(Number(sessions.rows[0]?.count)).toBe(2);
  });

  it('동일 카드팩 요청을 동시에 보내도 카드와 광고 보상을 한 번만 만든다', async () => {
    await users.initializeUser(
      'digest-pack',
      'token-pack',
      new Date(Date.now() + 60_000),
    );
    const input = {
      tokenDigest: 'token-pack',
      requestId: 'pack-request-concurrent',
      packType: 'AD' as const,
      element: 'FIRE' as const,
      grade: 'NORMAL' as const,
      probabilityVersion: 'postgres-integration-v1',
      adCompletionId: 'ad-completion-concurrent',
    };
    const results = await Promise.all([
      game.openPack(input),
      game.openPack(input),
    ]);
    expect(results.filter(({ replayed }) => replayed)).toHaveLength(1);
    expect(new Set(results.map(({ card }) => card.cardId)).size).toBe(1);
    const cards = await adminPool.query<{ count: string }>(
      `SELECT count(*)::text count FROM user_cards uc
       JOIN users u ON u.id=uc.user_id WHERE u.toss_game_user_digest=$1`,
      ['digest-pack'],
    );
    expect(Number(cards.rows[0]?.count)).toBe(1);
  });
});
