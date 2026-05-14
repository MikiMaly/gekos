import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, Cloud } from 'lucide-react';
import type { MistingEvent } from '../lib/types';
import { api } from '../lib/api';
import { formatDateTime, PART_OF_DAY_LABELS } from '../lib/format';

export default function MistingHistory() {
  const [events, setEvents] = useState<MistingEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

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

        {error && <p className="text-destructive">Chyba: {error}</p>}

        {events.length === 0 ? (
          <p className="text-muted-foreground">Zatím žádné záznamy.</p>
        ) : (
          <ul className="space-y-2">
            {events.map((ev) => (
              <li
                key={ev.id}
                className="flex items-center justify-between py-2 px-3 rounded-md border border-border"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={
                      'w-6 h-6 rounded flex items-center justify-center text-sm ' +
                      (ev.done === 1
                        ? 'bg-blue-500/15 text-blue-600'
                        : 'bg-muted text-muted-foreground')
                    }
                  >
                    💧
                  </span>
                  <span className="font-medium">{PART_OF_DAY_LABELS[ev.part_of_day]}</span>
                  <span
                    className={
                      'text-xs px-1.5 py-0.5 rounded ' +
                      (ev.done === 1
                        ? 'bg-green-500/15 text-green-600'
                        : 'bg-red-500/15 text-red-600')
                    }
                  >
                    {ev.done === 1 ? 'ano' : 'ne'}
                  </span>
                  {ev.note && <span className="text-sm text-muted-foreground">— {ev.note}</span>}
                </div>
                <span className="text-sm text-muted-foreground">{formatDateTime(ev.ts)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
