-- 0001_init: tabulky geckos, care_events, misting_events, shedding_events, notifications_sent

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
  count     INTEGER NOT NULL DEFAULT 1 CHECK(count > 0),
  note      TEXT
);
CREATE INDEX idx_events_gecko_ts    ON care_events(gecko_id, ts DESC);
CREATE INDEX idx_events_category_ts ON care_events(category, ts DESC);

CREATE TABLE misting_events (
  id           INTEGER PRIMARY KEY,
  ts           TEXT    NOT NULL,
  part_of_day  TEXT    NOT NULL CHECK(part_of_day IN ('rano','vecer','nahodne')),
  note         TEXT
);
CREATE INDEX idx_misting_ts ON misting_events(ts DESC);

-- Svlékání. checked=1 znamená že už jsem zkontroloval že kůže pořádně sletěla
-- (krčíci občas zůstanou s kůží na prstech / na ocase / kolem očí).
-- check_reminded=1 znamená že cron už 24h po události poslal notifikaci.
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

-- Idempotency log pro Telegram notifikace.
-- kind = např. 'misting_rano' / 'misting_vecer' / 'feeding_stale_warn:bily'
-- for_date = Prague YYYY-MM-DD pro denní rytmus
CREATE TABLE notifications_sent (
  id        INTEGER PRIMARY KEY,
  kind      TEXT NOT NULL,
  for_date  TEXT NOT NULL,
  sent_at   TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(kind, for_date)
);
