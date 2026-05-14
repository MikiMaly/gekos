import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import type { CareEvent, Gecko, MistingEvent } from '../lib/types';
import { api } from '../lib/api';
import { CATEGORY_LABELS, PART_OF_DAY_LABELS } from '../lib/format';
import { pragueDateString, pragueMonthRange } from '../lib/time';

const DAY_NAMES = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

function pragueYmd(ts: string): string {
  return pragueDateString(new Date(ts));
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
            <button
              onClick={() => navMonth(-1)}
              className="p-2 rounded hover:bg-muted"
              aria-label="Předchozí měsíc"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h1 className="text-2xl font-semibold tabular-nums">
              {month}/{year}
            </h1>
            <button
              onClick={() => navMonth(1)}
              className="p-2 rounded hover:bg-muted"
              aria-label="Další měsíc"
            >
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
          {grid.map((cell) => {
            if (!cell) return <div key={Math.random()} />;
            const care = careByDay[cell] ?? [];
            const misting = mistingByDay[cell] ?? [];
            const day = Number(cell.slice(-2));
            const isToday = cell === pragueDateString();
            const selected = cell === selectedDay;
            return (
              <button
                key={cell}
                onClick={() => setSelectedDay(cell)}
                className={
                  'aspect-square p-1.5 rounded-md border text-left flex flex-col gap-1 transition-colors ' +
                  (selected
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:bg-muted')
                }
              >
                <span className={'text-sm ' + (isToday ? 'font-bold text-primary' : '')}>
                  {day}
                </span>
                <div className="flex flex-wrap gap-0.5">
                  {care.length > 0 && (
                    <span className="text-[10px] px-1 rounded bg-green-500/20 text-green-700">
                      {care.length}
                    </span>
                  )}
                  {misting.length > 0 && (
                    <span className="text-[10px] px-1 rounded bg-blue-500/20 text-blue-700">
                      💧
                    </span>
                  )}
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
  const dow = (first.getUTCDay() + 6) % 7; // Monday=0
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
    <div className="space-y-3 text-sm">
      {careEvents.map((ev) => (
        <div key={`c-${ev.id}`} className="flex items-center gap-2">
          <span
            className={
              'w-5 h-5 rounded flex items-center justify-center text-xs font-bold ' +
              (ev.given === 1 ? 'bg-green-500/15 text-green-600' : 'bg-red-500/15 text-red-600')
            }
          >
            {ev.given === 1 ? '+' : '−'}
          </span>
          <span className="font-medium">{geckoById[ev.gecko_id]?.name}</span>
          <span className="text-muted-foreground">·</span>
          <span>{CATEGORY_LABELS[ev.category]}</span>
        </div>
      ))}
      {mistingEvents.map((ev) => (
        <div key={`m-${ev.id}`} className="flex items-center gap-2">
          <span className="w-5 h-5 rounded bg-blue-500/15 text-blue-600 flex items-center justify-center text-xs">
            💧
          </span>
          <span className="font-medium">Mlžení</span>
          <span className="text-muted-foreground">·</span>
          <span>
            {PART_OF_DAY_LABELS[ev.part_of_day]} — {ev.done === 1 ? 'ano' : 'ne'}
          </span>
        </div>
      ))}
    </div>
  );
}
