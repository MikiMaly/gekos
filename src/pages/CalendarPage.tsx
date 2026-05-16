import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import type { CareCategory, CareEvent, Gecko, MistingEvent } from '../lib/types';
import { api } from '../lib/api';
import { CATEGORY_LABELS, PART_OF_DAY_LABELS, formatTime } from '../lib/format';
import { pragueLogicalDateString, pragueMonthRange } from '../lib/time';

const DAY_NAMES = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

const CATEGORY_EMOJI: Record<CareCategory, string> = {
  cvrcci: '🦗',
  banan: '🍌',
  antib: '💊',
  mast: '🧴',
};

const CATEGORY_ORDER: CareCategory[] = ['cvrcci', 'banan', 'antib', 'mast'];

type Band = 'top' | 'mid' | 'bot';

// Rozdělení dne na 3 pásy. Logický den začíná v 04:00, takže "ráno" pásmo
// pokrývá 04-12 (kde rano misting v 09:00 padne do top), midday 12-20 (kam
// dáme náhodné odpolední), večer 20-04 (kam padne vecer 22:00 i náhodné
// pozdě v noci, které logicky stále patří k tomuhle dni).
function hourBand(ts: string): Band {
  const d = new Date(ts);
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Prague',
    hour: '2-digit',
    hour12: false,
  });
  const h = Number(fmt.formatToParts(d).find((p) => p.type === 'hour')!.value);
  const logicalH = (h - 4 + 24) % 24;
  if (logicalH < 8) return 'top';
  if (logicalH < 16) return 'mid';
  return 'bot';
}

function pragueYmd(ts: string): string {
  return pragueLogicalDateString(new Date(ts));
}

interface CellData {
  ranoDone: boolean;
  vecerDone: boolean;
  nahodneByBand: Record<Band, number>;
  // band → gecko_id → set of categories that gecko got in this band
  foodByBand: Record<Band, Record<number, Set<CareCategory>>>;
}

function emptyCell(): CellData {
  return {
    ranoDone: false,
    vecerDone: false,
    nahodneByBand: { top: 0, mid: 0, bot: 0 },
    foodByBand: { top: {}, mid: {}, bot: {} },
  };
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

  // Per den: spočítej rano/vecer/nahodne sloty + food per band per gecko.
  const cellsData = useMemo(() => {
    const m: Record<string, CellData> = {};
    for (const ev of mistingEvents) {
      const k = pragueYmd(ev.ts);
      const c = (m[k] ??= emptyCell());
      if (ev.part_of_day === 'rano') c.ranoDone = true;
      else if (ev.part_of_day === 'vecer') c.vecerDone = true;
      else c.nahodneByBand[hourBand(ev.ts)] += 1;
    }
    for (const ev of careEvents) {
      const k = pragueYmd(ev.ts);
      const c = (m[k] ??= emptyCell());
      const band = hourBand(ev.ts);
      ((c.foodByBand[band][ev.gecko_id] ??= new Set<CareCategory>())).add(ev.category);
    }
    return m;
  }, [careEvents, mistingEvents]);

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
            const data = cellsData[cell] ?? emptyCell();

            return (
              <button
                key={cell}
                onClick={() => setSelectedDay(cell)}
                className={
                  'aspect-square p-1 relative rounded-md border text-left flex flex-col text-xs overflow-hidden transition-colors ' +
                  (selected
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:bg-muted')
                }
              >
                {/* Den vpravo nahoře */}
                <span
                  className={
                    'absolute top-1 right-1.5 text-sm leading-none tabular-nums ' +
                    (isToday ? 'font-bold text-primary' : '')
                  }
                >
                  {day}
                </span>

                {/* Ráno mlžení vlevo nahoře (fixní slot 09:00) */}
                {data.ranoDone && (
                  <span
                    className="absolute top-0.5 left-1 text-blue-500 leading-none"
                    title="Ráno mlženo"
                  >
                    💧
                  </span>
                )}

                {/* Večer mlžení vpravo dole (fixní slot 22:00) */}
                {data.vecerDone && (
                  <span
                    className="absolute bottom-0.5 right-1 text-blue-500 leading-none"
                    title="Večer mlženo"
                  >
                    💧
                  </span>
                )}

                {/* Tři pásy pro náhodné mlžení a krmení podle hodiny */}
                <div className="flex-1 flex flex-col pt-4 pb-4">
                  {(['top', 'mid', 'bot'] as Band[]).map((band, idx) => (
                    <BandRow
                      key={band}
                      align={idx === 0 ? 'start' : idx === 2 ? 'end' : 'center'}
                      nahodne={data.nahodneByBand[band]}
                      foodByGecko={data.foodByBand[band]}
                      geckos={geckos}
                    />
                  ))}
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

function BandRow({
  align,
  nahodne,
  foodByGecko,
  geckos,
}: {
  align: 'start' | 'center' | 'end';
  nahodne: number;
  foodByGecko: Record<number, Set<CareCategory>>;
  geckos: Gecko[];
}) {
  const hasContent = nahodne > 0 || geckos.some((g) => foodByGecko[g.id]?.size);
  const justify =
    align === 'start' ? 'justify-start' : align === 'end' ? 'justify-end' : 'justify-center';
  return (
    <div
      className={
        'flex-1 flex flex-wrap gap-x-1 gap-y-0 items-center content-center text-[11px] leading-none ' +
        justify
      }
    >
      {!hasContent && null}
      {nahodne > 0 && (
        <span className="text-blue-500" title={`Náhodné mlžení (${nahodne}×)`}>
          💧{nahodne > 1 ? `×${nahodne}` : ''}
        </span>
      )}
      {geckos.map((g) => {
        const cats = foodByGecko[g.id];
        if (!cats || cats.size === 0) return null;
        return (
          <span key={g.id} className="inline-flex items-center gap-0.5">
            <span
              className="w-2 h-2 rounded-full border border-border/40 shrink-0"
              style={{ background: g.color_hex ?? '#ccc' }}
              aria-hidden
            />
            {CATEGORY_ORDER.filter((c) => cats.has(c)).map((c) => (
              <span key={c}>{CATEGORY_EMOJI[c]}</span>
            ))}
          </span>
        );
      })}
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
            <span>
              {CATEGORY_EMOJI[ev.category]} {CATEGORY_LABELS[ev.category]}
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-secondary tabular-nums">×{ev.count}</span>
            {ev.note && <span className="text-muted-foreground truncate">— {ev.note}</span>}
            <span className="text-muted-foreground ml-auto tabular-nums">{formatTime(ev.ts)}</span>
          </div>
        );
      })}
      {mistingEvents.map((ev) => (
        <div key={`m-${ev.id}`} className="flex items-center gap-2">
          <span className="w-5 h-5 flex items-center justify-center text-blue-500">💧</span>
          <span className="font-medium">Mlžení</span>
          <span className="text-muted-foreground">·</span>
          <span>{PART_OF_DAY_LABELS[ev.part_of_day]}</span>
          <span className="text-muted-foreground ml-auto tabular-nums">{formatTime(ev.ts)}</span>
        </div>
      ))}
    </div>
  );
}
