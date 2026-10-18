/**
 * Pagebuilder requests contain complete HTML documents and editor state.
 * Summarize only their operational request log; pass the original request to
 * the handler and keep RUM/campaign/other event logging in its existing format.
 */
export function requestEventForLogging(event) {
  const rawPath = event?.rawPath ?? event?.path ?? '';
  const path = typeof rawPath === 'string' ? rawPath : '';
  if (
    !path.startsWith('/pagestudio/') &&
    !path.startsWith('/api/pagestudio/') &&
    !path.startsWith('/pagebuilder/') &&
    !path.startsWith('/api/pagebuilder/')
  ) {
    return event;
  }

  const body = event.body;
  const bodyBytes = body == null
    ? 0
    : Buffer.byteLength(typeof body === 'string' ? body : JSON.stringify(body), 'utf8');

  return {
    rawPath: path,
    method: event.requestContext?.http?.method ?? event.httpMethod,
    requestId: event.requestContext?.requestId,
    bodyBytes,
    bodyOmitted: true,
    isBase64Encoded: Boolean(event.isBase64Encoded),
  };
}
