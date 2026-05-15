import type { Env } from '../../_lib/env';
import type { CareCategory, CareEvent, Gecko, MistingEvent, SheddingEvent } from '../../_lib/types';
import { pragueDateString, pragueTodayRange } from '../../_lib/time';

const CATEGORIES: CareCategory[] = ['cvrcci', 'banan', 'antib', 'mast'];

interface DashboardGecko {
  gecko: Gecko;
  today_events: CareEvent[];
  last_event_per_category: Record<CareCategory, CareEvent | null>;
  last_shedding: SheddingEvent | null;
}

interface DashboardResponse {
  date_prague: string;
  geckos: DashboardGecko[];
  misting_today: {
    rano: { latest_ts: string | null };
    vecer: { latest_ts: string | null };
    nahodne: { count: number; latest_ts: string | null };
  };
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { start, end } = pragueTodayRange();

  const [geckosRes, todayEventsRes, lastEventsRes, mistingTodayRes, lastSheddingRes] = await env.DB.batch([
    env.DB.prepare(
      `SELECT id, slug, name, color_hex, photo_url, birth_date, notes, rescue_mode, created_at
       FROM geckos
       ORDER BY id`
    ),
    env.DB.prepare(
      `SELECT id, gecko_id, ts, category, count, note
       FROM care_events
       WHERE ts >= ? AND ts < ?
       ORDER BY ts DESC`
    ).bind(start, end),
    env.DB.prepare(
      `SELECT id, gecko_id, ts, category, count, note FROM (
         SELECT id, gecko_id, ts, category, count, note,
                ROW_NUMBER() OVER (PARTITION BY gecko_id, category ORDER BY ts DESC) AS rn
         FROM care_events
       )
       WHERE rn = 1`
    ),
    env.DB.prepare(
      `SELECT id, ts, part_of_day, note
       FROM misting_events
       WHERE ts >= ? AND ts < ?
       ORDER BY ts DESC`
    ).bind(start, end),
    env.DB.prepare(
      `SELECT id, gecko_id, ts, checked, check_reminded, note FROM (
         SELECT id, gecko_id, ts, checked, check_reminded, note,
                ROW_NUMBER() OVER (PARTITION BY gecko_id ORDER BY ts DESC) AS rn
         FROM shedding_events
       )
       WHERE rn = 1`
    ),
  ]);

  const geckos = geckosRes.results as unknown as Gecko[];
  const todayEvents = todayEventsRes.results as unknown as CareEvent[];
  const lastEvents = lastEventsRes.results as unknown as CareEvent[];
  const mistingToday = mistingTodayRes.results as unknown as MistingEvent[];
  const lastShedding = lastSheddingRes.results as unknown as SheddingEvent[];

  const byGecko: DashboardGecko[] = geckos.map((g) => {
    const today_events = todayEvents.filter((e) => e.gecko_id === g.id);
    const last_event_per_category: Record<CareCategory, CareEvent | null> = {
      cvrcci: null, banan: null, antib: null, mast: null,
    };
    for (const ev of lastEvents) {
      if (ev.gecko_id === g.id && CATEGORIES.includes(ev.category)) {
        last_event_per_category[ev.category] = ev;
      }
    }
    const last_shedding = lastShedding.find((s) => s.gecko_id === g.id) ?? null;
    return { gecko: g, today_events, last_event_per_category, last_shedding };
  });

  const misting_today: DashboardResponse['misting_today'] = {
    rano: { latest_ts: null },
    vecer: { latest_ts: null },
    nahodne: { count: 0, latest_ts: null },
  };
  for (const m of mistingToday) {
    if (m.part_of_day === 'nahodne') {
      misting_today.nahodne.count += 1;
      if (misting_today.nahodne.latest_ts === null) misting_today.nahodne.latest_ts = m.ts;
    } else {
      const slot = misting_today[m.part_of_day];
      if (slot.latest_ts === null) slot.latest_ts = m.ts;
    }
  }

  const response: DashboardResponse = {
    date_prague: pragueDateString(),
    geckos: byGecko,
    misting_today,
  };
  return Response.json(response);
};
