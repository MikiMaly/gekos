import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, Cloud, Trash2 } from 'lucide-react';
import type { MistingEvent } from '../lib/types';
import { api } from '../lib/api';
import { formatDateWithWeekday, formatTime, PART_OF_DAY_LABELS } from '../lib/format';
import { pragueLogicalDateString } from '../lib/time';

export default function MistingHistory() {
  const [events, setEvents] = useState<MistingEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api.misting.list();
      setEvents(r.events);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

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
        <header className="flex items-center gap-2 mb-6">
          <Cloud className="w-6 h-6 text-blue-500" />
          <h1 className="text-3xl font-semibold">Historie mlžení</h1>
        </header>

        {error && <p className="text-destructive mb-4">Chyba: {error}</p>}

        {events.length === 0 ? (
          <p className="text-muted-foreground">Zatím žádné záznamy.</p>
        ) : (
          <div className="space-y-6">
            {groups.map(([day, evs]) => (
              <section key={day}>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2 pb-1 border-b border-border">
                  {formatDateWithWeekday(day)}
                </h2>
                <ul className="space-y-2">
                  {evs.map((ev) => {
                    const done = ev.done === 1;
                    return (
                      <li
                        key={ev.id}
                        className="flex items-center justify-between py-2 px-3 rounded-md border border-border"
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
                              'text-xs px-1.5 py-0.5 rounded ' +
                              (done
                                ? 'bg-green-500/15 text-green-600'
                                : 'bg-red-500/15 text-red-600')
                            }
                          >
                            {done ? 'rošeno' : 'nerošeno'}
                          </span>
                          {ev.note && <span className="text-sm text-muted-foreground truncate">— {ev.note}</span>}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-sm text-muted-foreground tabular-nums">{formatTime(ev.ts)}</span>
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
