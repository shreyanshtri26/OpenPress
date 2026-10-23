// Local stand-in for the public site host (openpress.com): serves the published website bucket from its own root,
// so root-absolute links in published pages (/news/story.html, /openpress-logo-full-nobg.png) resolve as in production.
import { createServer } from 'node:http';
import { renderDevLoginPageHtml } from './render-login-fallback.mjs';
import { siteKeys } from '../lib/site-keys.mjs';

export { siteKeys };

export async function startSiteServer(port, { storageUrl, bucket }) {
  const base = `${storageUrl.replace(/\/+$/, '')}/${bucket}`;
  const fetchKey = (key) => fetch(`${base}/${key.split('/').map(encodeURIComponent).join('/')}`);

  const server = createServer(async (req, res) => {
    try {
      const { pathname, search } = new URL(req.url, 'http://site.local');

      // Same /_neon sign-in proxy the production worker has (apps/site): Neon Auth's cookies stay first-party to this host.
      if (pathname === '/_neon' || pathname.startsWith('/_neon/')) {
        const authBase = (process.env.NEON_AUTH_BASE_URL || '').replace(/\/+$/, '');
        if (!authBase) { res.writeHead(404); res.end('NEON_AUTH_BASE_URL is not set'); return; }
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const headers = { ...req.headers };
        delete headers.host;
        delete headers['content-length'];
        const upstream = await fetch(authBase + pathname.slice('/_neon'.length) + search, {
          method: req.method,
          headers,
          body: req.method === 'GET' || req.method === 'HEAD' ? undefined : Buffer.concat(chunks),
          redirect: 'manual',
        });
        const out = {};
        upstream.headers.forEach((value, key) => { if (!['set-cookie', 'content-encoding', 'content-length', 'transfer-encoding'].includes(key)) out[key] = value; });
        out['set-cookie'] = (upstream.headers.getSetCookie?.() ?? []).map((c) => c.replace(/;\s*Domain=[^;]*/i, '').replace(/;\s*Secure/i, ''));
        out['cache-control'] = 'no-store';
        res.writeHead(upstream.status, out);
        res.end(Buffer.from(await upstream.arrayBuffer()));
        return;
      }
      for (const key of [...siteKeys(pathname)]) {
        const upstream = await fetchKey(key);
        if (!upstream.ok) continue;
        res.writeHead(200, {
          'content-type': upstream.headers.get('content-type') || 'application/octet-stream',
          'cache-control': 'no-cache',
        });
        res.end(Buffer.from(await upstream.arrayBuffer()));
        return;
      }

      // If login page is requested and not yet published to bucket, serve dynamic dev fallback
      const cleanPath = pathname.replace(/^\/+|\/+$/g, '');
      if (cleanPath === 'login' || cleanPath === 'login.html') {
        // With NEON_AUTH_BASE_URL set the page signs in with the real Google account through the proxy above.
        const html = process.env.NEON_AUTH_BASE_URL
          ? renderDevLoginPageHtml().replace('<head>', '<head><script>window.__NEON_AUTH_PROXY__ = true;</script>')
          : renderDevLoginPageHtml();
        res.writeHead(200, {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'no-cache',
        });
        res.end(html);
        return;
      }

      const notFound = await fetchKey('error.html');
      res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
      res.end(notFound.ok ? Buffer.from(await notFound.arrayBuffer()) : 'Not found');
    } catch (err) {
      res.writeHead(502, { 'content-type': 'text/plain' });
      res.end(`Site server error: ${err.message}`);
    }
  });
  await new Promise((resolve) => server.listen(port, resolve));
  return server;
}
