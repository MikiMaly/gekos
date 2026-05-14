import type { CreateSheddingInput, Env, SheddingEvent } from '../../../../src/lib/types';

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

  const where: string[] = ['gecko_id = ?'];
  const binds: (string | number)[] = [id];
  if (from) { where.push('ts >= ?'); binds.push(from); }
  if (to) { where.push('ts < ?'); binds.push(to); }

  const { results } = await env.DB.prepare(
    `SELECT id, gecko_id, ts, checked, check_reminded, note
     FROM shedding_events
     WHERE ${where.join(' AND ')}
     ORDER BY ts DESC
     LIMIT 1000`
  )
    .bind(...binds)
    .all<SheddingEvent>();

  return Response.json({ events: results });
};

export const onRequestPost: PagesFunction<Env, 'slug'> = async ({ env, params, request }) => {
  const slug = params.slug as string;
  const id = await geckoIdForSlug(env, slug);
  if (id == null) return Response.json({ error: 'gecko_not_found', slug }, { status: 404 });

  let body: CreateSheddingInput;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }

  const ts = body.ts ?? new Date().toISOString();
  const note = body.note?.trim() || null;

  const inserted = await env.DB.prepare(
    `INSERT INTO shedding_events (gecko_id, ts, note)
     VALUES (?, ?, ?)
     RETURNING id, gecko_id, ts, checked, check_reminded, note`
  )
    .bind(id, ts, note)
    .first<SheddingEvent>();

  return Response.json({ event: inserted }, { status: 201 });
};

export const onRequestPatch: PagesFunction<Env, 'slug'> = async ({ env, params, request }) => {
  const slug = params.slug as string;
  const id = await geckoIdForSlug(env, slug);
  if (id == null) return Response.json({ error: 'gecko_not_found', slug }, { status: 404 });

  const url = new URL(request.url);
  const eventId = url.searchParams.get('id');
  if (!eventId) return Response.json({ error: 'missing_event_id' }, { status: 400 });

  let body: { checked?: boolean; note?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }

  const sets: string[] = [];
  const binds: (string | number)[] = [];
  if (typeof body.checked === 'boolean') { sets.push('checked = ?'); binds.push(body.checked ? 1 : 0); }
  if (typeof body.note === 'string') { sets.push('note = ?'); binds.push(body.note || ''); }
  if (sets.length === 0) return Response.json({ error: 'nothing_to_update' }, { status: 400 });

  binds.push(Number(eventId), id);
  const updated = await env.DB.prepare(
    `UPDATE shedding_events SET ${sets.join(', ')} WHERE id = ? AND gecko_id = ?
     RETURNING id, gecko_id, ts, checked, check_reminded, note`
  )
    .bind(...binds)
    .first<SheddingEvent>();

  return Response.json({ event: updated });
};

export const onRequestDelete: PagesFunction<Env, 'slug'> = async ({ env, params, request }) => {
  const slug = params.slug as string;
  const id = await geckoIdForSlug(env, slug);
  if (id == null) return Response.json({ error: 'gecko_not_found', slug }, { status: 404 });

  const url = new URL(request.url);
  const eventId = url.searchParams.get('id');
  if (!eventId) return Response.json({ error: 'missing_event_id' }, { status: 400 });

  const res = await env.DB.prepare(
    `DELETE FROM shedding_events WHERE id = ? AND gecko_id = ?`
  )
    .bind(Number(eventId), id)
    .run();

  return Response.json({ deleted: res.meta.changes });
};
