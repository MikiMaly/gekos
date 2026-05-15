import { useState } from 'react';
import { Bug, Banana, Pill, Droplet, Plus, ChevronDown, ChevronUp, Undo2, Sparkles, AlertTriangle, Stethoscope } from 'lucide-react';
import { Link } from 'react-router';
import type { CareCategory, CareEvent, Gecko, GeckoSlug, SheddingEvent } from '../lib/types';
import { CATEGORY_LABELS, formatTime, relativeFromNow } from '../lib/format';
import { api } from '../lib/api';

const CATEGORY_ICONS: Record<CareCategory, typeof Bug> = {
  cvrcci: Bug,
  banan: Banana,
  antib: Pill,
  mast: Droplet,
};

const DEFAULT_CATEGORIES: CareCategory[] = ['cvrcci', 'banan'];
const RESCUE_CATEGORIES: CareCategory[] = ['cvrcci', 'banan', 'antib', 'mast'];

interface Props {
  gecko: Gecko;
  todayEvents: CareEvent[];
  lastPerCategory: Record<CareCategory, CareEvent | null>;
  lastShedding: SheddingEvent | null;
  onChange: () => void;
}

interface TodaySummary {
  count_events: number;   // # of events today
  total: number;          // sum of count today
  latest_ts: string | null;
}

function summarize(events: CareEvent[], category: CareCategory): TodaySummary {
  const filtered = events.filter((e) => e.category === category);
  return {
    count_events: filtered.length,
    total: filtered.reduce((s, e) => s + e.count, 0),
    latest_ts: filtered[0]?.ts ?? null,
  };
}

export default function GeckoCard({ gecko, todayEvents, lastPerCategory, lastShedding, onChange }: Props) {
  const [pending, setPending] = useState<CareCategory | null>(null);
  const [expanded, setExpanded] = useState<CareCategory | null>(null);
  const [lastCreated, setLastCreated] = useState<CareEvent | null>(null);
  const [count, setCount] = useState<string>('1');
  const [note, setNote] = useState<string>('');

  const rescueOn = gecko.rescue_mode === 1;
  const categories = rescueOn ? RESCUE_CATEGORIES : DEFAULT_CATEGORIES;

  const submit = async (category: CareCategory, body?: { count?: number; note?: string }) => {
    setPending(category);
    try {
      const res = await api.geckos.events.create(gecko.slug as GeckoSlug, {
        category,
        ...body,
      });
      setLastCreated(res.event);
      setExpanded(null);
      setCount('1');
      setNote('');
      onChange();
      // Auto-clear undo affordance after 8s.
      setTimeout(() => {
        setLastCreated((prev) => (prev && prev.id === res.event.id ? null : prev));
      }, 8000);
    } finally {
      setPending(null);
    }
  };

  const undoLast = async () => {
    if (!lastCreated) return;
    await api.geckos.events.remove(gecko.slug as GeckoSlug, lastCreated.id);
    setLastCreated(null);
    onChange();
  };

  const logShedding = async () => {
    await api.geckos.shedding.create(gecko.slug as GeckoSlug);
    onChange();
  };

  const sheddingNeedsCheck =
    lastShedding && !lastShedding.checked &&
    Date.now() - new Date(lastShedding.ts).getTime() >= 24 * 60 * 60 * 1000;

  return (
    <div className="rounded-2xl border border-border bg-card p-6 flex flex-col gap-3 relative">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="w-10 h-10 rounded-full border-2 border-border shrink-0"
            style={{ background: gecko.color_hex ?? '#ccc' }}
            aria-hidden
          />
          <h3 className="text-xl font-semibold truncate">{gecko.name}</h3>
          {rescueOn && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/15 text-red-600 text-xs shrink-0"
              title="Rescue mód aktivní — zobrazuje se antib a mast"
            >
              <Stethoscope className="w-3 h-3" /> rescue
            </span>
          )}
        </div>
        <Link
          to={`/private/geckos/${gecko.slug}`}
          className="text-sm text-muted-foreground hover:text-foreground shrink-0"
        >
          Profil →
        </Link>
      </header>

      <ul className="flex flex-col gap-1">
        {categories.map((cat) => {
          const Icon = CATEGORY_ICONS[cat];
          const today = summarize(todayEvents, cat);
          const last = lastPerCategory[cat];
          const isOpen = expanded === cat;

          return (
            <li key={cat} className="border-b border-border/40 last:border-0">
              <div className="flex items-center justify-between gap-2 py-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="font-medium">{CATEGORY_LABELS[cat]}</span>
                  {today.count_events > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/15 text-green-600 tabular-nums">
                      {today.count_events}× dnes
                      {today.total !== today.count_events && ` (${today.total} ks)`}
                      {today.latest_ts && ` · ${formatTime(today.latest_ts)}`}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-xs text-muted-foreground hidden md:inline">
                    {last ? relativeFromNow(last.ts) : 'nikdy'}
                  </span>
                  <button
                    onClick={() => submit(cat)}
                    disabled={pending === cat}
                    className="w-9 h-9 rounded-md bg-primary/10 hover:bg-primary/20 text-primary disabled:opacity-50 flex items-center justify-center"
                    aria-label={`Zapsat ${CATEGORY_LABELS[cat]}`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setExpanded(isOpen ? null : cat)}
                    className="w-7 h-9 rounded-md text-muted-foreground hover:text-foreground flex items-center justify-center"
                    aria-label="Detail"
                  >
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {isOpen && (
                <div className="pb-3 pl-6 flex flex-wrap items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={count}
                    onChange={(e) => setCount(e.target.value)}
                    className="w-16 px-2 py-1.5 rounded border border-border bg-background text-sm"
                  />
                  <span className="text-sm text-muted-foreground">ks</span>
                  <input
                    type="text"
                    placeholder="Poznámka (volitelné)"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="flex-1 min-w-[150px] px-2 py-1.5 rounded border border-border bg-background text-sm"
                  />
                  <button
                    onClick={() => submit(cat, { count: Math.max(1, Number(count) || 1), note: note || undefined })}
                    disabled={pending === cat}
                    className="px-3 py-1.5 rounded bg-primary text-primary-foreground text-sm disabled:opacity-50"
                  >
                    Uložit
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground">
            Svlékání:{' '}
            {lastShedding ? relativeFromNow(lastShedding.ts) : 'zatím nezaznamenáno'}
          </span>
          {sheddingNeedsCheck && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600">
              <AlertTriangle className="w-3 h-3" /> kontrola
            </span>
          )}
        </div>
        <button
          onClick={logShedding}
          className="px-2 py-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          + svlékání
        </button>
      </div>

      {lastCreated && (
        <div className="absolute bottom-3 right-3 left-3 flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-foreground/90 text-background text-xs shadow-lg">
          <span>Zapsáno: {CATEGORY_LABELS[lastCreated.category]} ×{lastCreated.count}</span>
          <button onClick={undoLast} className="inline-flex items-center gap-1 underline">
            <Undo2 className="w-3 h-3" /> Vrátit
          </button>
        </div>
      )}
    </div>
  );
}
