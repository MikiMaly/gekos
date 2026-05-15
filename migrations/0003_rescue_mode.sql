-- 0003_rescue_mode: per-gecko flag pro zobrazení antib/mast v dashboard kartě.
-- Defaultně 0 (skryté). Zapíná se ručně na profilu gekona při léčbě
-- (typicky po problémech se svlékáním).
ALTER TABLE geckos ADD COLUMN rescue_mode INTEGER NOT NULL DEFAULT 0 CHECK(rescue_mode IN (0,1));
