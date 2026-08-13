import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '@/lib/env';

declare global {
  // eslint-disable-next-line no-var
  var __dbCache: Map<string, PostgresJsDatabase<typeof schema>> | undefined;
}

export function getDb(): PostgresJsDatabase<typeof schema> {
  const url = env.DATABASE_URL;

  if (!global.__dbCache) {
    global.__dbCache = new Map();
  }

  if (!global.__dbCache.has(url)) {
    const client = postgres(url, { max: 10 });
    const instance = drizzle(client, { schema });
    global.__dbCache.set(url, instance);
  }

  return global.__dbCache.get(url)!;
}

export { schema };
