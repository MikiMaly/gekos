import type { CareEvent, CareCategory, Env } from '../../../../../src/lib/types';

const CATEGORIES: CareCategory[] = ['cvrcci', 'banan', 'antib', 'mast'];

export const onRequestGet: PagesFunction<Env, 'slug'> = async ({ env, params }) => {
  const slug = params.slug as string;
  const gecko = await env.DB.prepare('SELECT id FROM geckos WHERE slug = ?')
    .bind(slug)
    .first<{ id: number }>();
  if (!gecko) return Response.json({ error: 'gecko_not_found', slug }, { status: 404 });

  // Per category: latest event for this gecko.
  // Window-function variant works in SQLite >= 3.25, which D1 supports.
  const { results } = await env.DB.prepare(
    `SELECT id, gecko_id, ts, category, given, note FROM (
       SELECT id, gecko_id, ts, category, given, note,
              ROW_NUMBER() OVER (PARTITION BY category ORDER BY ts DESC) AS rn
       FROM care_events
       WHERE gecko_id = ?
     )
     WHERE rn = 1`
  )
    .bind(gecko.id)
    .all<CareEvent>();

  const last: Record<CareCategory, CareEvent | null> = {
    cvrcci: null, banan: null, antib: null, mast: null,
  };
  for (const ev of results) {
    if (CATEGORIES.includes(ev.category)) last[ev.category] = ev;
  }
  return Response.json({ last });
};
