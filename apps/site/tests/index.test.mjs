import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../src/index.mjs';

const objects = { 'home.html': '<h1>home</h1>', 'news/index.html': '<h1>news</h1>', 'news/story.html': '<h1>story</h1>', 'error.html': '<h1>oops</h1>', 'logo.png': 'PNG' };
const types = { html: 'text/html; charset=utf-8', png: 'image/png' };

test.beforeEach(() => {
  globalThis.fetch = async (url) => {
    const key = decodeURIComponent(new URL(url).pathname.slice(1));
    return key in objects ? new Response(objects[key], { headers: { 'content-type': types[key.split('.').pop()] } }) : new Response('nope', { status: 404 });
  };
});

const env = { BUCKET_ORIGIN: 'https://bucket.example/' };
const get = (path, init) => worker.fetch(new Request(`https://site.test${path}`, init), env);

test('serves pages like a static host', async () => {
  assert.equal(await (await get('/')).text(), '<h1>home</h1>');
  assert.equal(await (await get('/news')).text(), '<h1>news</h1>');
  assert.equal(await (await get('/news/story.html')).text(), '<h1>story</h1>');
  const logo = await get('/logo.png');
  assert.equal(logo.headers.get('content-type'), 'image/png');
});

test('unknown path returns the error page with 404', async () => {
  const res = await get('/nothing-here');
  assert.equal(res.status, 404);
  assert.equal(await res.text(), '<h1>oops</h1>');
});

test('adds security headers and rejects other methods and a missing config', async () => {
  assert.equal((await get('/')).headers.get('x-content-type-options'), 'nosniff');
  assert.equal((await get('/', { method: 'POST' })).status, 405);
  assert.equal((await worker.fetch(new Request('https://site.test/'), {})).status, 500);
});

test('proxies /_neon/* to Neon Auth with cookies kept first-party', async () => {
  const seen = [];
  globalThis.fetch = async (url, init) => {
    seen.push({ url: String(url), method: init.method, cookie: init.headers.get('cookie'), host: init.headers.get('host') });
    const headers = new Headers({ 'content-type': 'application/json' });
    headers.append('set-cookie', '__Secure-neon-auth.session_token=abc; Path=/; Domain=auth.neon.example; Secure; HttpOnly; SameSite=None');
    return new Response('{"ok":true}', { headers });
  };
  const withAuth = { ...env, NEON_AUTH_BASE_URL: 'https://auth.neon.example/neondb/auth/' };
  const res = await worker.fetch(new Request('https://site.test/_neon/sign-in/social?x=1', { method: 'POST', headers: { cookie: 'c=1' }, body: '{}' }), withAuth);
  assert.equal(seen[0].url, 'https://auth.neon.example/neondb/auth/sign-in/social?x=1');
  assert.equal(seen[0].method, 'POST');
  assert.equal(seen[0].cookie, 'c=1');
  assert.equal(res.headers.get('cache-control'), 'no-store');
  assert.equal(res.headers.getSetCookie()[0].includes('Domain='), false);
  assert.match(res.headers.getSetCookie()[0], /session_token=abc/);
  assert.equal((await worker.fetch(new Request('https://site.test/_neon/token'), env)).status, 404);
});
