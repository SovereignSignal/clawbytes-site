import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export type Db = NodePgDatabase<typeof schema>;

let db: Db | null = null;
let pool: Pool | null = null;

/** Tests swap in a PGlite-backed instance. */
export function setDb(override: Db): void {
  db = override;
}

export function getDb(): Db {
  if (!db) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set');
    }
    pool = new Pool({ connectionString, connectionTimeoutMillis: 5_000 });
    db = drizzle(pool, { schema });
  }
  return db;
}

/** One-shot scripts call this so the process can exit. */
export async function closeDb(): Promise<void> {
  await pool?.end();
  pool = null;
  db = null;
}
