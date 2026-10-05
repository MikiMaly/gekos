import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bot, Cloud, Droplet, Hand, Trash2, X } from 'lucide-react';
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
import GeckoShell from '../components/GeckoShell';

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
    document.title = 'Mlžení · Gekoni';
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
    <GeckoShell
      back="/private/geckos"
      icon={<Cloud className="w-6 h-6 text-aqua" />}
      eyebrow="Terárium"
      title="Historie mlžení"
      aside={
        <div className="hub-segment">
          {FILTERS.map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)} aria-pressed={filter === f.key}>
              {f.label}
            </button>
          ))}
        </div>
      }
    >
      <p className="flex items-start gap-2 text-sm text-muted-foreground mb-6 max-w-3xl">
        <Bot className="w-4 h-4 mt-0.5 shrink-0 text-aqua" />
        <span>
          Od {new Date(AUTO_MISTER.since).toLocaleDateString('cs-CZ')} rosí automatický rosič
          každých {AUTO_MISTER.intervalHours} h po {AUTO_MISTER.durationSec} s (
          {AUTO_MISTER.cycleHoursPrague.map((h) => `${h}:00`).join(' · ')}). Jeho zápisy jsou
          podle časovače, ne měření — když rosič vypadne, historie to nepozná.
        </span>
      </p>

      {error && (
        <p className="mb-4 px-4 py-3 rounded-xl bg-raspberry/10 border border-raspberry/25 text-raspberry text-sm">
          Chyba: {error}
        </p>
      )}

      {events.length === 0 ? (
        <p className="text-muted-foreground">Zatím žádné záznamy.</p>
      ) : (
        <div className="grid gap-x-6 gap-y-8 md:grid-cols-2 xl:grid-cols-3 items-start">
          {groups.map(([day, evs]) => (
            <section key={day}>
              <h2 className="flex items-baseline justify-between gap-2 mb-2 pb-1.5 border-b border-border">
                <span className="hub-label text-mint">{formatDateWithWeekday(day)}</span>
                <span className="text-xs text-muted-foreground">{daySummary(evs)}</span>
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
                        'flex items-center justify-between py-2 px-3 rounded-xl border ' +
                        (byMister ? 'border-border bg-secondary/40' : 'border-aqua/25 bg-card')
                      }
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={
                            'w-7 h-7 rounded-lg grid place-items-center shrink-0 ' +
                            (done ? 'bg-aqua/12 text-aqua' : 'bg-raspberry/12 text-raspberry')
                          }
                        >
                          {done ? (
                            <Droplet className="w-3.5 h-3.5" fill="currentColor" strokeWidth={0} />
                          ) : (
                            <X className="w-3.5 h-3.5" />
                          )}
                        </span>
                        <span className="font-medium">{PART_OF_DAY_LABELS[ev.part_of_day]}</span>
                        <span
                          className={'hub-pill shrink-0 ' + (byMister ? 'hub-pill-neutral' : 'hub-pill-info')}
                          title={byMister ? 'zapsal automatický rosič' : 'zapsáno ručně'}
                        >
                          {byMister ? <Bot className="w-3 h-3" /> : <Hand className="w-3 h-3" />}
                          {byMister ? 'rosič' : 'ručně'}
                          {duration && <span className="tabular-nums">· {duration}</span>}
                        </span>
                        {!byMister && (
                          <span className={'hub-pill ' + (done ? 'hub-pill-ok' : 'hub-pill-danger')}>
                            {done ? 'rošeno' : 'nerošeno'}
                          </span>
                        )}
                        {ev.note && (
                          <span className="text-sm text-muted-foreground truncate">— {ev.note}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm text-muted-foreground tabular-nums">{formatTime(ev.ts)}</span>
                        <button
                          onClick={() => remove(ev.id)}
                          disabled={deleting === ev.id}
                          className="hub-btn hub-btn-quiet hub-btn-icon !min-h-8 !w-8 hover:!text-raspberry"
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
    </GeckoShell>
  );
}
