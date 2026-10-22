// Serves the published newspaper: maps a URL path to an object in the public website bucket and returns it,
// the way a static host would (/news -> news.html or news/index.html, / -> home.html). Unknown paths get the
// published error page with a 404.
import { siteKeys } from '../../api/lib/site-keys.mjs';

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

export default {
  async fetch(request, env) {
    if (!env.BUCKET_ORIGIN) return new Response('Site is not configured (BUCKET_ORIGIN).', { status: 500 });
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
