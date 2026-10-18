import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.mjs';

let _sql = null;
let _db = null;

export function getClient() {
  if (!_sql) {
    const connectionString = process.env.DATABASE_URL || 'postgres://openpress:openpress-local-secret@127.0.0.1:5432/openpress';
    const isNeon = connectionString.includes('neon.tech');
    _sql = postgres(connectionString, {
      ssl: isNeon ? 'require' : false,
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
    _db = drizzle(_sql, { schema });
  }
  return { sql: _sql, db: _db };
}

export const db = new Proxy({}, {
  get(target, prop) {
    const { db } = getClient();
    const val = db[prop];
    return typeof val === 'function' ? val.bind(db) : val;
  }
});

export const sql = new Proxy({}, {
  get(target, prop) {
    const { sql } = getClient();
    const val = sql[prop];
    return typeof val === 'function' ? val.bind(sql) : val;
  }
});

export { schema };
export default db;
