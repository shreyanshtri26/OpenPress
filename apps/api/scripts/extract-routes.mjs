// One-time generator: reads the index.mjs router and writes contract/routes.json.
// After the first run the JSON is the spec; regenerate only when a route is added on purpose.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const src = readFileSync(new URL('../index.mjs', import.meta.url), 'utf8');
const router = src.slice(src.indexOf('let response;'));

const PUBLIC = new Set(['/pagestudio/forceUpdatePwaIcons', '/pagebuilder/forceUpdatePwaIcons', '/login', '/forgotPassword', '/resetPassword', '/contact/submit', '/story/fetchReadyToPublish', '/campaigns/trackEvent', '/analytics/collect', '/youpi/webhook', '/taxonomy/colors']);
const SUPER = new Set(['POST /addUser', 'DELETE /deleteUser', 'DELETE /deleteAuthor', 'PUT /editUser', 'POST /addRole', 'DELETE /deleteRole', 'PUT /updateRole']);
const EDITOR = new Set(['GET /surveys', 'POST /surveys', 'PUT /surveys', 'DELETE /surveys', 'POST /surveys/invite']);

// Regex / prefix routes: hand-written sample paths.
const PATTERNS = [
  ['PUT', '^/api/stories/[^/]+$', '/api/stories/sample-id', 'jwt'],
  ['GET', '^/api/getQualityVariants', '/api/getQualityVariants', 'jwt'],
  ['GET', '^/api/asset/[^/]+/status$', '/api/asset/sample-id/status', 'jwt'],
  ['GET', '^/surveys/public/', '/surveys/public/sample-id', 'public'],
  ['GET', '^/surveys/[^/]+/responses$', '/surveys/sample-id/responses', 'editor'],
  ['POST', '^/surveys/[^/]+/responses$', '/surveys/sample-id/responses', 'public'],
  ['POST', '^/surveys/[^/]+/ai-summary$', '/surveys/sample-id/ai-summary', 'editor'],
  ['GET', '^/surveys/[^/]+/chat$', '/surveys/sample-id/chat', 'editor'],
  ['POST', '^/surveys/[^/]+/chat$', '/surveys/sample-id/chat', 'editor'],
  ['POST', '^/surveys/[^/]+/chat/assets$', '/surveys/sample-id/chat/assets', 'editor'],
  ['DELETE', '^/surveys/[^/]+/chat/assets$', '/surveys/sample-id/chat/assets', 'editor'],
];

const routes = [];
const seen = new Set();
const add = (r) => { const k = `${r.method} ${r.path}`; if (!seen.has(k)) { seen.add(k); routes.push(r); } };

// Exact routes, with or without a method check: path === '/x' (|| path === '/y') && method === 'M'
for (const line of router.split('\n')) {
  if (!/path\s*===/.test(line)) continue;
  const paths = [...line.matchAll(/path\s*===\s*["']([^"']+)["']/g)].map((m) => m[1]);
  const method = line.match(/method\s*===\s*["']([A-Z]+)["']/)?.[1] ?? 'ANY';
  for (const path of paths) {
    const key = `${method} ${path}`;
    const auth = PUBLIC.has(path) || /^(\/api)?\/epaper\/auth\/(sync|logout)$/.test(path) ? 'public' : SUPER.has(key) ? 'superuser' : EDITOR.has(key) ? 'editor' : 'jwt';
    add({ method, path, sample: path, auth });
  }
}
for (const [method, path, sample, auth] of PATTERNS) add({ method, path, sample, auth });

mkdirSync(new URL('../contract/', import.meta.url), { recursive: true });
writeFileSync(new URL('../contract/routes.json', import.meta.url), JSON.stringify(routes, null, 2) + '\n');
console.log(`wrote ${routes.length} routes`);
