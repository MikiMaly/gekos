-- 0001_init: tabulky geckos, care_events, misting_events

CREATE TABLE geckos (
  id          INTEGER PRIMARY KEY,
  slug        TEXT    NOT NULL UNIQUE,
  name        TEXT    NOT NULL,
  color_hex   TEXT,
  photo_url   TEXT,
  birth_date  TEXT,
  notes       TEXT,
  created_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Každý řádek = jedna proběhlá péče. Více řádků za den je normální
-- (např. 1 cvrček odpoledne + 2 večer = dva řádky s count 1 a 2,
-- nebo banán ze lžičky + z mističky = dva řádky s note).
CREATE TABLE care_events (
  id        INTEGER PRIMARY KEY,
  gecko_id  INTEGER NOT NULL REFERENCES geckos(id),
  ts        TEXT    NOT NULL,
  category  TEXT    NOT NULL CHECK(category IN ('cvrcci','banan','antib','mast')),
  count     INTEGER NOT NULL DEFAULT 1 CHECK(count > 0),
  note      TEXT
);
CREATE INDEX idx_events_gecko_ts    ON care_events(gecko_id, ts DESC);
CREATE INDEX idx_events_category_ts ON care_events(category, ts DESC);

-- Teráriové mlžení. part_of_day: rano | vecer = pravidelné slotted;
-- nahodne = neplánované navíc během dne.
CREATE TABLE misting_events (
  id           INTEGER PRIMARY KEY,
  ts           TEXT    NOT NULL,
  part_of_day  TEXT    NOT NULL CHECK(part_of_day IN ('rano','vecer','nahodne')),
  note         TEXT
);
CREATE INDEX idx_misting_ts ON misting_events(ts DESC);
