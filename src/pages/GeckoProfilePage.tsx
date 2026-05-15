import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router';
import { ArrowLeft, Sparkles, Check, Stethoscope } from 'lucide-react';
import type { CareEvent, Gecko, GeckoSlug, SheddingEvent } from '../lib/types';
import { api } from '../lib/api';
import { CATEGORY_LABELS, formatDateTime, relativeFromNow } from '../lib/format';

export default function GeckoProfile() {
  const { slug } = useParams<{ slug: GeckoSlug }>();
  const [gecko, setGecko] = useState<Gecko | null>(null);
  const [events, setEvents] = useState<CareEvent[]>([]);
  const [shedding, setShedding] = useState<SheddingEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!slug) return;
    try {
      const [g, e, s] = await Promise.all([
        api.geckos.get(slug),
        api.geckos.events.list(slug),
        api.geckos.shedding.list(slug),
      ]);
      setGecko(g.gecko);
      setEvents(e.events);
      setShedding(s.events);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [slug]);

  useEffect(() => {
    document.title = `${gecko?.name ?? 'Profil'} — Gekoni`;
    load();
  }, [load, gecko?.name]);

  const logShedding = async () => {
    if (!slug) return;
    await api.geckos.shedding.create(slug);
    load();
  };

  const markChecked = async (id: number) => {
    if (!slug) return;
    await api.geckos.shedding.markChecked(slug, id, true);
    load();
  };

  const toggleRescue = async () => {
    if (!slug || !gecko) return;
    const next = gecko.rescue_mode === 1 ? false : true;
    const r = await api.geckos.update(slug, { rescue_mode: next });
    setGecko(r.gecko);
  };

  if (error) return <div className="max-w-3xl mx-auto p-6 text-destructive">Chyba: {error}</div>;
  if (!gecko) return <div className="max-w-3xl mx-auto p-6 text-muted-foreground">Načítám…</div>;

  const rescueOn = gecko.rescue_mode === 1;

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
          <div className="flex-1">
            <h1 className="text-3xl font-semibold">{gecko.name}</h1>
            {gecko.birth_date && (
              <p className="text-sm text-muted-foreground">narozen {gecko.birth_date}</p>
            )}
          </div>
        </header>

        <section
          className={
            'mb-8 rounded-xl border p-4 flex items-center justify-between gap-4 ' +
            (rescueOn ? 'border-red-500/30 bg-red-500/5' : 'border-border')
          }
        >
          <div className="flex items-center gap-3">
            <Stethoscope
              className={'w-5 h-5 ' + (rescueOn ? 'text-red-500' : 'text-muted-foreground')}
            />
            <div className="font-medium">Rescue mód {rescueOn ? '— zapnuto' : ''}</div>
          </div>
          <button
            onClick={toggleRescue}
            className={
              'px-3 py-1.5 rounded-md text-sm shrink-0 ' +
              (rescueOn
                ? 'bg-red-500 text-white hover:bg-red-500/90'
                : 'bg-secondary hover:bg-muted')
            }
          >
            {rescueOn ? 'Vypnout' : 'Zapnout'}
          </button>
        </section>

        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold inline-flex items-center gap-2">
              <Sparkles className="w-5 h-5" /> Svlékání
            </h2>
            <button
              onClick={logShedding}
              className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm"
            >
              + Nové svlékání
            </button>
          </div>
          {shedding.length === 0 ? (
            <p className="text-muted-foreground text-sm">Zatím žádné záznamy.</p>
          ) : (
            <ul className="space-y-2">
              {shedding.map((ev) => (
                <li
                  key={ev.id}
                  className="flex items-center justify-between py-2 px-3 rounded-md border border-border"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm">{formatDateTime(ev.ts)}</span>
                    <span className="text-xs text-muted-foreground">{relativeFromNow(ev.ts)}</span>
                    {ev.checked === 1 ? (
                      <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-green-500/15 text-green-600">
                        <Check className="w-3 h-3" /> zkontrolováno
                      </span>
                    ) : (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600">
                        kontrola pending
                      </span>
                    )}
                    {ev.note && <span className="text-sm text-muted-foreground">— {ev.note}</span>}
                  </div>
                  {ev.checked === 0 && (
                    <button
                      onClick={() => markChecked(ev.id)}
                      className="text-xs px-2 py-1 rounded bg-secondary hover:bg-muted"
                    >
                      Označit zkontrolováno
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

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
