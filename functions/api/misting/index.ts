import type { CreateMistingInput, Env, MistingEvent, PartOfDay } from '../../../src/lib/types';

const PARTS: PartOfDay[] = ['rano', 'vecer'];

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
    `SELECT id, ts, part_of_day, done, note
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
  if (typeof body.done !== 'boolean') {
    return Response.json({ error: 'done_must_be_boolean' }, { status: 400 });
  }

  const ts = body.ts ?? new Date().toISOString();
  const done = body.done ? 1 : 0;
  const note = body.note ?? null;

  const inserted = await env.DB.prepare(
    `INSERT INTO misting_events (ts, part_of_day, done, note)
     VALUES (?, ?, ?, ?)
     RETURNING id, ts, part_of_day, done, note`
  )
    .bind(ts, body.part_of_day, done, note)
    .first<MistingEvent>();

  return Response.json({ event: inserted }, { status: 201 });
};
