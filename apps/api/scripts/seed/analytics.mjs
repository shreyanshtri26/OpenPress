import { db, getClient } from "../../db/client.mjs";
import { analyticsEvents } from "../../db/schema.mjs";

// Sample reader traffic for the /analytics dashboard: ~30 days of visits to the seeded stories, plus a few
// readers in the last 20 minutes so the Realtime tab has something to show. Real traffic arrives through
// POST /analytics/collect; these rows are tagged with a "seed-" user id and replaced on every run.
const sql = (...a) => getClient().sql(...a); // the exported `sql` proxy cannot be called as a template tag
sql.end = (o) => getClient().sql.end(o);
const PLACES = [
  ["IN", "MH", "Mumbai"], ["IN", "DL", "New Delhi"], ["IN", "KA", "Bengaluru"], ["IN", "UP", "Lucknow"], ["IN", "TN", "Chennai"],
  ["US", "CA", "San Francisco"], ["GB", "ENG", "London"], ["AE", "DU", "Dubai"], ["SG", "SG", "Singapore"], ["IN", "WB", "Kolkata"],
];
const AGENTS = [
  { device: "Desktop", browser: "Chrome", os: "Windows", w: 4 }, { device: "Mobile", browser: "Chrome", os: "Android", w: 6 },
  { device: "Mobile", browser: "Safari", os: "iOS", w: 3 }, { device: "Desktop", browser: "Safari", os: "macOS", w: 2 },
  { device: "Desktop", browser: "Firefox", os: "Linux", w: 1 }, { device: "Tablet", browser: "Safari", os: "iOS", w: 1 },
];
const REFERRERS = [null, null, null, "google.com", "google.com", "twitter.com", "facebook.com", "news.ycombinator.com", "linkedin.com"];
const LANGS = ["en-IN", "en-IN", "en-US", "en-GB", "hi-IN", "en-IN"];
const PLATFORMS = ["whatsapp", "twitter", "facebook", "linkedin", "copy_link"];

// small deterministic generator so re-running gives the same shape
let seed = 20261018;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const pickW = (a) => { let r = rnd() * a.reduce((s, x) => s + x.w, 0); return a.find((x) => (r -= x.w) < 0) ?? a[0]; };

export async function seedAnalytics() {
  const stories = await sql`select story_id, title, slug, publish_url, fields->>'Section' as section from stories where story_id like 'seed-story-%' order by story_id`;
  const pages = stories.length
    ? stories.map((s) => ({ id: s.publish_url ? new URL(s.publish_url).pathname : `/${s.slug || s.story_id}.html`, title: s.title, category: s.section || "News" }))
    : [{ id: "/news/sample.html", title: "Sample story", category: "News" }];

  await sql`delete from analytics_events where user_id like 'seed-%'`;

  const rows = [];
  const visitors = 320;
  for (let v = 0; v < visitors; v++) {
    const userId = `seed-user-${String(v).padStart(3, "0")}`;
    const [country, region, city] = pick(PLACES);
    const ua = pickW(AGENTS), language = pick(LANGS);
    const favourite = pick(pages).category;
    const firstDay = Math.floor(rnd() * 50);                 // days ago of the first visit
    const returns = Math.floor(rnd() * rnd() * 7);           // most visit once or twice, a few often
    const days = [firstDay, ...Array.from({ length: returns }, () => Math.max(0, firstDay - 1 - Math.floor(rnd() * Math.max(firstDay, 1))))];
    days.forEach((d, i) => {
      const sessionId = `seed-sess-${v}-${i}`;
      const referrer = pick(REFERRERS);
      let t = Date.now() - d * 86400000 - Math.floor(rnd() * 12 * 3600000) - 30 * 60000;
      const views = 1 + Math.floor(rnd() * rnd() * 5);
      for (let k = 0; k < views; k++) {
        const own = pages.filter((p) => p.category === favourite);
        const page = rnd() < 0.55 && own.length ? pick(own) : pick(pages);
        const base = { userId, sessionId, pageId: page.id, pageTitle: page.title, pageCategory: page.category, ...{ deviceType: ua.device, browser: ua.browser, os: ua.os }, language, country, region, city };
        rows.push({ ...base, type: "page_view", ts: new Date(t), referrerDomain: k === 0 ? referrer : null });
        const dwell = Math.floor((8 + rnd() * rnd() * 260) * 1000);
        t += dwell;
        rows.push({ ...base, type: "page_exit", ts: new Date(t), durationMs: dwell, depth: Math.min(100, Math.floor(rnd() * 120)) });
        if (rnd() < 0.09) rows.push({ ...base, type: "share_button_click", ts: new Date(t - 2000), sharePlatform: pick(PLATFORMS) });
        t += 1000;
      }
    });
  }
  // Realtime: a handful of readers active in the last 20 minutes
  for (let v = 0; v < 9; v++) {
    const userId = `seed-live-${v}`, [country, region, city] = pick(PLACES), ua = pickW(AGENTS), page = pick(pages);
    for (let k = 0; k < 1 + (v % 3); k++) {
      const ts = new Date(Date.now() - Math.floor(rnd() * 20 * 60000));
      rows.push({ userId, sessionId: `seed-live-sess-${v}`, type: "page_view", ts, pageId: page.id, pageTitle: page.title, pageCategory: page.category, deviceType: ua.device, browser: ua.browser, os: ua.os, language: "en-IN", country, region, city });
    }
  }
  for (let i = 0; i < rows.length; i += 500) await db.insert(analyticsEvents).values(rows.slice(i, i + 500));
  console.log(`Seeded ${rows.length} analytics events for ${visitors + 9} sample readers.`);
}

if (process.argv[1]?.endsWith("analytics.mjs")) {
  try {
    await seedAnalytics();
    await sql.end({ timeout: 1 });
    process.exit(0);
  } catch (err) {
    console.error("Analytics seeding failed:", err);
    process.exit(1);
  }
}
