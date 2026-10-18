// Creates the roles and the first Super User on a deployed database. Safe to re-run.
// Usage: DATABASE_URL=... SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... node scripts/seed-admin.mjs
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { getClient } from '../db/client.mjs';
import { ROLES } from './roles.mjs';

const { SEED_ADMIN_EMAIL: email, SEED_ADMIN_PASSWORD: password } = process.env;
if (!email || !password || password.length < 12) throw new Error('Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (12+ characters)');
const pg = getClient().sql;
const now = new Date().toISOString();
for (const [roleId, permissions] of Object.entries(ROLES)) {
  await pg`INSERT INTO roles (role_id, permissions, created_at, updated_at) VALUES (${roleId}, ${JSON.stringify(permissions)}::jsonb, ${now}, ${now}) ON CONFLICT (role_id) DO NOTHING`;
}
const rows = await pg`INSERT INTO users (user_id, email, full_name, password, role, status, created_at, updated_at)
  VALUES (${randomUUID()}, ${email}, ${'Admin'}, ${await bcrypt.hash(password, 10)}, ${'Super User'}, ${'active'}, ${now}, ${now})
  ON CONFLICT (email) DO NOTHING RETURNING email`;
console.log(`${email} ${rows.length ? 'created' : 'already exists'}`);
await pg.end({ timeout: 1 });
