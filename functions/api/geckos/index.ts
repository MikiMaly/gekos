import type { Env } from '../../_lib/env';
import type { Gecko } from '../../_lib/types';

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { results } = await env.DB.prepare(
    `SELECT id, slug, name, color_hex, photo_url, birth_date, notes, rescue_mode, created_at
     FROM geckos
     ORDER BY id`
  ).all<Gecko>();

  return Response.json({ geckos: results });
};
