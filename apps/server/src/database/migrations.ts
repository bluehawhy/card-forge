import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { Pool } from 'pg';

const MIGRATION_LOCK_ID = 1_164_667_207;

export interface AppliedMigration {
  filename: string;
  checksum: string;
}

export async function runMigrations(
  pool: Pool,
  directory = join(__dirname, '../../migrations'),
): Promise<AppliedMigration[]> {
  const filenames = (await readdir(directory))
    .filter((filename) => /^\d+_[a-z0-9_]+\.sql$/i.test(filename))
    .sort((left, right) => left.localeCompare(right));
  const client = await pool.connect();
  const applied: AppliedMigration[] = [];

  try {
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_ID]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename text PRIMARY KEY,
        checksum char(64) NOT NULL,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    for (const filename of filenames) {
      const sql = await readFile(join(directory, filename), 'utf8');
      const checksum = createHash('sha256').update(sql).digest('hex');
      const existing = await client.query<{ checksum: string }>(
        'SELECT checksum FROM schema_migrations WHERE filename=$1',
        [filename],
      );
      const recordedChecksum = existing.rows[0]?.checksum;
      if (recordedChecksum) {
        if (recordedChecksum !== checksum) {
          throw new Error(`MIGRATION_CHECKSUM_MISMATCH:${filename}`);
        }
        continue;
      }

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (filename,checksum) VALUES ($1,$2)',
          [filename, checksum],
        );
        await client.query('COMMIT');
        applied.push({ filename, checksum });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
    return applied;
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_ID]);
    client.release();
  }
}
