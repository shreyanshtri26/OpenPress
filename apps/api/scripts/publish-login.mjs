// Publishes the reader Sign In page (/login) to the website bucket, pointed at this deployment's API.
// Usage: API_URL=https://... node --env-file=.env.local scripts/publish-login.mjs
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { createS3Client } from '../lib/storage.mjs';
import { renderDevLoginPageHtml } from '../src/render-login-fallback.mjs';

const { API_URL, WEBSITE_BUCKET_NAME } = process.env;
if (!API_URL || !WEBSITE_BUCKET_NAME) throw new Error('Set API_URL and WEBSITE_BUCKET_NAME');

// The page falls back to its own origin for the API, which is wrong on a static host, so say where the API is.
const html = renderDevLoginPageHtml().replaceAll('http://localhost:5173/login', `${process.env.FRONTEND_URL || ''}/login`).replace('<head>', `<head>\n  <script>window.__openPress_API__ = ${JSON.stringify(API_URL.replace(/\/+$/, ''))};${process.env.NEON_AUTH_BASE_URL ? ` window.__NEON_AUTH_URL__ = ${JSON.stringify(process.env.NEON_AUTH_BASE_URL)};` : ''}</script>`);
await createS3Client().send(new PutObjectCommand({
  Bucket: WEBSITE_BUCKET_NAME,
  Key: 'login.html',
  Body: html,
  ContentType: 'text/html; charset=utf-8',
  CacheControl: 'no-cache',
}));
console.log('Published login.html');
