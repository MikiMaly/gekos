-- 0002_seed: tři gekoni rozlišení barvou. Idempotentní přes INSERT OR IGNORE.

INSERT OR IGNORE INTO geckos (slug, name, color_hex) VALUES
  ('bily',   'Bílý',   '#F5F0E1'),
  ('bezovy', 'Béžový', '#CFA876'),
  ('hnedy',  'Hnědý',  '#8C6239');
