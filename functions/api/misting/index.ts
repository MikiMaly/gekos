import type { Env } from '../../_lib/env';
import type { CreateMistingInput, MistingEvent, PartOfDay } from '../../_lib/types';

const PARTS: PartOfDay[] = ['rano', 'vecer', 'nahodne'];

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const url = new URL(request.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  const where: string[] = [];
  const binds: string[] = [];
  if (from) { where.push('ts >= ?'); binds.push(from); }
  if (to) { where.push('ts < ?'); binds.push(to); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const { results } = await env.DB.prepare(
    `SELECT id, ts, part_of_day, note
     FROM misting_events
     ${whereSql}
     ORDER BY ts DESC
     LIMIT 1000`
  )
    .bind(...binds)
    .all<MistingEvent>();

  return Response.json({ events: results });
};

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  let body: CreateMistingInput;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!PARTS.includes(body.part_of_day)) {
    return Response.json({ error: 'invalid_part_of_day' }, { status: 400 });
  }

  const ts = body.ts ?? new Date().toISOString();
  const note = body.note?.trim() || null;

  const inserted = await env.DB.prepare(
    `INSERT INTO misting_events (ts, part_of_day, note)
     VALUES (?, ?, ?)
     RETURNING id, ts, part_of_day, note`
  )
    .bind(ts, body.part_of_day, note)
    .first<MistingEvent>();

  return Response.json({ event: inserted }, { status: 201 });
};

export const onRequestDelete: PagesFunction<Env> = async ({ env, request }) => {
  const url = new URL(request.url);
  const eventId = url.searchParams.get('id');
  if (!eventId) return Response.json({ error: 'missing_event_id' }, { status: 400 });

  const res = await env.DB.prepare(`DELETE FROM misting_events WHERE id = ?`)
    .bind(Number(eventId))
    .run();

  return Response.json({ deleted: res.meta.changes });
};
