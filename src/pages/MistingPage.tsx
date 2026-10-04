import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, Bot, Cloud, Hand, Trash2 } from 'lucide-react';
import type { MistingEvent, MistingSource } from '../lib/types';
import { AUTO_MISTER } from '../lib/types';
import { api } from '../lib/api';
import {
  formatDateWithWeekday,
  formatDuration,
  formatTime,
  PART_OF_DAY_LABELS,
} from '../lib/format';
import { pragueLogicalDateString } from '../lib/time';

type Filter = 'vse' | 'manual' | 'auto';

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: 'vse', label: 'Vše' },
  { key: 'manual', label: 'Ručně' },
  { key: 'auto', label: 'Rosič' },
];

// Shrnutí dne do hlavičky skupiny: "3× rosič · 1× ručně".
function daySummary(evs: MistingEvent[]): string {
  const auto = evs.filter((e) => e.source === 'auto').length;
  const manual = evs.length - auto;
  const parts: string[] = [];
  if (auto) parts.push(`${auto}× rosič`);
  if (manual) parts.push(`${manual}× ručně`);
  return parts.join(' · ');
}

export default function MistingHistory() {
  const [events, setEvents] = useState<MistingEvent[]>([]);
  const [filter, setFilter] = useState<Filter>('vse');
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      // Filtruju na serveru, ne v prohlížeči — rosič generuje 3 zápisy denně,
      // takže by ruční zápisy jinak vypadly z LIMIT 1000.
      const source: MistingSource | undefined = filter === 'vse' ? undefined : filter;
      const r = await api.misting.list(source ? { source } : undefined);
      setEvents(r.events);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [filter]);

  useEffect(() => {
    document.title = 'Mlžení — Gekoni';
    load();
  }, [load]);

  const remove = async (id: number) => {
    setDeleting(id);
    try {
      await api.misting.remove(id);
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setDeleting(null);
    }
  };

  // Group by logický den (04:00-04:00), preserve DESC order
  const groups = useMemo(() => {
    const map = new Map<string, MistingEvent[]>();
    for (const ev of events) {
      const k = pragueLogicalDateString(new Date(ev.ts));
      const list = map.get(k);
      if (list) list.push(ev);
      else map.set(k, [ev]);
    }
    return Array.from(map.entries());
  }, [events]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto p-6">
        <Link
          to="/private/geckos"
          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Zpět
        </Link>
        <header className="flex items-center gap-2 mb-2">
          <Cloud className="w-6 h-6 text-blue-500" />
          <h1 className="text-3xl font-semibold">Historie mlžení</h1>
        </header>

        <p className="flex items-start gap-1.5 text-sm text-muted-foreground mb-5">
          <Bot className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            Od {new Date(AUTO_MISTER.since).toLocaleDateString('cs-CZ')} rosí automatický rosič
            každých {AUTO_MISTER.intervalHours} h po {AUTO_MISTER.durationSec} s (
            {AUTO_MISTER.cycleHoursPrague.map((h) => `${h}:00`).join(' · ')}). Jeho zápisy jsou
            podle časovače, ne měření — když rosič vypadne, historie to nepozná.
          </span>
        </p>

        <div className="flex items-center gap-2 mb-6">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={
                'px-3 py-1.5 rounded-full text-sm border transition-colors ' +
                (filter === f.key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:text-foreground')
              }
            >
              {f.label}
            </button>
          ))}
        </div>

        {error && <p className="text-destructive mb-4">Chyba: {error}</p>}

        {events.length === 0 ? (
          <p className="text-muted-foreground">Zatím žádné záznamy.</p>
        ) : (
          <div className="space-y-6">
            {groups.map(([day, evs]) => (
              <section key={day}>
                <h2 className="flex items-baseline justify-between gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2 pb-1 border-b border-border">
                  <span>{formatDateWithWeekday(day)}</span>
                  <span className="font-normal normal-case tracking-normal">{daySummary(evs)}</span>
                </h2>
                <ul className="space-y-2">
                  {evs.map((ev) => {
                    const done = ev.done === 1;
                    const byMister = ev.source === 'auto';
                    const duration = formatDuration(ev.duration_sec);
                    return (
                      <li
                        key={ev.id}
                        className={
                          'flex items-center justify-between py-2 px-3 rounded-md border ' +
                          (byMister ? 'border-border/50 bg-muted/30' : 'border-border')
                        }
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={
                              'w-6 h-6 rounded flex items-center justify-center text-sm shrink-0 ' +
                              (done ? 'bg-blue-500/15 text-blue-600' : 'bg-red-500/15 text-red-600')
                            }
                          >
                            {done ? '💧' : '✗'}
                          </span>
                          <span className="font-medium">{PART_OF_DAY_LABELS[ev.part_of_day]}</span>
                          <span
                            className={
                              'inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded shrink-0 ' +
                              (byMister
                                ? 'bg-secondary text-muted-foreground'
                                : 'bg-amber-500/15 text-amber-600')
                            }
                            title={byMister ? 'zapsal automatický rosič' : 'zapsáno ručně'}
                          >
                            {byMister ? <Bot className="w-3 h-3" /> : <Hand className="w-3 h-3" />}
                            {byMister ? 'rosič' : 'ručně'}
                            {duration && <span className="tabular-nums">· {duration}</span>}
                          </span>
                          {!byMister && (
                            <span
                              className={
                                'text-xs px-1.5 py-0.5 rounded ' +
                                (done
                                  ? 'bg-green-500/15 text-green-600'
                                  : 'bg-red-500/15 text-red-600')
                              }
                            >
                              {done ? 'rošeno' : 'nerošeno'}
                            </span>
                          )}
                          {ev.note && (
                            <span className="text-sm text-muted-foreground truncate">
                              — {ev.note}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-sm text-muted-foreground tabular-nums">
                            {formatTime(ev.ts)}
                          </span>
                          <button
                            onClick={() => remove(ev.id)}
                            disabled={deleting === ev.id}
                            className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-50"
                            aria-label="Smazat záznam"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
