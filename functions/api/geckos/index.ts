import type { Env, Gecko } from '../../_lib/types';

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { results } = await env.DB.prepare(
    `SELECT id, slug, name, color_hex, photo_url, birth_date, notes, created_at
     FROM geckos
     ORDER BY id`
  ).all<Gecko>();

  return Response.json({ geckos: results });
};
