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
