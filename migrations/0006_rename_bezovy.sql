-- 0006_rename_bezovy: bežový gekon přejmenován na "Skalár Mrouskavý". Slug 'bezovy' zůstává.

UPDATE geckos SET name = 'Skalár Mrouskavý' WHERE slug = 'bezovy';
