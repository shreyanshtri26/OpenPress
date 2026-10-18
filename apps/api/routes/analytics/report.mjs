// GET /analytics/<report>: the aggregated reports behind the admin /analytics dashboard.
// Every report reads analytics_events (see db/schema.mjs) for ?from=YYYY-MM-DD&to=YYYY-MM-DD[&user_id=].
// Response shapes are what apps/admin/src/components/dashboard/analytics/* expect (types/analytics.ts).
import { getClient } from '../../db/client.mjs';

// The exported `sql` proxy can't be used as a template tag, so call the postgres.js client directly.
const sql = (...args) => getClient().sql(...args);

const DAY = 86400000;
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
const iso = (d) => d.toISOString().slice(0, 10);
const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);
const round1 = (n) => Math.round((Number(n) || 0) * 10) / 10;

// Rows of an in-memory table, filtered/sorted/paged the way the dashboard's grids ask (search, sort_*, filter_*, offset, limit).
export function tablePage(rows, q, { searchField, defaultSort }) {
  let out = rows;
  if (q.search && searchField) out = out.filter((r) => String(r[searchField] ?? '').toLowerCase().includes(q.search.toLowerCase()));
  for (const [k, val] of Object.entries(q)) {
    const m = k.match(/^filter_(.+?)(?:_op)?$/);
    if (!m || k.endsWith('_op')) continue;
    const field = m[1], op = q[`${k}_op`] || 'equals', needle = String(val).toLowerCase();
    out = out.filter((r) => {
      const v = r[field];
      const s = String(v ?? '').toLowerCase();
      const n = Number(v), x = Number(val);
      switch (op) {
        case 'equals': return s === needle;
        case 'notequals': case 'not_equals': return s !== needle;
        case 'contains': return s.includes(needle);
        case 'notcontains': return !s.includes(needle);
        case 'startswith': return s.startsWith(needle);
        case 'endswith': return s.endsWith(needle);
        case '>': return n > x; case '>=': return n >= x; case '<': return n < x; case '<=': return n <= x;
        default: return true;
      }
    });
  }
  const field = rows[0] && q.sort_field in rows[0] ? q.sort_field : defaultSort;
  const dir = (q.sort_order || 'desc') === 'asc' ? 1 : -1;
  out = [...out].sort((a, b) => (typeof a[field] === 'number' ? a[field] - b[field] : String(a[field]).localeCompare(String(b[field]))) * dir);
  const offset = Math.max(0, parseInt(q.offset, 10) || 0), limit = Math.max(1, Math.min(parseInt(q.limit, 10) || 50, 1000));
  const total = out.length;
  return { data: out.slice(offset, offset + limit), total, next_offset: offset + limit < total ? offset + limit : null };
}

// Days between from and to, inclusive, as YYYY-MM-DD.
const daysBetween = (from, to) => {
  const out = [];
  for (let t = Date.parse(from); t <= Date.parse(to) && out.length < 400; t += DAY) out.push(iso(new Date(t)));
  return out;
};

const REPORTS = {
  // ── Overview ────────────────────────────────────────────────────────────────
  async 'stats/overview/counts'({ W }) {
    const [r] = await sql`select count(distinct session_id)::int as s, count(distinct user_id)::int as u,
      (count(*) filter (where type = 'page_view'))::int as v, count(*)::int as e,
      coalesce(avg(duration_ms) filter (where type = 'page_exit' and duration_ms > 0), 0)::float as t
      from analytics_events where ${W}`;
    return { total_sessions: r.s, active_users: r.u, total_page_views: r.v, total_events: r.e, avg_time_on_page_ms: Math.round(r.t) };
  },

  async 'chart/overview/performance'({ W, q, from, to, user }) {
    const metric = q.metric || 'views';
    let rows;
    if (metric === 'new_users') {
      rows = await sql`select to_char(f.first, 'YYYY-MM-DD') as day, count(*)::float as value
        from (select user_id, min(ts) as first from analytics_events group by user_id) f
        where f.first >= ${from}::timestamptz and f.first < ${to}::timestamptz + interval '1 day' ${user ? sql`and f.user_id = ${user}` : sql``}
        group by 1`;
    } else {
      const value = metric === 'active_users' ? sql`count(distinct user_id)` : metric === 'sessions_per_user' ? sql`count(distinct session_id)::float / nullif(count(distinct user_id), 0)` : sql`count(*) filter (where type = 'page_view')`;
      rows = await sql`select to_char(ts, 'YYYY-MM-DD') as day, (${value})::float as value from analytics_events where ${W} group by 1`;
    }
    const byDay = new Map(rows.map((r) => [r.day, round1(r.value)]));
    return { data: daysBetween(from, to).map((day) => ({ day, value: byDay.get(day) ?? 0 })) };
  },

  async 'stats/overview/new-vs-returning'({ W, from, to, user }) {
    const [r] = await sql`select count(*) filter (where f.first >= ${from}::timestamptz)::int as n, count(*) filter (where f.first < ${from}::timestamptz)::int as r
      from (select user_id, min(ts) as first from analytics_events group by user_id) f
      where f.user_id in (select user_id from analytics_events where ${W}) ${user ? sql`and f.user_id = ${user}` : sql``}`;
    return { data: [{ type: 'New users', count: r.n }, { type: 'Returning users', count: r.r }] };
  },

  async 'table/overview/traffic-sources'({ W, q }) {
    const rows = await sql`select coalesce(referrer_domain, 'Direct') as source, count(distinct session_id)::int as count
      from analytics_events where ${W} and type = 'page_view' group by 1`;
    const { data, total } = tablePage(rows, { ...q, sort_field: 'count' }, { searchField: 'source', defaultSort: 'count' });
    return { data, total };
  },

  async 'stats/overview/funnel'({ W }) {
    const [r] = await sql`select count(*)::int as s,
      (count(*) filter (where views >= 2))::int as multi, (count(*) filter (where long_read))::int as long, (count(*) filter (where shared))::int as shared
      from (select session_id, count(*) filter (where type = 'page_view') as views,
        bool_or(type = 'page_exit' and duration_ms >= 120000) as long_read, bool_or(type = 'share_button_click') as shared
        from analytics_events where ${W} group by session_id) x`;
    return { data: [['Sessions', r.s], ['Page views', r.multi], ['2m+ reading', r.long], ['Shares', r.shared]].map(([stage, count]) => ({ stage, count, pct: pct(count, r.s) })) };
  },

  async 'chart/overview/session-frequency'({ W }) {
    const rows = await sql`select case when n >= 5 then '5+' else n::text end as k, count(*)::int as v
      from (select user_id, count(distinct session_id) as n from analytics_events where ${W} group by user_id) x group by 1`;
    const by = new Map(rows.map((r) => [r.k, r.v]));
    return { data: ['1', '2', '3', '4', '5+'].map((k) => ({ k, v: by.get(k) ?? 0 })) };
  },

  // ── Content ─────────────────────────────────────────────────────────────────
  async 'chart/content/top-categories'({ W }) {
    const rows = await sql`select page_category as key, count(*)::int as count from analytics_events
      where ${W} and type = 'page_view' and page_category is not null group by 1 order by 2 desc limit 8`;
    return { data: rows };
  },

  async 'chart/content/category-trend'({ W, from, to }) {
    const top = (await sql`select page_category as c from analytics_events where ${W} and type = 'page_view' and page_category is not null
      group by 1 order by count(*) desc limit 5`).map((r) => r.c);
    if (!top.length) return { categories: [], data: [] };
    const rows = await sql`select to_char(ts, 'YYYY-MM-DD') as day, page_category as c, count(*)::int as n from analytics_events
      where ${W} and type = 'page_view' and page_category in ${sql(top)} group by 1, 2`;
    const by = new Map(rows.map((r) => [`${r.day}|${r.c}`, r.n]));
    return { categories: top, data: daysBetween(from, to).map((day) => ({ day, ...Object.fromEntries(top.map((c) => [c, by.get(`${day}|${c}`) ?? 0])) })) };
  },

  async 'chart/content/scroll-depth'({ W }) {
    const [r] = await sql`select (count(*) filter (where depth < 25))::int as a, (count(*) filter (where depth >= 25 and depth < 50))::int as b,
      (count(*) filter (where depth >= 50 and depth < 75))::int as c, (count(*) filter (where depth >= 75))::int as d
      from analytics_events where ${W} and type = 'page_exit' and depth is not null`;
    return { data: [['0-25%', r.a], ['25-50%', r.b], ['50-75%', r.c], ['75-100%', r.d]].map(([depth, count]) => ({ depth, count })) };
  },

  async 'table/content/top-content'({ W, q }) {
    const rows = (await sql`select coalesce(v.page_title, v.page_id) as title, coalesce(v.page_category, '—') as category, v.views::int,
        coalesce(x.avg_time, 0)::float as avg_time_ms, coalesce(x.avg_depth, 0)::float as avg_depth
      from (select page_id, max(page_title) as page_title, max(page_category) as page_category, count(*) as views
            from analytics_events where ${W} and type = 'page_view' and page_id is not null group by page_id) v
      left join (select page_id, avg(duration_ms) filter (where duration_ms > 0) as avg_time, avg(depth) as avg_depth
            from analytics_events where ${W} and type = 'page_exit' group by page_id) x using (page_id)`)
      .map((r) => {
        const avg_interactions = round1(r.avg_depth / 25);
        return { title: r.title, category: r.category, views: r.views, avg_time_ms: Math.round(r.avg_time_ms), avg_interactions,
          score: Math.round(r.views * (1 + r.avg_depth / 100) * (1 + r.avg_time_ms / 60000)) };
      });
    const max_score = Math.max(0, ...rows.map((r) => r.score));
    return { ...tablePage(rows, q, { searchField: 'title', defaultSort: 'score' }), max_score };
  },

  async 'table/content/exit-pages'({ W, q }) {
    const rows = await sql`select title, count(*)::int as exits from (
        select distinct on (session_id) coalesce(page_title, page_id) as title from analytics_events
        where ${W} and type = 'page_view' order by session_id, ts desc) x where title is not null group by title`;
    return tablePage(rows, { sort_field: 'exits', ...q }, { searchField: 'title', defaultSort: 'exits' });
  },

  // ── Audience ────────────────────────────────────────────────────────────────
  async 'chart/audience/device-engagement'({ W }) {
    const rows = await sql`select coalesce(device_type, 'Unknown') as device, count(distinct session_id)::int as sessions,
      coalesce(avg(duration_ms) filter (where type = 'page_exit' and duration_ms > 0), 0)::float / 1000 as avg_time_s,
      coalesce(avg(depth) filter (where type = 'page_exit'), 0)::float / 25 as avg_interactions
      from analytics_events where ${W} group by 1 order by 2 desc`;
    return { data: rows.map((r) => ({ ...r, avg_time_s: round1(r.avg_time_s), avg_interactions: round1(r.avg_interactions) })) };
  },

  async 'stats/audience/reader-segments'({ W }) {
    const rows = await sql`select n, count(*)::int as users from (select user_id, count(distinct session_id) as n from analytics_events where ${W} group by user_id) x group by n`;
    const total = rows.reduce((a, r) => a + r.users, 0);
    const of = (test) => rows.filter((r) => test(Number(r.n))).reduce((a, r) => a + r.users, 0);
    const segs = [['Loyal readers', '5+ sessions', (n) => n >= 5], ['Regulars', '3-4 sessions', (n) => n >= 3 && n < 5], ['Occasional', '2 sessions', (n) => n === 2], ['One-time', '1 session', (n) => n === 1]];
    return { segments: segs.map(([label, desc, t]) => ({ label, desc, val: pct(of(t), total) })) };
  },

  async 'chart/audience/cohort-retention'({ W, from, to, user }) {
    const rows = await sql`with firsts as (select user_id, min(ts) as first from analytics_events group by user_id),
      cohort as (select user_id, first from firsts where first >= ${from}::timestamptz and first < ${to}::timestamptz + interval '1 day' ${user ? sql`and user_id = ${user}` : sql``})
      select floor(extract(epoch from (e.ts - c.first)) / 604800)::int as wk, count(distinct e.user_id)::int as users, (select count(*) from cohort)::int as size
      from analytics_events e join cohort c using (user_id) group by 1 order by 1`;
    const size = rows[0]?.size || 0;
    const by = new Map(rows.map((r) => [r.wk, r.users]));
    const last = Math.min(8, Math.max(0, ...rows.map((r) => r.wk)));
    return { data: Array.from({ length: last + 1 }, (_, wk) => ({ week: `Week ${wk}`, pct: wk === 0 ? (size ? 100 : 0) : pct(by.get(wk) ?? 0, size) })) };
  },

  async 'stats/audience/browser-share'({ W }) { return { data: await sql`select coalesce(browser, 'Unknown') as key, count(distinct session_id)::int as count from analytics_events where ${W} group by 1 order by 2 desc limit 8` }; },
  async 'stats/audience/os-share'({ W }) { return { data: await sql`select coalesce(os, 'Unknown') as key, count(distinct session_id)::int as count from analytics_events where ${W} group by 1 order by 2 desc limit 8` }; },
  async 'stats/audience/languages'({ W }) { return { data: await sql`select coalesce(language, 'Unknown') as key, count(distinct session_id)::int as count from analytics_events where ${W} group by 1 order by 2 desc limit 8` }; },

  async 'table/audience/high-value-users'({ W, q }) {
    const rows = (await sql`select user_id, count(distinct session_id)::int as sessions, (count(*) filter (where type = 'page_view'))::int as page_views,
        (count(*) filter (where type = 'share_button_click'))::int as shares, mode() within group (order by page_category) as top_category
      from analytics_events where ${W} group by user_id`).map((r) => ({ ...r, top_category: r.top_category ?? '—', score: r.sessions * 3 + r.page_views + r.shares * 5 }));
    const max_score = Math.max(0, ...rows.map((r) => r.score));
    return { ...tablePage(rows, q, { searchField: 'user_id', defaultSort: 'score' }), max_score };
  },

  // ── Geography ───────────────────────────────────────────────────────────────
  async 'stats/geo/top-countries'({ W }) {
    return { data: await sql`select coalesce(country, 'Unknown') as key, count(distinct session_id)::int as count from analytics_events where ${W} group by 1 order by 2 desc limit 10` };
  },

  async 'stats/geo/region-category-pref'({ W }) {
    const rows = await sql`select region, top_category, count from (
        select coalesce(region, country, 'Unknown') as region, page_category as top_category, count(*)::int as count,
          row_number() over (partition by coalesce(region, country, 'Unknown') order by count(*) desc) as rn
        from analytics_events where ${W} and type = 'page_view' and page_category is not null group by 1, 2) x where rn = 1 order by count desc limit 12`;
    const [{ n }] = await sql`select count(*)::int as n from analytics_events where ${W}`;
    return { data: rows, total_events: n };
  },

  async 'table/geo/localities'({ W }) {
    const rows = await sql`select coalesce(city, 'Unknown') as locality, coalesce(country, 'Unknown') as country, count(distinct user_id)::int as users, count(distinct session_id)::int as sessions,
      coalesce(avg(duration_ms) filter (where type = 'page_exit' and duration_ms > 0), 0)::float / 1000 as avg_time_s,
      coalesce(avg(depth) filter (where type = 'page_exit'), 0)::float / 25 as avg_interactions
      from analytics_events where ${W} group by 1, 2 order by 4 desc limit 20`;
    return { data: rows.map((r) => ({ ...r, avg_time_s: round1(r.avg_time_s), avg_interactions: round1(r.avg_interactions) })) };
  },

  // ── Sharing ─────────────────────────────────────────────────────────────────
  async 'stats/sharing/counts'({ W }) {
    const [r] = await sql`select (count(*) filter (where type = 'share_button_click'))::int as total_shares, (count(*) filter (where type = 'page_view'))::int as total_views from analytics_events where ${W}`;
    return r;
  },

  async 'stats/sharing/by-platform'({ W }) {
    const data = await sql`select coalesce(share_platform, 'other') as platform, count(*)::int as count from analytics_events where ${W} and type = 'share_button_click' group by 1 order by 2 desc`;
    return { total_shares: data.reduce((a, r) => a + r.count, 0), data };
  },

  async 'table/sharing/by-user'({ W }) {
    const rows = await sql`select user_id, count(*)::int as total, mode() within group (order by share_platform) as top_platform,
      array_agg(distinct coalesce(share_platform, 'other')) as platforms_used
      from analytics_events where ${W} and type = 'share_button_click' group by user_id order by 2 desc limit 200`;
    return { data: rows.map((r) => ({ ...r, top_platform: r.top_platform ?? 'other' })) };
  },

  async 'table/sharing/events'({ W }) {
    const rows = await sql`select (extract(epoch from ts) * 1000)::bigint as event_timestamp_ms, user_id, session_id, type as event_type, coalesce(share_platform, 'other') as share_platform
      from analytics_events where ${W} and type = 'share_button_click' order by ts desc limit 500`;
    return { data: rows.map((r) => ({ ...r, event_timestamp_ms: Number(r.event_timestamp_ms) })) };
  },

  // ── Realtime (last 30 minutes; ignores the date filter) ─────────────────────
  async 'realtime/summary'() {
    const R = sql`ts >= now() - interval '30 minutes'`;
    const [c] = await sql`select count(distinct user_id)::int as u, (count(*) filter (where type = 'page_view'))::int as v from analytics_events where ${R}`;
    const minutes = await sql`select to_char(date_trunc('minute', ts), 'HH24:MI') as minute, count(*)::int as count from analytics_events where ${R} and type = 'page_view' group by 1 order by 1`;
    const top_cities = await sql`select coalesce(city, 'Unknown') as city, count(distinct user_id)::int as count from analytics_events where ${R} group by 1 order by 2 desc limit 5`;
    const top_pages = await sql`select coalesce(page_title, page_id) as title, (count(*) filter (where type = 'page_view'))::int as views, count(distinct user_id)::int as users
      from analytics_events where ${R} and page_id is not null group by 1 order by 2 desc limit 10`;
    return { active_users: c.u, views_last_30m: c.v, minutes, top_cities, top_pages, last_update: new Date().toLocaleTimeString('en-GB') };
  },

  // The old service refreshed a warehouse here; our reports read the live table, so there is nothing to do.
  async export() { return { ok: true }; },
};

export const reportNames = Object.keys(REPORTS);

export const handler = async (event) => {
  const name = (event.path || '').replace(/^\/analytics\//, '').replace(/\/+$/, '');
  const run = REPORTS[name];
  if (!run) return { statusCode: 404, body: JSON.stringify({ message: `Unknown analytics report: ${name}` }) };

  const q = event.queryStringParameters || {};
  const today = iso(new Date());
  const to = isDate(q.to) ? q.to : today;
  const from = isDate(q.from) ? q.from : iso(new Date(Date.parse(to) - 30 * DAY));
  const user = q.user_id || null;
  const W = sql`ts >= ${from}::timestamptz and ts < ${to}::timestamptz + interval '1 day' ${user ? sql`and user_id = ${user}` : sql``}`;

  try {
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(await run({ W, q, from, to, user })) };
  } catch (err) {
    console.error(`analytics ${name} failed:`, err);
    return { statusCode: 500, body: JSON.stringify({ message: 'Analytics report failed', report: name }) };
  }
};
