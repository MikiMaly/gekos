import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, ChevronLeft, ChevronRight, Sun, Moon, Bug, Banana, Pill, Droplet } from 'lucide-react';
import type { CareCategory, CareEvent, Gecko, MistingEvent } from '../lib/types';
import { api } from '../lib/api';
import { CATEGORY_LABELS, PART_OF_DAY_LABELS, formatTime } from '../lib/format';
import { pragueLogicalDateString, pragueMonthRange } from '../lib/time';

const DAY_NAMES = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

const CATEGORY_ICONS: Record<CareCategory, typeof Bug> = {
  cvrcci: Bug,
  banan: Banana,
  antib: Pill,
  mast: Droplet,
};

// Stabilní pořadí ikon v cell stripu — kdyby gekon dostal víc kategorií
// najednou, nepřeskakují podle insertion orderu.
const CATEGORY_ORDER: CareCategory[] = ['cvrcci', 'banan', 'antib', 'mast'];

// Grouping podle "logického dne" (04:00 → 04:00) — záznam ve 02:00 patří
// do včerejška, jak to uživatel přirozeně vnímá.
function pragueYmd(ts: string): string {
  return pragueLogicalDateString(new Date(ts));
}

interface DayMisting {
  rano: boolean;
  vecer: boolean;
  nahodne: number;
}

export default function GeckosCalendar() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const [geckos, setGeckos] = useState<Gecko[]>([]);
  const [careEvents, setCareEvents] = useState<CareEvent[]>([]);
  const [mistingEvents, setMistingEvents] = useState<MistingEvent[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { start, end } = pragueMonthRange(year, month);
    const [gList, mList] = await Promise.all([
      api.geckos.list(),
      api.misting.list({ from: start, to: end }),
    ]);
    setGeckos(gList.geckos);
    setMistingEvents(mList.events);

    const careLists = await Promise.all(
      gList.geckos.map((g) =>
        api.geckos.events.list(g.slug as Gecko['slug'], { from: start, to: end })
      )
    );
    setCareEvents(careLists.flatMap((r) => r.events));
  }, [year, month]);

  useEffect(() => {
    document.title = 'Kalendář — Gekoni';
    load();
  }, [load]);

  const grid = useMemo(() => buildMonthGrid(year, month), [year, month]);

  const careByDay = useMemo(() => {
    const map: Record<string, CareEvent[]> = {};
    for (const ev of careEvents) {
      const k = pragueYmd(ev.ts);
      (map[k] ??= []).push(ev);
    }
    return map;
  }, [careEvents]);

  const mistingByDay = useMemo(() => {
    const map: Record<string, MistingEvent[]> = {};
    for (const ev of mistingEvents) {
      const k = pragueYmd(ev.ts);
      (map[k] ??= []).push(ev);
    }
    return map;
  }, [mistingEvents]);

  // Per den: gecko_id → Set kategorií které dnes dostal.
  const perDayPerGecko = useMemo(() => {
    const m: Record<string, Record<number, Set<CareCategory>>> = {};
    for (const ev of careEvents) {
      const k = pragueYmd(ev.ts);
      (m[k] ??= {});
      (m[k][ev.gecko_id] ??= new Set<CareCategory>()).add(ev.category);
    }
    return m;
  }, [careEvents]);

  const perDayMisting = useMemo(() => {
    const m: Record<string, DayMisting> = {};
    for (const ev of mistingEvents) {
      const k = pragueYmd(ev.ts);
      const slot = (m[k] ??= { rano: false, vecer: false, nahodne: 0 });
      if (ev.part_of_day === 'rano') slot.rano = true;
      else if (ev.part_of_day === 'vecer') slot.vecer = true;
      else slot.nahodne += 1;
    }
    return m;
  }, [mistingEvents]);

  const geckoById = useMemo(() => {
    const m: Record<number, Gecko> = {};
    for (const g of geckos) m[g.id] = g;
    return m;
  }, [geckos]);

  const navMonth = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setMonth(m);
    setYear(y);
    setSelectedDay(null);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-5xl mx-auto p-6">
        <header className="flex items-center justify-between mb-6">
          <Link
            to="/private/geckos"
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" /> Zpět
          </Link>
          <div className="flex items-center gap-3">
            <button onClick={() => navMonth(-1)} className="p-2 rounded hover:bg-muted" aria-label="Předchozí měsíc">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h1 className="text-2xl font-semibold tabular-nums">{month}/{year}</h1>
            <button onClick={() => navMonth(1)} className="p-2 rounded hover:bg-muted" aria-label="Další měsíc">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="w-12" />
        </header>

        <div className="grid grid-cols-7 gap-1 text-xs text-muted-foreground mb-1">
          {DAY_NAMES.map((d) => (
            <div key={d} className="text-center py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {grid.map((cell, i) => {
            if (!cell) return <div key={`e-${i}`} />;
            const day = Number(cell.slice(-2));
            const isToday = cell === pragueLogicalDateString();
            const selected = cell === selectedDay;
            const misting = perDayMisting[cell] ?? { rano: false, vecer: false, nahodne: 0 };
            const perGecko = perDayPerGecko[cell] ?? {};

            return (
              <button
                key={cell}
                onClick={() => setSelectedDay(cell)}
                className={
                  'aspect-square p-1.5 rounded-md border text-left flex flex-col transition-colors ' +
                  (selected
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:bg-muted')
                }
              >
                <div className="flex items-start justify-between gap-1">
                  {misting.rano ? (
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                  ) : (
                    <span className="w-3.5 h-3.5" />
                  )}
                  <span className={'text-sm leading-none tabular-nums ' + (isToday ? 'font-bold text-primary' : '')}>
                    {day}
                  </span>
                </div>

                <div className="flex-1 flex flex-col gap-0.5 justify-center items-start mt-0.5 overflow-hidden">
                  {geckos.map((g) => {
                    const cats = perGecko[g.id];
                    if (!cats || cats.size === 0) return null;
                    return (
                      <div key={g.id} className="flex items-center gap-0.5">
                        <span
                          className="w-2 h-2 rounded-full border border-border/40 shrink-0"
                          style={{ background: g.color_hex ?? '#ccc' }}
                          aria-hidden
                        />
                        {CATEGORY_ORDER.filter((c) => cats.has(c)).map((c) => {
                          const Icon = CATEGORY_ICONS[c];
                          return <Icon key={c} className="w-2.5 h-2.5 text-muted-foreground shrink-0" />;
                        })}
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-end justify-end gap-1">
                  {misting.nahodne > 0 && (
                    <span className="text-[10px] text-blue-600 leading-none">+{misting.nahodne}💧</span>
                  )}
                  {misting.vecer && <Moon className="w-3.5 h-3.5 text-indigo-500" />}
                </div>
              </button>
            );
          })}
        </div>

        {selectedDay && (
          <section className="mt-6 rounded-xl border border-border p-4">
            <h2 className="text-lg font-semibold mb-3">{selectedDay}</h2>
            <DayDetail
              careEvents={careByDay[selectedDay] ?? []}
              mistingEvents={mistingByDay[selectedDay] ?? []}
              geckoById={geckoById}
            />
          </section>
        )}
      </div>
    </div>
  );
}

function buildMonthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const dow = (first.getUTCDay() + 6) % 7;
  const cells: (string | null)[] = [];
  for (let i = 0; i < dow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function DayDetail({
  careEvents,
  mistingEvents,
  geckoById,
}: {
  careEvents: CareEvent[];
  mistingEvents: MistingEvent[];
  geckoById: Record<number, Gecko>;
}) {
  if (careEvents.length === 0 && mistingEvents.length === 0) {
    return <p className="text-muted-foreground text-sm">Žádné události.</p>;
  }
  return (
    <div className="space-y-2 text-sm">
      {careEvents.map((ev) => {
        const gecko = geckoById[ev.gecko_id];
        return (
          <div key={`c-${ev.id}`} className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full border border-border/40 shrink-0"
              style={{ background: gecko?.color_hex ?? '#ccc' }}
              aria-hidden
            />
            <span className="font-medium">{gecko?.name}</span>
            <span className="text-muted-foreground">·</span>
            <span>{CATEGORY_LABELS[ev.category]}</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-secondary tabular-nums">×{ev.count}</span>
            {ev.note && <span className="text-muted-foreground truncate">— {ev.note}</span>}
            <span className="text-muted-foreground ml-auto tabular-nums">{formatTime(ev.ts)}</span>
          </div>
        );
      })}
      {mistingEvents.map((ev) => (
        <div key={`m-${ev.id}`} className="flex items-center gap-2">
          <span className="w-5 h-5 rounded bg-blue-500/15 text-blue-600 flex items-center justify-center text-xs">💧</span>
          <span className="font-medium">Mlžení</span>
          <span className="text-muted-foreground">·</span>
          <span>{PART_OF_DAY_LABELS[ev.part_of_day]}</span>
          <span className="text-muted-foreground ml-auto tabular-nums">{formatTime(ev.ts)}</span>
        </div>
      ))}
    </div>
  );
}
