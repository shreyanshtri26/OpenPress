// Usage: API_URL=https://... SMOKE_ORIGIN=https://... node scripts/smoke.mjs
const base = process.env.API_URL?.replace(/\/$/, '');
if (!base) { console.error('API_URL is required'); process.exit(1); }
const origin = process.env.SMOKE_ORIGIN;

const checks = [
  ['preflight returns 200', () => fetch(`${base}/getAllRoles`, { method: 'OPTIONS', headers: origin ? { origin } : {} }),
    (r) => r.status === 200 && (!origin || r.headers.get('access-control-allow-origin') === origin)],
  ['protected route rejects missing token', () => fetch(`${base}/getAllRoles`),
    async (r) => r.status === 401 && (await r.json()).message === '401 Unauthorized request'],
  ['login rejects bad credentials without crashing', () => fetch(`${base}/loginDynamo`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'smoke-test@invalid.local', password: 'wrong' }) }),
    (r) => r.status >= 400 && r.status < 500],
  ['public story feed answers', () => fetch(`${base}/story/fetchReadyToPublish`),
    (r) => r.status === 200],
];

let failed = 0;
for (const [name, run, ok] of checks) {
  try {
    const res = await run();
    const pass = await ok(res);
    console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}  (${res.status})`);
    if (!pass) failed++;
  } catch (err) {
    console.log(`FAIL  ${name}  (${err.message})`);
    failed++;
  }
}
process.exit(failed ? 1 : 0);
