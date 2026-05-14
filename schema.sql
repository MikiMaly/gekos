-- gekos — referenční celé schema (D1 / SQLite).
-- Reálné aplikované migrace jsou v migrations/.

CREATE TABLE geckos (
  id          INTEGER PRIMARY KEY,
  slug        TEXT    NOT NULL UNIQUE,           -- 'bily' | 'bezovy' | 'hnedy'
  name        TEXT    NOT NULL,                  -- 'Bílý' | 'Béžový' | 'Hnědý'
  color_hex   TEXT,                              -- pro UI akcent
  photo_url   TEXT,
  birth_date  TEXT,                              -- ISO YYYY-MM-DD
  notes       TEXT,
  created_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE care_events (
  id        INTEGER PRIMARY KEY,
  gecko_id  INTEGER NOT NULL REFERENCES geckos(id),
  ts        TEXT    NOT NULL,                    -- ISO 8601 UTC
  category  TEXT    NOT NULL CHECK(category IN ('cvrcci','banan','antib','mast')),
  count     INTEGER NOT NULL DEFAULT 1 CHECK(count > 0),
  note      TEXT
);
CREATE INDEX idx_events_gecko_ts    ON care_events(gecko_id, ts DESC);
CREATE INDEX idx_events_category_ts ON care_events(category, ts DESC);

CREATE TABLE misting_events (
  id           INTEGER PRIMARY KEY,
  ts           TEXT    NOT NULL,                 -- ISO 8601 UTC
  part_of_day  TEXT    NOT NULL CHECK(part_of_day IN ('rano','vecer','nahodne')),
  note         TEXT
);
CREATE INDEX idx_misting_ts ON misting_events(ts DESC);
