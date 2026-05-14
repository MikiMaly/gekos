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

CREATE TABLE care_events (
  id        INTEGER PRIMARY KEY,
  gecko_id  INTEGER NOT NULL REFERENCES geckos(id),
  ts        TEXT    NOT NULL,
  category  TEXT    NOT NULL CHECK(category IN ('cvrcci','banan','antib','mast')),
  given     INTEGER NOT NULL CHECK(given IN (0,1)),
  note      TEXT
);
CREATE INDEX idx_events_gecko_ts    ON care_events(gecko_id, ts DESC);
CREATE INDEX idx_events_category_ts ON care_events(category, ts DESC);

CREATE TABLE misting_events (
  id           INTEGER PRIMARY KEY,
  ts           TEXT    NOT NULL,
  part_of_day  TEXT    NOT NULL CHECK(part_of_day IN ('rano','vecer')),
  done         INTEGER NOT NULL CHECK(done IN (0,1)),
  note         TEXT
);
CREATE INDEX idx_misting_ts ON misting_events(ts DESC);
