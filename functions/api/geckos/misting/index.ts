import type { Env } from '../../../_lib/env';
import type { CreateMistingInput, MistingEvent, MistingSource, PartOfDay } from '../../../_lib/types';

const PARTS: PartOfDay[] = ['rano', 'vecer', 'nahodne'];
const SOURCES: MistingSource[] = ['manual', 'auto'];

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const url = new URL(request.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const source = url.searchParams.get('source');

  if (source && !SOURCES.includes(source as MistingSource)) {
    return Response.json({ error: 'invalid_source' }, { status: 400 });
  }

  const where: string[] = [];
  const binds: string[] = [];
  if (from) { where.push('ts >= ?'); binds.push(from); }
  if (to) { where.push('ts < ?'); binds.push(to); }
  if (source) { where.push('source = ?'); binds.push(source); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const { results } = await env.DB.prepare(
    `SELECT id, ts, part_of_day, done, source, duration_sec, note
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

  if (body.source && !SOURCES.includes(body.source)) {
    return Response.json({ error: 'invalid_source' }, { status: 400 });
  }
  const source: MistingSource = body.source ?? 'manual';

  const ts = body.ts ?? new Date().toISOString();
  const done = body.done === false ? 0 : 1;
  const note = body.note?.trim() || null;
  const durationSec =
    typeof body.duration_sec === 'number' && body.duration_sec > 0
      ? Math.round(body.duration_sec)
      : null;

  const inserted = await env.DB.prepare(
    `INSERT INTO misting_events (ts, part_of_day, done, source, duration_sec, note)
     VALUES (?, ?, ?, ?, ?, ?)
     RETURNING id, ts, part_of_day, done, source, duration_sec, note`
  )
    .bind(ts, body.part_of_day, done, source, durationSec, note)
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
