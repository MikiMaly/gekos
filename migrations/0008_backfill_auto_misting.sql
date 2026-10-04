-- 0008_backfill_auto_misting: dosypání historie automatického rosiče.
--
-- Rosič jede od 1. 6. 2026 a do appky se nic nezapisovalo, takže historie za
-- červen–září vypadá prázdná, i když se rosilo 3× denně. Tahle migrace ty
-- cykly doplní zpětně za 2026-06-01 .. 2026-10-04 (včetně). Od 5. 10. 2026 je
-- zapisuje cron worker živě (cron/src/index.ts, AUTO_MISTER_*), takže se
-- rozsah tady už nerozšiřuje.
--
-- Časy jsou wall-time Praha 06:00 / 14:00 / 22:00. Celý backfillovaný rozsah
-- padá do CEST (DST končí až 2026-10-25), takže UTC = Praha − 2 h:
--   06:00 → 04:00Z  → slot 'rano'
--   14:00 → 12:00Z  → slot 'nahodne'   (prostřední cyklus, žádný slot pro něj není)
--   22:00 → 20:00Z  → slot 'vecer'
--
-- OR IGNORE + partial unique index z 0007 dělá migraci idempotentní. Ruční
-- zápisy se nepřepisují — mají source='manual' a vlastní čas, takže zůstanou
-- vedle auto zápisů a na dashboardu i vyhrají (slot se bere podle ts DESC).
WITH RECURSIVE days(d) AS (
  SELECT '2026-06-01'
  UNION ALL
  SELECT date(d, '+1 day') FROM days WHERE d < '2026-10-04'
),
slots(part_of_day, utc_hour) AS (
  VALUES ('rano', '04'), ('nahodne', '12'), ('vecer', '20')
)
INSERT OR IGNORE INTO misting_events (ts, part_of_day, done, source, duration_sec, note)
SELECT d || 'T' || utc_hour || ':00:00.000Z', part_of_day, 1, 'auto', 45, NULL
FROM days, slots;
