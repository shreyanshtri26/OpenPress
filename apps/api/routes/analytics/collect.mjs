// POST /analytics/collect: public beacon target for the published pages' tracker (see pagestudio analyticsTags).
// First-party and cookie-free: the browser sends a random id it keeps in localStorage. Device, browser and OS
// come from the User-Agent; country/region/city from the CDN's geo headers when there is one (Cloudflare).
import { db } from '../../db/client.mjs';
import { analyticsEvents } from '../../db/schema.mjs';

const TYPES = new Set(['page_view', 'page_exit', 'share_button_click']);
const str = (v, n = 200) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, n) : null);
const int = (v, max) => (Number.isFinite(Number(v)) ? Math.max(0, Math.min(Math.round(Number(v)), max)) : null);

export function parseUserAgent(ua = '') {
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\/|Opera/.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox'
    : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Other';
  const os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad|iPod/.test(ua) ? 'iOS'
    : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'Other';
  const deviceType = /iPad|Tablet/.test(ua) ? 'Tablet' : /Mobi|iPhone|Android/.test(ua) ? 'Mobile' : 'Desktop';
  return { browser, os, deviceType };
}

export const handler = async (event) => {
  const h = Object.fromEntries(Object.entries(event.headers || {}).map(([k, v]) => [k.toLowerCase(), v]));
  let b = {};
  try { b = typeof event.body === 'string' ? JSON.parse(event.body || '{}') : event.body || {}; } catch { /* ignore */ }

  const userId = str(b.userId, 64), sessionId = str(b.sessionId, 64);
  if (!TYPES.has(b.type) || !userId || !sessionId) return { statusCode: 400, body: JSON.stringify({ message: 'invalid event' }) };

  const ua = parseUserAgent(h['user-agent']);
  let referrerDomain = null;
  try { referrerDomain = b.referrer ? new URL(b.referrer).hostname.replace(/^www\./, '') : null; } catch { /* bad referrer */ }

  await db.insert(analyticsEvents).values({
    type: b.type, userId, sessionId,
    pageId: str(b.pageId, 300), pageTitle: str(b.title, 300), pageCategory: str(b.category, 80),
    referrerDomain, ...ua, language: str(b.language, 20),
    country: str(h['cf-ipcountry'], 2), region: str(h['cf-region-code'] || h['cf-region'], 40), city: str(h['cf-ipcity'], 80),
    durationMs: int(b.durationMs, 6 * 3600 * 1000), depth: int(b.depth, 100), sharePlatform: str(b.platform, 40),
  });
  return { statusCode: 204, body: '' };
};
