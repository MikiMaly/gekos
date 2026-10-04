-- 0008_backfill_auto_misting: dosypání historie automatického rosiče.
--
-- Rosič jede od 1. 6. 2026 (06:00 / 14:00 / 22:00 Praha, 45 s na cyklus), ale
-- appka o něm nevěděla. Historie ale prázdná NENÍ — slot ráno/večer jsem
-- přes léto naklikával ručně, takže v okně 1. 6. – 4. 10. má záznam 86 dní
-- u rána a 85 u večera ze 126. Ty kliky znamenaly "rosič jel", tedy tu samou
-- událost — proto se nedoplňují, doplňují se jen chybějící dny.
--
--   rano  → 06:00 Praha = 04:00Z   jen když ten logický den záznam nemá
--   vecer → 22:00 Praha = 20:00Z   jen když ten logický den záznam nemá
--   nahodne → 14:00 Praha = 12:00Z vždy (prostřední cyklus nemá vlastní slot
--             a ruční náhodné kapky padaly na jiné hodiny, takže nekoliduje)
--
-- Celý rozsah padá do CEST (DST končí až 2026-10-25), takže UTC = Praha − 2 h
-- a logický den (04:00–04:00 Praha) je okno [d 02:00Z, d+1 02:00Z).
--
-- Od 5. 10. 2026 zapisuje cykly cron worker živě (cron/src/index.ts,
-- AUTO_MISTER_*), takže se rozsah tady už nerozšiřuje. OR IGNORE + partial
-- unique index z 0007 dělá migraci idempotentní.

-- Ráno a večer: jen dny, kde pro ten slot ještě nic není.
WITH RECURSIVE days(d) AS (
  SELECT '2026-06-01'
  UNION ALL
  SELECT date(d, '+1 day') FROM days WHERE d < '2026-10-04'
),
slots(part_of_day, utc_hour) AS (
  VALUES ('rano', '04'), ('vecer', '20')
)
INSERT OR IGNORE INTO misting_events (ts, part_of_day, done, source, duration_sec, note)
SELECT d || 'T' || utc_hour || ':00:00.000Z', part_of_day, 1, 'auto', 45, NULL
FROM days, slots
WHERE NOT EXISTS (
  SELECT 1 FROM misting_events m
  WHERE m.part_of_day = slots.part_of_day
    AND m.ts >= d || 'T02:00:00.000Z'
    AND m.ts <  date(d, '+1 day') || 'T02:00:00.000Z'
);

-- Prostřední cyklus: vždy, žádný ruční protějšek neexistuje.
WITH RECURSIVE days(d) AS (
  SELECT '2026-06-01'
  UNION ALL
  SELECT date(d, '+1 day') FROM days WHERE d < '2026-10-04'
)
INSERT OR IGNORE INTO misting_events (ts, part_of_day, done, source, duration_sec, note)
SELECT d || 'T12:00:00.000Z', 'nahodne', 1, 'auto', 45, NULL
FROM days;
