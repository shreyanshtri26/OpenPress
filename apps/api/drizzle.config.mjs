import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './db/schema.mjs',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgres://openpress:openpress-local-secret@127.0.0.1:5432/openpress',
  },
});
