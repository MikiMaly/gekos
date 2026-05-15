import type { Env } from '../../_lib/env';
import type { Gecko } from '../../_lib/types';

export const onRequestGet: PagesFunction<Env, 'slug'> = async ({ env, params }) => {
  const slug = params.slug as string;
  const gecko = await env.DB.prepare(
    `SELECT id, slug, name, color_hex, photo_url, birth_date, notes, rescue_mode, created_at
     FROM geckos
     WHERE slug = ?`
  )
    .bind(slug)
    .first<Gecko>();

  if (!gecko) {
    return Response.json({ error: 'gecko_not_found', slug }, { status: 404 });
  }
  return Response.json({ gecko });
};

export const onRequestPatch: PagesFunction<Env, 'slug'> = async ({ env, params, request }) => {
  const slug = params.slug as string;

  let body: { rescue_mode?: boolean; notes?: string; birth_date?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }

  const sets: string[] = [];
  const binds: (string | number)[] = [];
  if (typeof body.rescue_mode === 'boolean') {
    sets.push('rescue_mode = ?');
    binds.push(body.rescue_mode ? 1 : 0);
  }
  if (typeof body.notes === 'string') {
    sets.push('notes = ?');
    binds.push(body.notes);
  }
  if (typeof body.birth_date === 'string') {
    sets.push('birth_date = ?');
    binds.push(body.birth_date);
  }
  if (sets.length === 0) {
    return Response.json({ error: 'nothing_to_update' }, { status: 400 });
  }

  binds.push(slug);
  const updated = await env.DB.prepare(
    `UPDATE geckos SET ${sets.join(', ')} WHERE slug = ?
     RETURNING id, slug, name, color_hex, photo_url, birth_date, notes, rescue_mode, created_at`
  )
    .bind(...binds)
    .first<Gecko>();

  if (!updated) {
    return Response.json({ error: 'gecko_not_found', slug }, { status: 404 });
  }
  return Response.json({ gecko: updated });
};
