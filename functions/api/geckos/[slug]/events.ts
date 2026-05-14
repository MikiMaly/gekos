import type { CareEvent, CareCategory, CreateCareEventInput, Env } from '../../../_lib/types';

const CATEGORIES: CareCategory[] = ['cvrcci', 'banan', 'antib', 'mast'];

async function geckoIdForSlug(env: Env, slug: string): Promise<number | null> {
  const row = await env.DB.prepare('SELECT id FROM geckos WHERE slug = ?')
    .bind(slug)
    .first<{ id: number }>();
  return row?.id ?? null;
}

export const onRequestGet: PagesFunction<Env, 'slug'> = async ({ env, params, request }) => {
  const slug = params.slug as string;
  const id = await geckoIdForSlug(env, slug);
  if (id == null) return Response.json({ error: 'gecko_not_found', slug }, { status: 404 });

  const url = new URL(request.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const category = url.searchParams.get('category');

  const where: string[] = ['gecko_id = ?'];
  const binds: (string | number)[] = [id];
  if (from) { where.push('ts >= ?'); binds.push(from); }
  if (to) { where.push('ts < ?'); binds.push(to); }
  if (category) {
    if (!CATEGORIES.includes(category as CareCategory)) {
      return Response.json({ error: 'invalid_category' }, { status: 400 });
    }
    where.push('category = ?');
    binds.push(category);
  }

  const { results } = await env.DB.prepare(
    `SELECT id, gecko_id, ts, category, count, note
     FROM care_events
     WHERE ${where.join(' AND ')}
     ORDER BY ts DESC
     LIMIT 1000`
  )
    .bind(...binds)
    .all<CareEvent>();

  return Response.json({ events: results });
};

export const onRequestPost: PagesFunction<Env, 'slug'> = async ({ env, params, request }) => {
  const slug = params.slug as string;
  const id = await geckoIdForSlug(env, slug);
  if (id == null) return Response.json({ error: 'gecko_not_found', slug }, { status: 404 });

  let body: CreateCareEventInput;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!CATEGORIES.includes(body.category)) {
    return Response.json({ error: 'invalid_category' }, { status: 400 });
  }
  const count = body.count ?? 1;
  if (!Number.isInteger(count) || count <= 0) {
    return Response.json({ error: 'count_must_be_positive_integer' }, { status: 400 });
  }

  const ts = body.ts ?? new Date().toISOString();
  const note = body.note?.trim() || null;

  const insert = await env.DB.prepare(
    `INSERT INTO care_events (gecko_id, ts, category, count, note)
     VALUES (?, ?, ?, ?, ?)
     RETURNING id, gecko_id, ts, category, count, note`
  )
    .bind(id, ts, body.category, count, note)
    .first<CareEvent>();

  return Response.json({ event: insert }, { status: 201 });
};

export const onRequestDelete: PagesFunction<Env, 'slug'> = async ({ env, params, request }) => {
  const slug = params.slug as string;
  const id = await geckoIdForSlug(env, slug);
  if (id == null) return Response.json({ error: 'gecko_not_found', slug }, { status: 404 });

  const url = new URL(request.url);
  const eventId = url.searchParams.get('id');
  if (!eventId) return Response.json({ error: 'missing_event_id' }, { status: 400 });

  const res = await env.DB.prepare(
    `DELETE FROM care_events WHERE id = ? AND gecko_id = ?`
  )
    .bind(Number(eventId), id)
    .run();

  return Response.json({ deleted: res.meta.changes });
};
