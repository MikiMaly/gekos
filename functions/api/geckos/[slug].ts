import type { Env, Gecko } from '../../_lib/types';

export const onRequestGet: PagesFunction<Env, 'slug'> = async ({ env, params }) => {
  const slug = params.slug as string;
  const gecko = await env.DB.prepare(
    `SELECT id, slug, name, color_hex, photo_url, birth_date, notes, created_at
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
