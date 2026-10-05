import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { Sparkles, Check, Stethoscope, StickyNote, Trash2 } from 'lucide-react';
import type { CareEvent, DayNote, Gecko, GeckoSlug, SheddingEvent } from '../lib/types';
import { api } from '../lib/api';
import { CATEGORY_LABELS, formatDateTime, formatDateWithWeekday, relativeFromNow } from '../lib/format';
import GeckoShell from '../components/GeckoShell';

export default function GeckoProfile() {
  const { slug } = useParams<{ slug: GeckoSlug }>();
  const [gecko, setGecko] = useState<Gecko | null>(null);
  const [events, setEvents] = useState<CareEvent[]>([]);
  const [shedding, setShedding] = useState<SheddingEvent[]>([]);
  const [notes, setNotes] = useState<DayNote[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!slug) return;
    try {
      const [g, e, s, n] = await Promise.all([
        api.geckos.get(slug),
        api.geckos.events.list(slug),
        api.geckos.shedding.list(slug),
        api.dayNotes.list({ gecko: slug }),
      ]);
      setGecko(g.gecko);
      setEvents(e.events);
      setShedding(s.events);
      setNotes(n.notes);
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

  if (error)
    return (
      <GeckoShell back="/private/geckos" backLabel="Zpět na dashboard" title="Profil" narrow>
        <p className="px-4 py-3 rounded-xl bg-raspberry/10 border border-raspberry/25 text-raspberry text-sm">
          Chyba: {error}
        </p>
      </GeckoShell>
    );
  if (!gecko)
    return (
      <GeckoShell back="/private/geckos" backLabel="Zpět na dashboard" title="Profil" narrow>
        <p className="text-muted-foreground">Načítám…</p>
      </GeckoShell>
    );

  const rescueOn = gecko.rescue_mode === 1;

  return (
    <GeckoShell
      back="/private/geckos"
      backLabel="Zpět na dashboard"
      eyebrow="Profil gekona"
      narrow
      icon={
        <span
          className="w-9 h-9 rounded-full border-2 border-border-strong"
          style={{ background: gecko.color_hex ?? '#ccc' }}
          aria-hidden
        />
      }
      title={gecko.name}
      subtitle={gecko.birth_date ? `narozen ${gecko.birth_date}` : undefined}
    >
      <section
        className={
          'hub-card mb-8 p-4 flex items-center justify-between gap-4 ' +
          (rescueOn ? 'hub-edge-danger !border-raspberry/30' : '')
        }
      >
        <div className="flex items-center gap-3">
          <Stethoscope className={'w-5 h-5 ' + (rescueOn ? 'text-raspberry' : 'text-muted-foreground')} />
          <div className="font-medium">Rescue mód {rescueOn ? '— zapnuto' : ''}</div>
        </div>
        <button
          onClick={toggleRescue}
          className={'hub-btn hub-btn-sm shrink-0 ' + (rescueOn ? 'hub-btn-danger' : 'hub-btn-ghost')}
        >
          {rescueOn ? 'Vypnout' : 'Zapnout'}
        </button>
      </section>

      <section className="mb-10">
        <h2 className="hub-title text-xl inline-flex items-center gap-2 mb-3">
          <StickyNote className="w-5 h-5 text-apricot" /> Poznámky
        </h2>
        {notes.length === 0 ? (
          <p className="text-muted-foreground text-sm">Žádné poznámky.</p>
        ) : (
          <ul className="space-y-2">
            {notes.map((n) => (
              <li key={n.id} className="hub-card flex items-start justify-between gap-3 py-2.5 px-4">
                <div className="flex-1 min-w-0">
                  <div className="hub-label mb-1">{formatDateWithWeekday(n.date_prague)}</div>
                  <div className="text-sm break-words">{n.text}</div>
                </div>
                <button
                  onClick={async () => {
                    await api.dayNotes.remove(n.id);
                    setNotes((prev) => prev.filter((x) => x.id !== n.id));
                  }}
                  className="hub-btn hub-btn-quiet hub-btn-icon hover:!text-raspberry"
                  aria-label="Smazat"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="hub-title text-xl inline-flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-mint" /> Svlékání
          </h2>
          <button onClick={logShedding} className="hub-btn hub-btn-sm hub-btn-primary">
            + Nové svlékání
          </button>
        </div>
        {shedding.length === 0 ? (
          <p className="text-muted-foreground text-sm">Zatím žádné záznamy.</p>
        ) : (
          <ul className="space-y-2">
            {shedding.map((ev) => (
              <li key={ev.id} className="hub-card flex items-center justify-between gap-3 py-2.5 px-4 flex-wrap">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm tabular-nums">{formatDateTime(ev.ts)}</span>
                  <span className="text-xs text-muted-foreground">{relativeFromNow(ev.ts)}</span>
                  {ev.checked === 1 ? (
                    <span className="hub-pill hub-pill-ok">
                      <Check className="w-3 h-3" /> zkontrolováno
                    </span>
                  ) : (
                    <span className="hub-pill hub-pill-warn">kontrola pending</span>
                  )}
                  {ev.note && <span className="text-sm text-muted-foreground">— {ev.note}</span>}
                </div>
                {ev.checked === 0 && (
                  <button onClick={() => markChecked(ev.id)} className="hub-btn hub-btn-sm hub-btn-ghost">
                    Označit zkontrolováno
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <h2 className="hub-title text-xl mb-3">Historie péče</h2>
      {events.length === 0 ? (
        <p className="text-muted-foreground">Zatím žádné záznamy.</p>
      ) : (
        <ul className="space-y-2">
          {events.map((ev) => (
            <li key={ev.id} className="hub-card flex items-center justify-between gap-3 py-2.5 px-4">
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-medium">{CATEGORY_LABELS[ev.category]}</span>
                <span className="hub-pill hub-pill-neutral tabular-nums">×{ev.count}</span>
                {ev.note && <span className="text-sm text-muted-foreground truncate">— {ev.note}</span>}
              </div>
              <span className="text-sm text-muted-foreground tabular-nums shrink-0">{formatDateTime(ev.ts)}</span>
            </li>
          ))}
        </ul>
      )}
    </GeckoShell>
  );
}
