import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { Pool, type PoolClient } from 'pg';
import { SERVER_CONFIG, type ServerConfig } from '../config';
import type { UserProfile, UserRepository } from './membership.types';

interface UserRow {
  id: string;
  display_name: string;
  account_status: 'ACTIVE' | 'SUSPENDED' | 'WITHDRAWN';
  created_at: Date;
  last_signed_in_at: Date;
}

@Injectable()
export class PostgresUserRepository implements UserRepository, OnModuleDestroy {
  private readonly pool: Pool;
  constructor(@Inject(SERVER_CONFIG) config: ServerConfig) {
    this.pool = new Pool({ connectionString: config.databaseUrl });
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  async initializeUser(
    stableUserDigest: string,
    tokenDigest: string,
    expiresAt: Date,
  ) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const inserted = await client.query<UserRow>(
        `INSERT INTO users (toss_game_user_digest, display_name)
         VALUES ($1, '초보 대장장이')
         ON CONFLICT (toss_game_user_digest) DO NOTHING
         RETURNING *`,
        [stableUserDigest],
      );
      const isNewUser = inserted.rowCount === 1;
      const insertedUser = inserted.rows[0];
      const user =
        isNewUser && insertedUser
          ? insertedUser
          : await this.loadAndTouchUser(client, stableUserDigest);
      await client.query(
        'INSERT INTO user_wallets (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING',
        [user.id],
      );
      await client.query(
        'INSERT INTO user_sessions (user_id, token_digest, expires_at) VALUES ($1, $2, $3)',
        [user.id, tokenDigest, expiresAt],
      );
      await client.query('COMMIT');
      return { user: toProfile(user), isNewUser };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async findUserBySessionToken(
    tokenDigest: string,
  ): Promise<UserProfile | null> {
    const result = await this.pool.query<UserRow>(
      `SELECT u.* FROM users u JOIN user_sessions s ON s.user_id = u.id
       WHERE s.token_digest = $1 AND s.revoked_at IS NULL AND s.expires_at > now()
         AND u.account_status = 'ACTIVE'`,
      [tokenDigest],
    );
    return result.rows[0] ? toProfile(result.rows[0]) : null;
  }

  async updateDisplayName(
    tokenDigest: string,
    displayName: string,
  ): Promise<UserProfile | null> {
    const result = await this.pool.query<UserRow>(
      `UPDATE users u SET display_name = $2
       FROM user_sessions s WHERE s.user_id = u.id AND s.token_digest = $1
         AND s.revoked_at IS NULL AND s.expires_at > now() AND u.account_status = 'ACTIVE'
       RETURNING u.*`,
      [tokenDigest, displayName],
    );
    return result.rows[0] ? toProfile(result.rows[0]) : null;
  }

  async revokeSession(tokenDigest: string): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE user_sessions SET revoked_at = now()
       WHERE token_digest = $1 AND revoked_at IS NULL`,
      [tokenDigest],
    );
    return (result.rowCount ?? 0) > 0;
  }

  private async loadAndTouchUser(
    client: PoolClient,
    digest: string,
  ): Promise<UserRow> {
    const result = await client.query<UserRow>(
      `UPDATE users SET last_signed_in_at = now()
       WHERE toss_game_user_digest = $1 RETURNING *`,
      [digest],
    );
    const user = result.rows[0];
    if (!user) throw new Error('User upsert failed.');
    if (user.account_status !== 'ACTIVE')
      throw new Error('User account is not active.');
    return user;
  }
}

function toProfile(row: UserRow): UserProfile {
  return {
    userId: row.id,
    displayName: row.display_name,
    accountStatus: row.account_status,
    createdAt: row.created_at.toISOString(),
    lastSignedInAt: row.last_signed_in_at.toISOString(),
  };
}
