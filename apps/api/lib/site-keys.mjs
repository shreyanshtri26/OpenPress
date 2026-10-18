// Shared by the local site server (src/site-dev.mjs) and the production Worker (apps/site): the one place that
// decides which bucket object a public URL path is served from.

/** Candidate bucket keys for a URL path, in the order a static host would try them. */
export function siteKeys(pathname) {
  let p;
  try {
    p = decodeURIComponent(pathname).replace(/^\/+/, '');
  } catch {
    return [];
  }
  if (p.split('/').includes('..')) return [];
  if (p === '') return ['home.html'];
  if (p.endsWith('/')) return [`${p}index.html`];
  if (/\.[a-z0-9]+$/i.test(p)) return [p];
  return [`${p}.html`, `${p}/index.html`];
}
