import { Client } from 'pg';

export function pgOptions() {
  const ssl = process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined;
  if (process.env.DATABASE_URL) return { type: 'postgres' as const, url: process.env.DATABASE_URL, ssl };
  return {
    type: 'postgres' as const,
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'customs',
    ssl,
  };
}

export async function ensureDatabase() {
  const o = pgOptions() as { url?: string; host?: string; port?: number; username?: string; password?: string; database?: string; ssl?: any };
  let target = o.database;
  const base: Record<string, unknown> = { ssl: o.ssl };
  if (o.url) {
    const u = new URL(o.url);
    target = u.pathname.slice(1);
    u.pathname = '/postgres';
    base.connectionString = u.toString();
  } else Object.assign(base, { host: o.host, port: o.port, user: o.username, password: o.password, database: 'postgres' });

  const client = new Client(base);
  try {
    await client.connect();
    const { rowCount } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [target]);
    if (!rowCount) {
      await client.query(`CREATE DATABASE "${String(target).replace(/"/g, '""')}"`);
      console.log(`Database "${target}" created`);
    }
  } catch (e) {
    console.warn(`Could not verify/create DB: ${(e as Error).message}`);
  } finally {
    await client.end().catch(() => undefined);
  }
}
