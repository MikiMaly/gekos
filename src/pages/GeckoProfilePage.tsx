import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import type { CareEvent, Gecko, GeckoSlug } from '../lib/types';
import { api } from '../lib/api';
import { CATEGORY_LABELS, formatDateTime } from '../lib/format';

export default function GeckoProfile() {
  const { slug } = useParams<{ slug: GeckoSlug }>();
  const [gecko, setGecko] = useState<Gecko | null>(null);
  const [events, setEvents] = useState<CareEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!slug) return;
    try {
      const [g, e] = await Promise.all([
        api.geckos.get(slug),
        api.geckos.events.list(slug),
      ]);
      setGecko(g.gecko);
      setEvents(e.events);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [slug]);

  useEffect(() => {
    document.title = `${gecko?.name ?? 'Profil'} — Gekoni`;
    load();
  }, [load, gecko?.name]);

  if (error) return <div className="max-w-3xl mx-auto p-6 text-destructive">Chyba: {error}</div>;
  if (!gecko) return <div className="max-w-3xl mx-auto p-6 text-muted-foreground">Načítám…</div>;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto p-6">
        <Link
          to="/private/geckos"
          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Zpět na dashboard
        </Link>

        <header className="flex items-center gap-4 mb-8">
          <span
            className="w-16 h-16 rounded-full border-2 border-border"
            style={{ background: gecko.color_hex ?? '#ccc' }}
            aria-hidden
          />
          <div>
            <h1 className="text-3xl font-semibold">{gecko.name}</h1>
            {gecko.birth_date && (
              <p className="text-sm text-muted-foreground">narozen {gecko.birth_date}</p>
            )}
          </div>
        </header>

        <h2 className="text-xl font-semibold mb-4">Historie péče</h2>
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
                  <span className="font-medium">{CATEGORY_LABELS[ev.category]}</span>
                  <span className="text-sm tabular-nums px-1.5 py-0.5 rounded bg-secondary">
                    ×{ev.count}
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
