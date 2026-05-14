-- 0002_seed: vložení tří gekonů. Idempotentní přes INSERT OR IGNORE na unique slug.

INSERT OR IGNORE INTO geckos (slug, name, color_hex) VALUES
  ('bily',   'Bílý',   '#F5F0E1'),
  ('bezovy', 'Béžový', '#D4B996'),
  ('hnedy',  'Hnědý',  '#6B4423');
