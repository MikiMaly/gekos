-- 0005_day_notes: poznámky k logickému dni, volitelně provázané s gekonem.
-- gecko_id NULL = obecná poznámka ke dni (vidí se na dashboardu + kalendáři).
-- gecko_id NOT NULL = poznámka týkající se gekona (vidí se navíc na jeho profilu).
CREATE TABLE day_notes (
  id           INTEGER PRIMARY KEY,
  date_prague  TEXT    NOT NULL,                       -- YYYY-MM-DD (logický den, 04:00-04:00)
  gecko_id     INTEGER REFERENCES geckos(id),          -- nullable
  text         TEXT    NOT NULL,
  created_at   TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_day_notes_date  ON day_notes(date_prague DESC);
CREATE INDEX idx_day_notes_gecko ON day_notes(gecko_id, date_prague DESC);
