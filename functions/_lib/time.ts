const TZ = 'Europe/Prague';

interface PragueParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function pragueParts(d: Date): PragueParts {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const p = fmt.formatToParts(d);
  const v = (t: Intl.DateTimeFormatPartTypes) => p.find((x) => x.type === t)!.value;
  const h = v('hour');
  return {
    year: Number(v('year')),
    month: Number(v('month')),
    day: Number(v('day')),
    hour: h === '24' ? 0 : Number(h),
    minute: Number(v('minute')),
    second: Number(v('second')),
  };
}

export function pragueDateString(d: Date = new Date()): string {
  const p = pragueParts(d);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

export function pragueMidnightUtc(pragueYmd: string): Date {
  const [y, m, d] = pragueYmd.split('-').map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
  const parts = pragueParts(guess);
  const guessAsPragueMs = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  const offsetMs = guess.getTime() - guessAsPragueMs;
  return new Date(guess.getTime() + offsetMs);
}

export function pragueDayRange(pragueYmd: string): { start: string; end: string } {
  const start = pragueMidnightUtc(pragueYmd);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function pragueTodayRange(): { start: string; end: string } {
  return pragueDayRange(pragueDateString());
}

// Vrátí UTC instant odpovídající "wall time" hodině v Praze daného dne.
// pragueWallTimeToUtc('2026-05-15', 9) == ten okamžik, kdy hodiny v Praze
// ukazují 09:00 dne 2026-05-15. Funguje přes DST přechody.
export function pragueWallTimeToUtc(pragueYmd: string, hour: number, minute = 0): Date {
  const [y, m, d] = pragueYmd.split('-').map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d, hour, minute, 0));
  const parts = pragueParts(guess);
  const guessAsPragueMs = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
  const desiredAsPragueMs = Date.UTC(y, m - 1, d, hour, minute, 0);
  const offsetMs = desiredAsPragueMs - guessAsPragueMs;
  return new Date(guess.getTime() + offsetMs);
}

// "Logický den" — uživatelská konvence: vše co dělám než jdu spát počítám
// jako ten den. Logický den začíná v 04:00 Praha a končí ve 04:00 dalšího
// kalendářního dne. Klik v 02:30 v noci tedy spadá do včerejšího logického dne.
// Aplikuje se na: dashboard "dnes", kalendář grouping, mlžení slot časy,
// cron mlžení reminder. Pro náhodné mlžení a staleness krmení se nepoužívá.
const LOGICAL_DAY_CUTOFF_HOUR = 4;

export function pragueLogicalDateString(d: Date = new Date()): string {
  const p = pragueParts(d);
  let year = p.year;
  let month = p.month;
  let day = p.day;
  if (p.hour < LOGICAL_DAY_CUTOFF_HOUR) {
    const prev = new Date(Date.UTC(year, month - 1, day));
    prev.setUTCDate(prev.getUTCDate() - 1);
    year = prev.getUTCFullYear();
    month = prev.getUTCMonth() + 1;
    day = prev.getUTCDate();
  }
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function pragueLogicalDayRange(logicalYmd: string): { start: string; end: string } {
  const start = pragueWallTimeToUtc(logicalYmd, LOGICAL_DAY_CUTOFF_HOUR);
  const [y, m, d] = logicalYmd.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d));
  next.setUTCDate(next.getUTCDate() + 1);
  const nextYmd = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`;
  const end = pragueWallTimeToUtc(nextYmd, LOGICAL_DAY_CUTOFF_HOUR);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function pragueLogicalTodayRange(): { start: string; end: string } {
  return pragueLogicalDayRange(pragueLogicalDateString());
}

export function pragueMonthRange(year: number, monthOneBased: number): { start: string; end: string } {
  const startYmd = `${year}-${String(monthOneBased).padStart(2, '0')}-01`;
  const start = pragueMidnightUtc(startYmd);
  const nextMonth = monthOneBased === 12 ? 1 : monthOneBased + 1;
  const nextYear = monthOneBased === 12 ? year + 1 : year;
  const endYmd = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
  const end = pragueMidnightUtc(endYmd);
  return { start: start.toISOString(), end: end.toISOString() };
}
