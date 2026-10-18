// Creates the S3-compatible buckets, runs Drizzle push, and creates the first super user.
// Safe to re-run: existing buckets and users are left untouched.
// Usage: npm run setup:local   (needs `npm run dev:infra` first)
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { S3Client, HeadBucketCommand, CreateBucketCommand, PutBucketPolicyCommand, PutBucketCorsCommand } from '@aws-sdk/client-s3';
import bcrypt from 'bcryptjs';
import { execSync } from 'node:child_process';

const envFile = fileURLToPath(new URL('../.env.local', import.meta.url));
if (existsSync(envFile)) process.loadEnvFile(envFile);
const env = process.env;

const BUCKETS = [
  { name: env.S3_DAM_BUCKET_NAME, publicRead: true },
  { name: env.S3_WEBSITE_BUCKET_NAME, publicRead: true },
  { name: env.S3_REKOGNITION_BUCKET_NAME },
].filter((b) => b.name);

const EDITORIAL = ['Raise a story', 'Ideas', 'In progress', 'In review', 'Ready to publish', 'Published'];
const LIBRARY = ['Media upload', 'Media access'];
const ADMIN = ['Users', 'Roles'];
const grant = (rows, actions) => Object.fromEntries(rows.map((r) => [r, Object.fromEntries(['Create', 'Open', 'Edit', 'Decide'].map((a) => [a, actions.includes(a)]))]));
const ALL = ['Create', 'Open', 'Edit', 'Decide'];
const ROLES = {
  'Super User': { editorial: grant(EDITORIAL, ALL), library: grant(LIBRARY, ALL), admin: grant(ADMIN, ALL) },
  Admin: { editorial: grant(EDITORIAL, ALL), library: grant(LIBRARY, ALL), admin: grant(ADMIN, ALL) },
  Editor: { editorial: grant(EDITORIAL, ALL), library: grant(LIBRARY, ALL) },
  Reporter: { editorial: grant(['Raise a story', 'Ideas', 'In progress'], ['Create', 'Open', 'Edit']), library: grant(LIBRARY, ['Create', 'Open']) },
};

const s3 = new S3Client({ forcePathStyle: true });

async function createBuckets() {
  for (const b of BUCKETS) {
    try {
      await s3.send(new HeadBucketCommand({ Bucket: b.name }));
      console.log(`bucket ${b.name} (exists)`);
    } catch {
      await s3.send(new CreateBucketCommand({ Bucket: b.name }));
      console.log(`bucket ${b.name} (created)`);
    }
    if (b.publicRead) {
      await s3.send(new PutBucketPolicyCommand({
        Bucket: b.name,
        Policy: JSON.stringify({ Version: '2012-10-17', Statement: [{ Effect: 'Allow', Principal: { AWS: ['*'] }, Action: ['s3:GetObject'], Resource: [`arn:aws:s3:::${b.name}/*`] }] }),
      }));
    }
    try {
      await s3.send(new PutBucketCorsCommand({
        Bucket: b.name,
        CORSConfiguration: {
          CORSRules: [
            {
              AllowedHeaders: ['*'],
              AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
              AllowedOrigins: ['*'],
              ExposeHeaders: ['ETag'],
            },
          ],
        },
      }));
    } catch (corsErr) {
      console.warn(`Could not set CORS for ${b.name}:`, corsErr.message);
    }
  }
}

// Postgres seed: roles and the first super user go into the users/roles tables.
async function seedPostgres() {
  execSync('npm run db:push', { cwd: fileURLToPath(new URL('..', import.meta.url)), stdio: ['ignore', 'inherit', 'inherit'] });
  const { getClient } = await import('../db/client.mjs');
  const pg = getClient().sql;
  const now = new Date().toISOString();
  for (const [roleId, permissions] of Object.entries(ROLES)) {
    const rows = await pg`INSERT INTO roles (role_id, permissions, created_at, updated_at) VALUES (${roleId}, ${JSON.stringify(permissions)}::jsonb, ${now}, ${now}) ON CONFLICT (role_id) DO NOTHING RETURNING role_id`;
    console.log(`role   ${roleId} (${rows.length ? 'created' : 'exists'})`);
  }
  const email = env.SEED_ADMIN_EMAIL || 'admin@openpress.local';
  const hash = await bcrypt.hash(env.SEED_ADMIN_PASSWORD || 'admin12345', 10);
  const rows = await pg`INSERT INTO users (user_id, email, full_name, password, role, status, created_at, updated_at)
    VALUES (${randomUUID()}, ${email}, ${'Local Admin'}, ${hash}, ${'Super User'}, ${'active'}, ${now}, ${now})
    ON CONFLICT (email) DO NOTHING RETURNING email`;
  console.log(`user   ${email} (${rows.length ? 'created' : 'exists'})`);
  await pg.end({ timeout: 1 });
}

await seedPostgres();
await createBuckets();
console.log('Local setup complete.');
