import { Pool } from 'pg';
import { runMigrations } from './migrations';

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) throw new Error('DATABASE_URL is required.');

  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const applied = await runMigrations(pool);
    process.stdout.write(
      applied.length === 0
        ? 'Database is already up to date.\n'
        : `Applied ${applied.length} migration(s): ${applied
            .map(({ filename }) => filename)
            .join(', ')}\n`,
    );
  } finally {
    await pool.end();
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown error';
  process.stderr.write(`Migration failed: ${message}\n`);
  process.exitCode = 1;
});
