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
      const { pathname } = new URL(req.url, 'http://site.local');
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
        const html = renderDevLoginPageHtml();
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
