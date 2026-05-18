import type { Env } from '../../../_lib/env';
import type { CreateDayNoteInput, DayNote } from '../../../_lib/types';
import { pragueLogicalDateString } from '../../../_lib/time';

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const url = new URL(request.url);
  const date = url.searchParams.get('date');
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const geckoSlug = url.searchParams.get('gecko');

  const where: string[] = [];
  const binds: (string | number)[] = [];

  if (date) {
    where.push('date_prague = ?');
    binds.push(date);
  } else {
    if (from) { where.push('date_prague >= ?'); binds.push(from); }
    if (to)   { where.push('date_prague <= ?'); binds.push(to); }
  }
  if (geckoSlug) {
    where.push('gecko_id = (SELECT id FROM geckos WHERE slug = ?)');
    binds.push(geckoSlug);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const { results } = await env.DB.prepare(
    `SELECT id, date_prague, gecko_id, text, created_at
     FROM day_notes
     ${whereSql}
     ORDER BY date_prague DESC, id DESC
     LIMIT 1000`
  )
    .bind(...binds)
    .all<DayNote>();

  return Response.json({ notes: results });
};

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  let body: CreateDayNoteInput;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }

  const text = body.text?.trim();
  if (!text) return Response.json({ error: 'empty_text' }, { status: 400 });

  const date = body.date_prague ?? pragueLogicalDateString();
  const geckoId = typeof body.gecko_id === 'number' ? body.gecko_id : null;

  const inserted = await env.DB.prepare(
    `INSERT INTO day_notes (date_prague, gecko_id, text)
     VALUES (?, ?, ?)
     RETURNING id, date_prague, gecko_id, text, created_at`
  )
    .bind(date, geckoId, text)
    .first<DayNote>();

  return Response.json({ note: inserted }, { status: 201 });
};

export const onRequestDelete: PagesFunction<Env> = async ({ env, request }) => {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return Response.json({ error: 'missing_id' }, { status: 400 });

  const res = await env.DB.prepare('DELETE FROM day_notes WHERE id = ?')
    .bind(Number(id))
    .run();
  return Response.json({ deleted: res.meta.changes });
};
