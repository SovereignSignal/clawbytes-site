import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import * as schema from '@/db/schema';
import { setDb, type Db } from '@/db/client';

/** Fresh in-memory Postgres with migrations applied, installed as the app database. */
export async function createTestDb(): Promise<Db> {
  const client = new PGlite();
  const pglite = drizzle(client, { schema });
  await migrate(pglite, { migrationsFolder: path.join(process.cwd(), 'drizzle') });
  const db = pglite as unknown as Db;
  setDb(db);
  return db;
}
