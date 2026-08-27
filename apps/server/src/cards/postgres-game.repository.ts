import {
  ConflictException,
  Injectable,
  NotFoundException,
  type OnModuleDestroy,
  UnauthorizedException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { Pool, type PoolClient } from 'pg';
import { SERVER_CONFIG, type ServerConfig } from '../config';
import type {
  CardSaleResult,
  EnhancementResult,
  GameRepository,
  OwnedCard,
  PackAvailability,
} from './gameplay.types';

interface CardRow {
  card_id: string;
  template_id: string;
  name: string;
  element: OwnedCard['element'];
  grade: OwnedCard['grade'];
  image_key: string;
  enhancement_level: number;
  status: OwnedCard['status'];
  acquired_at: Date;
}

@Injectable()
export class PostgresGameRepository implements GameRepository, OnModuleDestroy {
  private readonly pool: Pool;
  constructor(@Inject(SERVER_CONFIG) config: ServerConfig) {
    this.pool = new Pool({ connectionString: config.databaseUrl });
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  async listCards(tokenDigest: string): Promise<OwnedCard[] | null> {
    const userId = await this.resolveUserId(this.pool, tokenDigest);
    if (!userId) return null;
    const result = await this.pool.query<CardRow>(
      `${CARD_SELECT} WHERE uc.user_id = $1 AND uc.status = 'OWNED' ORDER BY uc.acquired_at DESC`,
      [userId],
    );
    return result.rows.map(toCard);
  }

  async sellCard(
    input: Parameters<GameRepository['sellCard']>[0],
  ): Promise<CardSaleResult> {
    return this.transaction(async (client) => {
      const userId = await this.requireUser(client, input.tokenDigest);
      const claimed = await this.claimRequest(
        client,
        userId,
        'CARD_SALE',
        input.requestId,
      );
      if (!claimed) {
        const replay = await client.query<{
          response: Omit<CardSaleResult, 'replayed'>;
        }>(
          `SELECT response FROM idempotency_requests WHERE user_id=$1 AND scope='CARD_SALE' AND request_id=$2`,
          [userId, input.requestId],
        );
        const response = replay.rows[0]?.response;
        if (!response) throw new ConflictException('REQUEST_IN_PROGRESS');
        return { ...response, replayed: true };
      }

      const locked = await client.query<{ enhancement_level: number }>(
        `SELECT enhancement_level FROM user_cards WHERE id=$1 AND user_id=$2 AND status='OWNED' FOR UPDATE`,
        [input.cardId, userId],
      );
      const enhancementLevel = locked.rows[0]?.enhancement_level;
      if (enhancementLevel === undefined)
        throw new NotFoundException('CARD_NOT_FOUND_OR_NOT_SELLABLE');
      const crystalReward = saleRewardForLevel(enhancementLevel);

      await client.query(
        `UPDATE user_cards SET status='SOLD', updated_at=now() WHERE id=$1 AND user_id=$2`,
        [input.cardId, userId],
      );
      const wallet = await client.query<{ enhancement_crystal: string }>(
        'UPDATE user_wallets SET enhancement_crystal=enhancement_crystal+$2, version=version+1 WHERE user_id=$1 RETURNING enhancement_crystal::text',
        [userId, crystalReward],
      );
      const crystalBalance = Number(wallet.rows[0]?.enhancement_crystal);
      if (!Number.isSafeInteger(crystalBalance))
        throw new Error('WALLET_NOT_FOUND_OR_BALANCE_UNSAFE');
      await client.query(
        `INSERT INTO currency_ledger (user_id,currency_type,amount_delta,balance_after,reason,reference_id,request_id) VALUES ($1,'ENHANCEMENT_CRYSTAL',$2,$3,'CARD_SOLD',$4,$5)`,
        [userId, crystalReward, crystalBalance, input.cardId, input.requestId],
      );

      const response = {
        cardId: input.cardId,
        enhancementLevel,
        crystalReward,
        crystalBalance,
      };
      await this.finishRequest(
        client,
        userId,
        'CARD_SALE',
        input.requestId,
        response,
      );
      await this.insertAudit(client, userId, 'CARD_SOLD', input.requestId, {
        cardId: input.cardId,
        enhancementLevel,
        crystalReward,
      });
      return { ...response, replayed: false };
    });
  }

  async getCard(
    tokenDigest: string,
    cardId: string,
  ): Promise<OwnedCard | null | undefined> {
    const userId = await this.resolveUserId(this.pool, tokenDigest);
    if (!userId) return null;
    const result = await this.pool.query<CardRow>(
      `${CARD_SELECT} WHERE uc.user_id = $1 AND uc.id = $2`,
      [userId, cardId],
    );
    return result.rows[0] ? toCard(result.rows[0]) : undefined;
  }

  async openPack(input: Parameters<GameRepository['openPack']>[0]) {
    return this.transaction(async (client) => {
      const userId = await this.requireUser(client, input.tokenDigest);
      await this.lockUser(client, userId);
      const claimed = await this.claimRequest(
        client,
        userId,
        'PACK_OPENING',
        input.requestId,
      );
      if (!claimed) {
        const replay = await client.query<{ response: { card: OwnedCard } }>(
          `SELECT response FROM idempotency_requests WHERE user_id=$1 AND scope='PACK_OPENING' AND request_id=$2`,
          [userId, input.requestId],
        );
        const response = replay.rows[0]?.response;
        if (!response) throw new ConflictException('REQUEST_IN_PROGRESS');
        return { card: response.card, replayed: true };
      }
      const limit = input.packType === 'FREE' ? 1 : 10;
      const count = await client.query<{ count: string }>(
        `SELECT count(*)::text count FROM pack_openings WHERE user_id=$1 AND pack_type=$2 AND opened_at >= (date_trunc('day', timezone('Asia/Seoul', now())) AT TIME ZONE 'Asia/Seoul')`,
        [userId, input.packType],
      );
      if (Number(count.rows[0]?.count ?? 0) >= limit)
        throw new ConflictException('DAILY_PACK_LIMIT_REACHED');
      const template = await client.query<{ id: string }>(
        'SELECT id FROM card_templates WHERE element=$1 AND grade=$2',
        [input.element, input.grade],
      );
      const templateId = template.rows[0]?.id;
      if (!templateId) throw new NotFoundException('CARD_TEMPLATE_NOT_FOUND');
      const inserted = await client.query<CardRow>(
        `${CARD_INSERT} VALUES ($1, $2) RETURNING id AS card_id, template_id, enhancement_level, status, acquired_at`,
        [userId, templateId],
      );
      const card = await this.loadCard(
        client,
        userId,
        inserted.rows[0]?.card_id ?? '',
      );
      await client.query(
        'INSERT INTO pack_openings (user_id, request_id, pack_type, probability_version, user_card_id) VALUES ($1,$2,$3,$4,$5)',
        [
          userId,
          input.requestId,
          input.packType,
          input.probabilityVersion,
          card.cardId,
        ],
      );
      await this.finishRequest(
        client,
        userId,
        'PACK_OPENING',
        input.requestId,
        { card },
      );
      await this.insertAudit(client, userId, 'PACK_OPENED', input.requestId, {
        packType: input.packType,
        cardId: card.cardId,
      });
      return { card, replayed: false };
    });
  }

  async getPackAvailability(
    tokenDigest: string,
    packType: PackAvailability['packType'],
  ): Promise<PackAvailability | null> {
    const userId = await this.resolveUserId(this.pool, tokenDigest);
    if (!userId) return null;
    const result = await this.pool.query<{
      used_today: string;
      next_reset_at: Date;
    }>(
      `SELECT count(*)::text used_today, ((date_trunc('day', timezone('Asia/Seoul', now())) + interval '1 day') AT TIME ZONE 'Asia/Seoul') next_reset_at FROM pack_openings WHERE user_id=$1 AND pack_type=$2 AND opened_at >= (date_trunc('day', timezone('Asia/Seoul', now())) AT TIME ZONE 'Asia/Seoul')`,
      [userId, packType],
    );
    const dailyLimit = packType === 'FREE' ? 1 : 10;
    const usedToday = Number(result.rows[0]?.used_today ?? 0);
    const nextResetAt = result.rows[0]?.next_reset_at;
    if (!nextResetAt) throw new Error('PACK_RESET_TIME_UNAVAILABLE');
    return {
      packType,
      dailyLimit,
      usedToday,
      remainingToday: Math.max(0, dailyLimit - usedToday),
      nextResetAt: nextResetAt.toISOString(),
    };
  }

  async enhance(input: Parameters<GameRepository['enhance']>[0]) {
    return this.transaction(async (client) => {
      const userId = await this.requireUser(client, input.tokenDigest);
      const claimed = await this.claimRequest(
        client,
        userId,
        'ENHANCEMENT',
        input.requestId,
      );
      if (!claimed) {
        const replay = await client.query<{
          response: { card: OwnedCard | null; result: EnhancementResult };
        }>(
          `SELECT response FROM idempotency_requests WHERE user_id=$1 AND scope='ENHANCEMENT' AND request_id=$2`,
          [userId, input.requestId],
        );
        const response = replay.rows[0]?.response;
        if (!response) throw new ConflictException('REQUEST_IN_PROGRESS');
        return { ...response, replayed: true };
      }
      const locked = await client.query<{ enhancement_level: number }>(
        `SELECT enhancement_level FROM user_cards WHERE id=$1 AND user_id=$2 AND status='OWNED' FOR UPDATE`,
        [input.cardId, userId],
      );
      const level = locked.rows[0]?.enhancement_level;
      if (level === undefined) throw new NotFoundException('CARD_NOT_FOUND');
      if (level !== input.expectedLevel)
        throw new ConflictException('CARD_LEVEL_CHANGED');
      const wallet = await client.query<{ arcana_coin: string }>(
        'UPDATE user_wallets SET arcana_coin=arcana_coin-$2, version=version+1 WHERE user_id=$1 AND arcana_coin >= $2 RETURNING arcana_coin::text',
        [userId, input.coinCost],
      );
      if (!wallet.rows[0])
        throw new ConflictException('INSUFFICIENT_ARCANA_COIN');
      let card: OwnedCard | null;
      if (input.result === 'SUCCESS') {
        await client.query(
          'UPDATE user_cards SET enhancement_level=enhancement_level+1, updated_at=now() WHERE id=$1',
          [input.cardId],
        );
        card = await this.loadCard(client, userId, input.cardId);
      } else if (input.result === 'DESTROYED') {
        await client.query(
          `UPDATE user_cards SET status='DESTROYED', updated_at=now() WHERE id=$1`,
          [input.cardId],
        );
        const ash = await client.query<{ black_ash: string }>(
          'UPDATE user_wallets SET black_ash=black_ash+$2, version=version+1 WHERE user_id=$1 RETURNING black_ash::text',
          [userId, input.ashReward],
        );
        await client.query(
          `INSERT INTO currency_ledger (user_id,currency_type,amount_delta,balance_after,reason,reference_id,request_id) VALUES ($1,'BLACK_ASH',$2,$3,'CARD_DESTROYED',$4,$5)`,
          [
            userId,
            input.ashReward,
            ash.rows[0]?.black_ash ?? '0',
            input.cardId,
            input.requestId,
          ],
        );
        card = null;
      } else {
        card = await this.loadCard(client, userId, input.cardId);
      }
      await client.query(
        `INSERT INTO currency_ledger (user_id,currency_type,amount_delta,balance_after,reason,reference_id,request_id) VALUES ($1,'ARCANA_COIN',$2,$3,'CARD_ENHANCEMENT',$4,$5)`,
        [
          userId,
          -input.coinCost,
          wallet.rows[0]?.arcana_coin ?? '0',
          input.cardId,
          input.requestId,
        ],
      );
      await client.query(
        'INSERT INTO enhancement_logs (user_id,user_card_id,request_id,before_level,after_level,result,probability_version,coin_cost) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
        [
          userId,
          input.cardId,
          input.requestId,
          level,
          card?.enhancementLevel ?? null,
          input.result,
          input.probabilityVersion,
          input.coinCost,
        ],
      );
      const response = { card, result: input.result };
      await this.finishRequest(
        client,
        userId,
        'ENHANCEMENT',
        input.requestId,
        response,
      );
      await this.insertAudit(client, userId, 'CARD_ENHANCED', input.requestId, {
        cardId: input.cardId,
        result: input.result,
      });
      return { ...response, replayed: false };
    });
  }

  async exchange(input: Parameters<GameRepository['exchange']>[0]) {
    return this.transaction(async (client) => {
      const userId = await this.requireUser(client, input.tokenDigest);
      await this.lockUser(client, userId);
      const claimed = await this.claimRequest(
        client,
        userId,
        'POINT_EXCHANGE',
        input.requestId,
      );
      if (!claimed) {
        const replay = await client.query<{
          response: Omit<
            Awaited<ReturnType<GameRepository['exchange']>>,
            'replayed'
          >;
        }>(
          `SELECT response FROM idempotency_requests WHERE user_id=$1 AND scope='POINT_EXCHANGE' AND request_id=$2`,
          [userId, input.requestId],
        );
        const response = replay.rows[0]?.response;
        if (!response) throw new ConflictException('REQUEST_IN_PROGRESS');
        return { ...response, replayed: true };
      }
      const used = await client.query<{ points: string }>(
        `SELECT coalesce(sum(point_amount),0)::text points FROM point_exchanges WHERE user_id=$1 AND status IN ('PENDING','SUCCEEDED') AND created_at >= date_trunc('day',now())`,
        [userId],
      );
      if (Number(used.rows[0]?.points ?? 0) + input.pointAmount > 3)
        throw new ConflictException('DAILY_POINT_LIMIT_REACHED');
      const monthlyUsed = await client.query<{ points: string }>(
        `SELECT coalesce(sum(point_amount),0)::text points FROM point_exchanges WHERE user_id=$1 AND status IN ('PENDING','SUCCEEDED') AND created_at >= date_trunc('month',now())`,
        [userId],
      );
      if (Number(monthlyUsed.rows[0]?.points ?? 0) + input.pointAmount > 90)
        throw new ConflictException('MONTHLY_POINT_LIMIT_REACHED');
      const wallet = await client.query<{ enhancement_crystal: string }>(
        'UPDATE user_wallets SET enhancement_crystal=enhancement_crystal-$2, version=version+1 WHERE user_id=$1 AND enhancement_crystal >= $2 RETURNING enhancement_crystal::text',
        [userId, input.crystalAmount],
      );
      if (!wallet.rows[0])
        throw new ConflictException('INSUFFICIENT_ENHANCEMENT_CRYSTAL');
      const inserted = await client.query<{ id: string; status: string }>(
        'INSERT INTO point_exchanges (user_id,request_id,crystal_amount,point_amount) VALUES ($1,$2,$3,$4) RETURNING id,status',
        [userId, input.requestId, input.crystalAmount, input.pointAmount],
      );
      const exchangeId = inserted.rows[0]?.id;
      if (!exchangeId) throw new Error('POINT_EXCHANGE_INSERT_FAILED');
      await client.query(
        `INSERT INTO currency_ledger (user_id,currency_type,amount_delta,balance_after,reason,reference_id,request_id) VALUES ($1,'ENHANCEMENT_CRYSTAL',$2,$3,'POINT_EXCHANGE',$4,$5)`,
        [
          userId,
          -input.crystalAmount,
          wallet.rows[0]?.enhancement_crystal ?? '0',
          exchangeId,
          input.requestId,
        ],
      );
      const response = {
        exchangeId,
        pointAmount: input.pointAmount,
        crystalAmount: input.crystalAmount,
        status: inserted.rows[0]?.status ?? 'PENDING',
      };
      await this.finishRequest(
        client,
        userId,
        'POINT_EXCHANGE',
        input.requestId,
        response,
      );
      await this.insertAudit(
        client,
        userId,
        'POINT_EXCHANGE_REQUESTED',
        input.requestId,
        { exchangeId, pointAmount: input.pointAmount },
      );
      return { ...response, replayed: false };
    });
  }

  async recordAudit(
    input: Parameters<GameRepository['recordAudit']>[0],
  ): Promise<void> {
    const userId = input.tokenDigest
      ? await this.resolveUserId(this.pool, input.tokenDigest)
      : null;
    await this.pool.query(
      'INSERT INTO audit_events (user_id,event_type,request_id,details) VALUES ($1,$2,$3,$4)',
      [userId, input.eventType, input.requestId ?? null, input.details ?? {}],
    );
  }

  private async transaction<T>(
    work: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async resolveUserId(
    queryable: Pick<Pool, 'query'> | PoolClient,
    tokenDigest: string,
  ): Promise<string | null> {
    const result = await queryable.query<{ id: string }>(
      `SELECT u.id FROM users u JOIN user_sessions s ON s.user_id=u.id WHERE s.token_digest=$1 AND s.revoked_at IS NULL AND s.expires_at>now() AND u.account_status='ACTIVE'`,
      [tokenDigest],
    );
    return result.rows[0]?.id ?? null;
  }

  private async requireUser(
    client: PoolClient,
    tokenDigest: string,
  ): Promise<string> {
    const userId = await this.resolveUserId(client, tokenDigest);
    if (!userId) throw new UnauthorizedException('INVALID_OR_EXPIRED_SESSION');
    return userId;
  }

  private async lockUser(client: PoolClient, userId: string): Promise<void> {
    await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [userId]);
  }

  private async claimRequest(
    client: PoolClient,
    userId: string,
    scope: string,
    requestId: string,
  ): Promise<boolean> {
    const result = await client.query(
      'INSERT INTO idempotency_requests (user_id,scope,request_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
      [userId, scope, requestId],
    );
    return result.rowCount === 1;
  }

  private async finishRequest(
    client: PoolClient,
    userId: string,
    scope: string,
    requestId: string,
    response: unknown,
  ): Promise<void> {
    await client.query(
      'UPDATE idempotency_requests SET response=$4 WHERE user_id=$1 AND scope=$2 AND request_id=$3',
      [userId, scope, requestId, response],
    );
  }

  private async loadCard(
    client: PoolClient,
    userId: string,
    cardId: string,
  ): Promise<OwnedCard> {
    const result = await client.query<CardRow>(
      `${CARD_SELECT} WHERE uc.user_id=$1 AND uc.id=$2`,
      [userId, cardId],
    );
    const row = result.rows[0];
    if (!row) throw new NotFoundException('CARD_NOT_FOUND');
    return toCard(row);
  }

  private async insertAudit(
    client: PoolClient,
    userId: string,
    eventType: string,
    requestId: string,
    details: Record<string, unknown>,
  ): Promise<void> {
    await client.query(
      'INSERT INTO audit_events (user_id,event_type,request_id,details) VALUES ($1,$2,$3,$4)',
      [userId, eventType, requestId, details],
    );
  }
}

const CARD_SELECT =
  'SELECT uc.id card_id,ct.id template_id,ct.name,ct.element,ct.grade,ct.image_key,uc.enhancement_level,uc.status,uc.acquired_at FROM user_cards uc JOIN card_templates ct ON ct.id=uc.template_id';
const CARD_INSERT = 'INSERT INTO user_cards (user_id,template_id)';

function toCard(row: CardRow): OwnedCard {
  return {
    cardId: row.card_id,
    templateId: row.template_id,
    name: row.name,
    element: row.element,
    grade: row.grade,
    imageKey: row.image_key,
    enhancementLevel: row.enhancement_level,
    status: row.status,
    acquiredAt: row.acquired_at.toISOString(),
  };
}

const CARD_SALE_REWARDS = [
  30, 60, 120, 300, 600, 1200, 2400, 4500, 7500, 15000, 30000,
] as const;

export function saleRewardForLevel(level: number): number {
  const reward = CARD_SALE_REWARDS[level];
  if (reward === undefined) throw new Error('INVALID_ENHANCEMENT_LEVEL');
  return reward;
}
