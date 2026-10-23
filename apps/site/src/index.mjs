// Serves the published newspaper: maps a URL path to an object in the public website bucket and returns it,
// the way a static host would (/news -> news.html or news/index.html, / -> home.html). Unknown paths get the
// published error page with a 404.
import { siteKeys } from '../../api/lib/site-keys.mjs';
import { renderDevLoginPageHtml } from '../../api/src/render-login-fallback.mjs';

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'ALLOWALL',
};

const fromBucket = (env, key) =>
  fetch(`${env.BUCKET_ORIGIN.replace(/\/+$/, '')}/${key.split('/').map(encodeURIComponent).join('/')}`, {
    cf: { cacheTtl: 60, cacheEverything: true },
  });

const respond = (upstream, status) => {
  const headers = new Headers(SECURITY_HEADERS);
  const type = upstream.headers.get('content-type');
  if (type) headers.set('content-type', type);
  // HTML changes whenever a page is published, so keep it fresh; assets can be cached longer.
  headers.set('cache-control', /text\/html/.test(type || '') ? 'public, max-age=60, s-maxage=60' : 'public, max-age=3600');
  return { headers, status };
};

// The reader sign-in page is built here from the current code, so deploying the site updates it (no separate publish
// step, no stale login.html in the bucket). It talks to Neon Auth through the /_neon proxy below.
function loginPage(request, env) {
  const config = `window.__openPress_API__ = ${JSON.stringify((env.API_URL || '').replace(/\/+$/, ''))};${env.NEON_AUTH_BASE_URL ? ' window.__NEON_AUTH_PROXY__ = true;' : ''}`;
  const html = renderDevLoginPageHtml().replace('<head>', `<head>\n  <script>${config}</script>`);
  const headers = new Headers(SECURITY_HEADERS);
  headers.set('content-type', 'text/html; charset=utf-8');
  headers.set('cache-control', 'no-store');
  return new Response(request.method === 'HEAD' ? null : html, { status: 200, headers });
}

// Neon Auth lives on another domain, so its session cookies are third-party to the newspaper and iOS Safari (and other
// browsers) drop them: Google sign-in comes back with no session. The sign-in page therefore talks to /_neon/*, which
// this worker forwards to Neon Auth, making those cookies first-party. Only the one configured upstream is reachable.
const NEON_PREFIX = '/_neon';

async function proxyNeonAuth(request, env, pathname, search) {
  if (!env.NEON_AUTH_BASE_URL) return new Response('Sign-in is not configured (NEON_AUTH_BASE_URL).', { status: 404 });
  const target = `${env.NEON_AUTH_BASE_URL.replace(/\/+$/, '')}${pathname.slice(NEON_PREFIX.length)}${search}`;
  const headers = new Headers(request.headers);
  headers.delete('host');
  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
    redirect: 'manual',
  });
  const out = new Headers(upstream.headers);
  out.delete('set-cookie');
  out.delete('content-encoding');
  out.delete('content-length');
  // A Domain attribute would pin the cookie to Neon's host; without it the browser keeps it for this site.
  for (const cookie of upstream.headers.getSetCookie?.() ?? []) out.append('set-cookie', cookie.replace(/;\s*Domain=[^;]*/i, ''));
  out.set('cache-control', 'no-store');
  return new Response(upstream.body, { status: upstream.status, headers: out });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === NEON_PREFIX || url.pathname.startsWith(`${NEON_PREFIX}/`)) return proxyNeonAuth(request, env, url.pathname, url.search);
    if (!env.BUCKET_ORIGIN) return new Response('Site is not configured (BUCKET_ORIGIN).', { status: 500 });
    if ((url.pathname === '/login' || url.pathname === '/login.html') && (request.method === 'GET' || request.method === 'HEAD')) return loginPage(request, env);
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });

    const { pathname } = new URL(request.url);
    for (const key of siteKeys(pathname)) {
      const upstream = await fromBucket(env, key);
      if (!upstream.ok) continue;
      const { headers, status } = respond(upstream, 200);
      return new Response(request.method === 'HEAD' ? null : upstream.body, { status, headers });
    }

    const missing = await fromBucket(env, 'error.html');
    const { headers } = respond(missing, 404);
    return new Response(missing.ok && request.method !== 'HEAD' ? missing.body : 'Not found', { status: 404, headers });
  },
};
