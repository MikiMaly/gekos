-- 0007_misting_source: od 1. 6. 2026 visí v teráriu automatický rosič, který
-- rosí každých 8 hodin po 45 sekundách (06:00 / 14:00 / 22:00 Praha). Zápisy
-- z rosiče potřebuju v historii odlišit od těch, co naklikám ručně nebo
-- odkliknu z Telegramu — jinak nepoznám, jestli záznam znamená "rosič jel"
-- nebo "zkontroloval jsem to sám".
--
--   source       'manual' = ruční klik / Telegram odpověď, 'auto' = rosič
--   duration_sec délka cyklu v sekundách (rosič = 45); NULL u ručních zápisů
--
-- Existující řádky zůstanou 'manual' přes DEFAULT.
ALTER TABLE misting_events ADD COLUMN source TEXT NOT NULL DEFAULT 'manual' CHECK(source IN ('manual','auto'));
ALTER TABLE misting_events ADD COLUMN duration_sec INTEGER;

CREATE INDEX idx_misting_source_ts ON misting_events(source, ts DESC);

-- Jeden auto zápis na (čas cyklu, slot). Díky tomu si vystačí INSERT OR IGNORE
-- a nevadí, když se backfill migrace a živý cron potkají na stejném dni.
-- Ruční zápisy index nehlídá — tam duplikát znamená "klikl jsem dvakrát" a to
-- je legitimní (slot má fixní čas, takže by jinak druhý klik spadl).
CREATE UNIQUE INDEX idx_misting_auto_unique
  ON misting_events(ts, part_of_day) WHERE source = 'auto';
