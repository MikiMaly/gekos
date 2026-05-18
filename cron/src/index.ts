interface Env {
  DB: D1Database;
  BOT_TOKEN: string;
  TELEGRAM_CHAT_ID: string;
  TELEGRAM_WEBHOOK_SECRET: string;
}

const TZ = 'Europe/Prague';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// ─────────────── time helpers ─────────────────────────────────────────────

interface PragueNow {
  ymd: string;
  hour: number;
  minute: number;
}

function pragueNow(now: Date = new Date()): PragueNow {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const p = fmt.formatToParts(now);
  const get = (t: Intl.DateTimeFormatPartTypes) => p.find((x) => x.type === t)!.value;
  const h = get('hour');
  return {
    ymd: `${get('year')}-${get('month')}-${get('day')}`,
    hour: h === '24' ? 0 : Number(h),
    minute: Number(get('minute')),
  };
}

function pragueWallTimeToUtc(pragueYmd: string, hour: number, minute = 0): Date {
  const [y, m, d] = pragueYmd.split('-').map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d, hour, minute, 0));
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
  const p = fmt.formatToParts(guess);
  const num = (t: Intl.DateTimeFormatPartTypes) => Number(p.find((x) => x.type === t)!.value);
  const gh = num('hour');
  const guessAsPragueMs = Date.UTC(
    num('year'), num('month') - 1, num('day'),
    gh === 24 ? 0 : gh, num('minute'), num('second')
  );
  const desiredAsPragueMs = Date.UTC(y, m - 1, d, hour, minute, 0);
  const offsetMs = desiredAsPragueMs - guessAsPragueMs;
  return new Date(guess.getTime() + offsetMs);
}

function todayRange(now: Date = new Date()): { start: string; end: string } {
  const { ymd } = pragueNow(now);
  const start = pragueWallTimeToUtc(ymd, 0);
  const end = new Date(start.getTime() + ONE_DAY_MS);
  return { start: start.toISOString(), end: end.toISOString() };
}

// ─────────────── telegram api ─────────────────────────────────────────────

async function tgCall(env: Env, method: string, body: Record<string, unknown>): Promise<Response> {
  return fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function sendMessage(env: Env, text: string, options: Record<string, unknown> = {}): Promise<void> {
  const r = await tgCall(env, 'sendMessage', {
    chat_id: env.TELEGRAM_CHAT_ID,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    ...options,
  });
  if (!r.ok) console.error(`sendMessage failed: ${r.status} ${await r.text()}`);
}

async function editMessageText(env: Env, chatId: number, messageId: number, text: string): Promise<void> {
  const r = await tgCall(env, 'editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: [] },
  });
  if (!r.ok) console.error(`editMessageText failed: ${r.status} ${await r.text()}`);
}

async function answerCallbackQuery(env: Env, queryId: string, text: string): Promise<void> {
  const r = await tgCall(env, 'answerCallbackQuery', {
    callback_query_id: queryId,
    text,
  });
  if (!r.ok) console.error(`answerCallbackQuery failed: ${r.status} ${await r.text()}`);
}

// ─────────────── idempotency + queries ────────────────────────────────────

async function reserve(env: Env, kind: string, forDate: string): Promise<boolean> {
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
  const { results: geckos } = await env.DB.prepare(`SELECT id, slug, name FROM geckos`).all<GeckoRow>();
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

// ─────────────── notification kinds ───────────────────────────────────────

async function preReminderMorning(env: Env, ymd: string): Promise<void> {
  if (!(await reserve(env, 'misting_rano_prereminder', ymd))) return;
  await sendMessage(env, '🔔 Za 15 minut <b>ranní mlžení</b> (09:00).');
}

async function preReminderEvening(env: Env, ymd: string): Promise<void> {
  if (!(await reserve(env, 'misting_vecer_prereminder', ymd))) return;
  await sendMessage(env, '🔔 Za 15 minut <b>večerní mlžení</b> (22:00).');
}

function mistingButtons(part: 'rano' | 'vecer', ymd: string) {
  return {
    inline_keyboard: [
      [
        { text: '👍 Ano', callback_data: `mist:yes:${part}:${ymd}` },
        { text: '👎 Ne', callback_data: `mist:no:${part}:${ymd}` },
      ],
    ],
  };
}

async function mistingCheckMorning(env: Env, ymd: string): Promise<void> {
  if (await mistingExistsToday(env, 'rano')) return;
  if (!(await reserve(env, 'misting_rano_check', ymd))) return;
  await sendMessage(env, '🌅 Mlžil jsi dnes <b>ráno</b>?', {
    reply_markup: mistingButtons('rano', ymd),
  });
}

async function mistingCheckEvening(env: Env, ymd: string): Promise<void> {
  if (await mistingExistsToday(env, 'vecer')) return;
  if (!(await reserve(env, 'misting_vecer_check', ymd))) return;
  await sendMessage(env, '🌙 Mlžil jsi dnes <b>večer</b>?', {
    reply_markup: mistingButtons('vecer', ymd),
  });
}

async function checkFeedingStaleness(env: Env, ymd: string): Promise<void> {
  for (const { gecko, daysAgo } of await feedingStaleness(env)) {
    if (daysAgo === null) continue;
    if (daysAgo >= 4) {
      if (await reserve(env, `feeding_stale_ultra:${gecko.slug}`, ymd)) {
        await sendMessage(env, `🚨 <b>${gecko.name}</b> už ${daysAgo} dní bez krmení!`);
      }
    } else if (daysAgo >= 3) {
      if (await reserve(env, `feeding_stale_warn:${gecko.slug}`, ymd)) {
        await sendMessage(env, `⚠️ <b>${gecko.name}</b> ${daysAgo} dní bez krmení`);
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
    await sendMessage(
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

// ─────────────── webhook (inline button callbacks) ────────────────────────

interface TelegramCallbackQuery {
  id: string;
  data?: string;
  message: {
    chat: { id: number };
    message_id: number;
  };
}

async function handleMistingCallback(env: Env, cb: TelegramCallbackQuery): Promise<void> {
  const data = cb.data ?? '';
  const parts = data.split(':');
  if (parts[0] !== 'mist' || parts.length !== 4) {
    await answerCallbackQuery(env, cb.id, '');
    return;
  }
  const [, decision, partOfDay, dateStr] = parts;
  if (partOfDay !== 'rano' && partOfDay !== 'vecer') {
    await answerCallbackQuery(env, cb.id, 'Neznámý slot');
    return;
  }
  const done = decision === 'yes' ? 1 : 0;
  const hour = partOfDay === 'rano' ? 9 : 22;
  const ts = pragueWallTimeToUtc(dateStr, hour).toISOString();

  await env.DB.prepare(
    `INSERT INTO misting_events (ts, part_of_day, done, note) VALUES (?, ?, ?, ?)`
  )
    .bind(ts, partOfDay, done, null)
    .run();

  const slotName = partOfDay === 'rano' ? 'Ráno' : 'Večer';
  const newText =
    done === 1
      ? `✅ <b>${slotName}</b> rošeno — zapsáno do historie`
      : `❌ <b>${slotName}</b> nerošeno — zapsáno do historie`;

  await editMessageText(env, cb.message.chat.id, cb.message.message_id, newText);
  await answerCallbackQuery(env, cb.id, done === 1 ? 'Zapsáno: rošeno' : 'Zapsáno: nerošeno');
}

// ─────────────── scheduled dispatcher ─────────────────────────────────────

async function runForTime(env: Env, ymd: string, hour: number, minute: number): Promise<void> {
  if (minute === 0) {
    await checkSheddingFollowups(env);
    if (hour === 11 || hour === 21) await checkFeedingStaleness(env, ymd);
  }
  if (minute === 5) {
    if (hour === 9) await mistingCheckMorning(env, ymd);
    if (hour === 22) await mistingCheckEvening(env, ymd);
  }
  if (minute === 45) {
    if (hour === 8) await preReminderMorning(env, ymd);
    if (hour === 21) await preReminderEvening(env, ymd);
  }
}

export default {
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    const { ymd, hour, minute } = pragueNow();
    ctx.waitUntil(runForTime(env, ymd, hour, minute));
  },

  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Telegram webhook pro inline button callbacks.
    if (url.pathname === '/telegram' && request.method === 'POST') {
      const tokenHeader = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
      if (tokenHeader !== env.TELEGRAM_WEBHOOK_SECRET) {
        return new Response('forbidden', { status: 403 });
      }
      const update = (await request.json()) as { callback_query?: TelegramCallbackQuery };
      if (update.callback_query) {
        await handleMistingCallback(env, update.callback_query);
      }
      return new Response('ok');
    }

    // Manuální trigger pro testování — POST / s ?hour=N&minute=M.
    if (request.method === 'POST' && (url.pathname === '/' || url.pathname === '')) {
      const real = pragueNow();
      const hourParam = url.searchParams.get('hour');
      const minuteParam = url.searchParams.get('minute');
      const hour = hourParam !== null ? Number(hourParam) : real.hour;
      const minute = minuteParam !== null ? Number(minuteParam) : real.minute;
      await runForTime(env, real.ymd, hour, minute);
      return Response.json({ ok: true, ymd: real.ymd, hour, minute });
    }

    return new Response('Not Found', { status: 404 });
  },
};
