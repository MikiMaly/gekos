import type { CareCategory, CareEvent, Env, Gecko, MistingEvent, PartOfDay } from '../../src/lib/types';
import { pragueDateString, pragueTodayRange } from '../../src/lib/time';

const CATEGORIES: CareCategory[] = ['cvrcci', 'banan', 'antib', 'mast'];

interface DashboardGecko {
  gecko: Gecko;
  today_events: CareEvent[];
  last_event_per_category: Record<CareCategory, CareEvent | null>;
}

interface DashboardResponse {
  date_prague: string;
  geckos: DashboardGecko[];
  misting_today: Record<PartOfDay, { done: boolean; ts: string | null }>;
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { start, end } = pragueTodayRange();

  const [geckosRes, todayEventsRes, lastEventsRes, mistingTodayRes] = await env.DB.batch([
    env.DB.prepare(
      `SELECT id, slug, name, color_hex, photo_url, birth_date, notes, created_at
       FROM geckos
       ORDER BY id`
    ),
    env.DB.prepare(
      `SELECT id, gecko_id, ts, category, given, note
       FROM care_events
       WHERE ts >= ? AND ts < ?
       ORDER BY ts DESC`
    ).bind(start, end),
    env.DB.prepare(
      `SELECT id, gecko_id, ts, category, given, note FROM (
         SELECT id, gecko_id, ts, category, given, note,
                ROW_NUMBER() OVER (PARTITION BY gecko_id, category ORDER BY ts DESC) AS rn
         FROM care_events
       )
       WHERE rn = 1`
    ),
    env.DB.prepare(
      `SELECT id, ts, part_of_day, done, note
       FROM misting_events
       WHERE ts >= ? AND ts < ?
       ORDER BY ts DESC`
    ).bind(start, end),
  ]);

  const geckos = geckosRes.results as unknown as Gecko[];
  const todayEvents = todayEventsRes.results as unknown as CareEvent[];
  const lastEvents = lastEventsRes.results as unknown as CareEvent[];
  const mistingToday = mistingTodayRes.results as unknown as MistingEvent[];

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
    return { gecko: g, today_events, last_event_per_category };
  });

  const misting_today: Record<PartOfDay, { done: boolean; ts: string | null }> = {
    rano: { done: false, ts: null },
    vecer: { done: false, ts: null },
  };
  // Latest entry of the day wins (user can toggle multiple times).
  for (const m of mistingToday) {
    const slot = misting_today[m.part_of_day];
    if (slot.ts === null) {
      slot.done = m.done === 1;
      slot.ts = m.ts;
    }
  }

  const response: DashboardResponse = {
    date_prague: pragueDateString(),
    geckos: byGecko,
    misting_today,
  };
  return Response.json(response);
};
