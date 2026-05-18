-- gekos — referenční celé schema (D1 / SQLite).
-- Reálné aplikované migrace jsou v migrations/.

CREATE TABLE geckos (
  id           INTEGER PRIMARY KEY,
  slug         TEXT    NOT NULL UNIQUE,           -- 'bily' | 'bezovy' | 'hnedy'
  name         TEXT    NOT NULL,
  color_hex    TEXT,
  photo_url    TEXT,
  birth_date   TEXT,
  notes        TEXT,
  rescue_mode  INTEGER NOT NULL DEFAULT 0 CHECK(rescue_mode IN (0,1)),
  created_at   TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE misting_events (
  id           INTEGER PRIMARY KEY,
  ts           TEXT    NOT NULL,
  part_of_day  TEXT    NOT NULL CHECK(part_of_day IN ('rano','vecer','nahodne')),
  done         INTEGER NOT NULL DEFAULT 1 CHECK(done IN (0,1)),  -- 1 rošeno, 0 nerošeno
  note         TEXT
);
CREATE INDEX idx_misting_ts ON misting_events(ts DESC);

CREATE TABLE shedding_events (
  id              INTEGER PRIMARY KEY,
  gecko_id        INTEGER NOT NULL REFERENCES geckos(id),
  ts              TEXT    NOT NULL,
  checked         INTEGER NOT NULL DEFAULT 0 CHECK(checked IN (0,1)),
  check_reminded  INTEGER NOT NULL DEFAULT 0 CHECK(check_reminded IN (0,1)),
  note            TEXT
);
CREATE INDEX idx_shedding_gecko_ts ON shedding_events(gecko_id, ts DESC);
CREATE INDEX idx_shedding_pending  ON shedding_events(check_reminded, ts);

CREATE TABLE notifications_sent (
  id        INTEGER PRIMARY KEY,
  kind      TEXT NOT NULL,
  for_date  TEXT NOT NULL,
  sent_at   TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(kind, for_date)
);
