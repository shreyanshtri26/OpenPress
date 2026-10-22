import { handler } from '../index.mjs';

// Bodies with these content types stay text; anything else is base64, as on API Gateway.
const TEXT_TYPE = /^(text\/|application\/(json|x-www-form-urlencoded|xml|javascript)|multipart\/form-data)/i;
// Neon Functions must start responding within 15 minutes; leave a 1 minute margin.
const BUDGET_MS = 14 * 60 * 1000;

export async function toEvent(request) {
  const url = new URL(request.url);
  const headers = {};
  request.headers.forEach((value, key) => { headers[key] = value; }); // keys arrive lowercase, same as API Gateway v2

  let body = null;
  let isBase64Encoded = false;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const type = headers['content-type'] || '';
    if (!type || TEXT_TYPE.test(type)) {
      body = (await request.text()) || null;
    } else {
      body = Buffer.from(await request.arrayBuffer()).toString('base64');
      isBase64Encoded = true;
    }
  }

  const query = Object.fromEntries(url.searchParams);
  return {
    rawPath: url.pathname,
    path: url.pathname,
    rawQueryString: url.search.slice(1),
    httpMethod: request.method,
    headers,
    queryStringParameters: Object.keys(query).length ? query : undefined,
    body,
    isBase64Encoded,
    requestContext: { http: { method: request.method, path: url.pathname }, requestId: crypto.randomUUID() },
  };
}

export function fromResult(res = {}) {
  const status = res.statusCode || 200;
  const headers = new Headers();
  for (const [k, v] of Object.entries(res.headers || {})) headers.set(k, String(v));
  for (const [k, list] of Object.entries(res.multiValueHeaders || {})) for (const v of list) headers.append(k, String(v));
  for (const c of res.cookies || []) headers.append('set-cookie', c);
  if (!headers.has('content-type')) headers.set('content-type', 'application/json');

  let body = res.body ?? '';
  if (res.isBase64Encoded) body = Buffer.from(body, 'base64');
  else if (typeof body !== 'string') body = JSON.stringify(body);

  return new Response(status === 204 || status === 304 ? null : body, { status, headers });
}

function handlerContext() {
  const deadline = Date.now() + BUDGET_MS;
  const requestId = crypto.randomUUID();
  return { getRemainingTimeInMillis: () => deadline - Date.now(), requestId };
}

export default {
  async fetch(request) {
    const { pathname } = new URL(request.url);
    // ponytail: secret-in-path auth for the cron trigger; switch to parseTriggerDelivery from @neon/functions if the path ever leaks.
    if (process.env.CRON_SECRET && pathname === `/__cron/${process.env.CRON_SECRET}`) {
      return fromResult(await handler({ task: 'publishScheduledStories' }, handlerContext()));
    }
    return fromResult(await handler(await toEvent(request), handlerContext()));
  },
};
