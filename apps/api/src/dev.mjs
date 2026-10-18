// Local development server: serves the same fetch handler Neon runs, over plain Node HTTP.
// Usage: npm run dev -w apps/api   (reads apps/api/.env.local)
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { startSiteServer } from './site-dev.mjs';

export async function startDevServer(port) {
  // Imported lazily so .env.local is loaded before handlers read process.env at module load.
  const { default: app } = await import('./server.mjs');

  const server = createServer(async (req, res) => {
    try {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const hasBody = !['GET', 'HEAD'].includes(req.method) && chunks.length > 0;
      const request = new Request(`http://${req.headers.host}${req.url}`, {
        method: req.method,
        headers: req.headers,
        body: hasBody ? Buffer.concat(chunks) : undefined,
      });
      const response = await app.fetch(request);
      const headers = Object.fromEntries(response.headers);
      const cookies = response.headers.getSetCookie();
      if (cookies.length) headers['set-cookie'] = cookies;
      res.writeHead(response.status, headers);
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch (err) {
      console.error(err);
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'Dev server error', message: err.message }));
    }
  });

  await new Promise((resolve) => server.listen(port, resolve));
  return server;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const envFile = fileURLToPath(new URL('../.env.local', import.meta.url));
  if (existsSync(envFile)) process.loadEnvFile(envFile);
  const port = Number(process.env.PORT || 3001);
  await startDevServer(port);
  console.log(`OpenPress API listening on http://localhost:${port}`);

  // Public site stand-in (see site-dev.mjs); skipped when storage is not configured.
  if (process.env.S3_WEBSITE_BUCKET_NAME && process.env.PUBLIC_STORAGE_URL) {
    const sitePort = Number(process.env.SITE_PORT || 8080);
    await startSiteServer(sitePort, { storageUrl: process.env.PUBLIC_STORAGE_URL, bucket: process.env.S3_WEBSITE_BUCKET_NAME });
    console.log(`OpenPress site listening on http://localhost:${sitePort}`);
  }
}
