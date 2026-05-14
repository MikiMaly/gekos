interface Env {
  DB: D1Database;
  BOT_TOKEN: string;
  TELEGRAM_CHAT_ID: string;
}

const TZ = 'Europe/Prague';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

interface PragueNow {
  ymd: string;
  hour: number;
}

function pragueNow(now: Date = new Date()): PragueNow {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  });
  const p = fmt.formatToParts(now);
  const get = (t: Intl.DateTimeFormatPartTypes) => p.find((x) => x.type === t)!.value;
  const h = get('hour');
  return {
    ymd: `${get('year')}-${get('month')}-${get('day')}`,
    hour: h === '24' ? 0 : Number(h),
  };
}

function pragueMidnightUtc(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
  const p = fmt.formatToParts(guess);
  const get = (t: Intl.DateTimeFormatPartTypes) => Number(p.find((x) => x.type === t)!.value);
  const h = get('hour');
  const asPragueMs = Date.UTC(get('year'), get('month') - 1, get('day'), h === 24 ? 0 : h, get('minute'), get('second'));
  return new Date(guess.getTime() + (guess.getTime() - asPragueMs));
}

function todayRange(now: Date = new Date()): { start: string; end: string } {
  const { ymd } = pragueNow(now);
  const start = pragueMidnightUtc(ymd);
  const end = new Date(start.getTime() + ONE_DAY_MS);
  return { start: start.toISOString(), end: end.toISOString() };
}

async function tg(env: Env, text: string): Promise<void> {
  const url = `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: env.TELEGRAM_CHAT_ID,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  });
  if (!res.ok) {
    console.error(`Telegram send failed: ${res.status} ${await res.text()}`);
  }
}

/**
 * Returns true if this notification kind+date wasn't yet sent (and reserves it).
 */
async function reserveNotification(env: Env, kind: string, forDate: string): Promise<boolean> {
  const res = await env.DB.prepare(
    `INSERT OR IGNORE INTO notifications_sent (kind, for_date) VALUES (?, ?)`
  )
    .bind(kind, forDate)
    .run();
  return (res.meta.changes ?? 0) > 0;
}

async function mistingExistsToday(env: Env, part: 'rano' | 'vecer'): Promise<boolean> {
  const { start, end } = todayRange();
  const row = await env.DB.prepare(
    `SELECT 1 AS x FROM misting_events WHERE part_of_day = ? AND ts >= ? AND ts < ? LIMIT 1`
  )
    .bind(part, start, end)
    .first();
  return row !== null;
}

interface GeckoRow { id: number; slug: string; name: string }

async function feedingStaleness(env: Env): Promise<Array<{ gecko: GeckoRow; daysAgo: number | null }>> {
  const { results: geckos } = await env.DB.prepare(
    `SELECT id, slug, name FROM geckos`
  ).all<GeckoRow>();
  const out: Array<{ gecko: GeckoRow; daysAgo: number | null }> = [];
  for (const g of geckos) {
    const row = await env.DB.prepare(
      `SELECT MAX(ts) AS last_ts FROM care_events
       WHERE gecko_id = ? AND category IN ('cvrcci','banan')`
    )
      .bind(g.id)
      .first<{ last_ts: string | null }>();
    const last = row?.last_ts ? new Date(row.last_ts).getTime() : null;
    const daysAgo = last === null ? null : Math.floor((Date.now() - last) / ONE_DAY_MS);
    out.push({ gecko: g, daysAgo });
  }
  return out;
}

async function checkMistingMorning(env: Env, ymd: string): Promise<void> {
  if (await mistingExistsToday(env, 'rano')) return;
  if (!(await reserveNotification(env, 'misting_rano', ymd))) return;
  await tg(env, '🌅 Mlžil jsi dnes <b>ráno</b>?');
}

async function checkMistingEvening(env: Env, ymd: string): Promise<void> {
  if (await mistingExistsToday(env, 'vecer')) return;
  if (!(await reserveNotification(env, 'misting_vecer', ymd))) return;
  await tg(env, '🌙 Mlžil jsi dnes <b>večer</b>?');
}

async function checkFeedingStaleness(env: Env, ymd: string): Promise<void> {
  for (const { gecko, daysAgo } of await feedingStaleness(env)) {
    if (daysAgo === null) continue; // gecko nikdy nedostal — nemáme baseline, neřešíme
    if (daysAgo >= 3) {
      if (await reserveNotification(env, `feeding_stale_ultra:${gecko.slug}`, ymd)) {
        await tg(env, `🚨 <b>${gecko.name}</b> už ${daysAgo} dní bez krmení!`);
      }
    } else if (daysAgo >= 2) {
      if (await reserveNotification(env, `feeding_stale_warn:${gecko.slug}`, ymd)) {
        await tg(env, `⚠️ <b>${gecko.name}</b> ${daysAgo} dní bez krmení`);
      }
    }
  }
}

async function checkSheddingFollowups(env: Env): Promise<void> {
  const cutoff = new Date(Date.now() - ONE_DAY_MS).toISOString();
  const { results } = await env.DB.prepare(
    `SELECT s.id AS sid, g.name AS name, g.slug AS slug
     FROM shedding_events s
     JOIN geckos g ON g.id = s.gecko_id
     WHERE s.check_reminded = 0 AND s.checked = 0 AND s.ts <= ?`
  )
    .bind(cutoff)
    .all<{ sid: number; name: string; slug: string }>();

  for (const row of results) {
    await tg(
      env,
      `🦎 Zkontroluj <b>${row.name}</b> po svlékání — zbytky kůže na prstech, ocase, kolem očí.`
    );
    await env.DB.prepare(
      `UPDATE shedding_events SET check_reminded = 1 WHERE id = ?`
    )
      .bind(row.sid)
      .run();
  }
}

export default {
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    const work = (async () => {
      const { ymd, hour } = pragueNow();

      if (hour === 9) await checkMistingMorning(env, ymd);
      if (hour === 22) await checkMistingEvening(env, ymd);
      if (hour === 11) await checkFeedingStaleness(env, ymd);

      // Svlékání kontrola — každou hodinu, jakmile uplyne 24 h.
      await checkSheddingFollowups(env);
    })();

    ctx.waitUntil(work);
  },

  // Pomocný HTTP endpoint pro testování / manuální trigger.
  // Zavolat: POST https://gekos-cron.<account>.workers.dev/?hour=22
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
    const url = new URL(request.url);
    const hourParam = url.searchParams.get('hour');
    const hourOverride = hourParam ? Number(hourParam) : null;
    const { ymd, hour: realHour } = pragueNow();
    const hour = hourOverride ?? realHour;

    if (hour === 9) await checkMistingMorning(env, ymd);
    if (hour === 22) await checkMistingEvening(env, ymd);
    if (hour === 11) await checkFeedingStaleness(env, ymd);
    await checkSheddingFollowups(env);

    return Response.json({ ok: true, ymd, hour });
  },
};
