import { useCallback, useEffect, useMemo, useState } from 'react';
import { StickyNote, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import type { DayNote, Gecko } from '../lib/types';
import { api } from '../lib/api';
import { formatTime } from '../lib/format';

interface Props {
  date: string;                 // YYYY-MM-DD logický den
  geckos: Gecko[];              // pro dropdown "týká se"
  compact?: boolean;            // menší titulek (pro detail kalendáře)
  defaultOpen?: boolean;        // rozbalit i když den žádné poznámky nemá
}

export default function DayNotesPanel({ date, geckos, compact, defaultOpen }: Props) {
  const [notes, setNotes] = useState<DayNote[]>([]);
  const [text, setText] = useState('');
  const [geckoId, setGeckoId] = useState<string>('');   // '' = obecná
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(!!defaultOpen);

  const load = useCallback(async () => {
    const r = await api.dayNotes.list({ date });
    setNotes(r.notes);
    // Den bez poznámek nechávám sbalený na jednu řádku — poznámky píšu jen
    // občas a rozbalený formulář by jinak zabíral místo na dashboardu zbytečně.
    // Když panel někdo otevřel cíleně (defaultOpen), rozbalený zůstane vždy.
    setOpen(!!defaultOpen || r.notes.length > 0);
  }, [date, defaultOpen]);

  useEffect(() => { load(); }, [load]);

  const geckoById = useMemo(() => {
    const m: Record<number, Gecko> = {};
    for (const g of geckos) m[g.id] = g;
    return m;
  }, [geckos]);

  const submit = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      await api.dayNotes.create({
        date_prague: date,
        gecko_id: geckoId ? Number(geckoId) : null,
        text: trimmed,
      });
      setText('');
      setGeckoId('');
      load();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    await api.dayNotes.remove(id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="hub-card px-4 py-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 w-full text-left"
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
        <StickyNote className="w-4 h-4 text-apricot shrink-0" />
        <span className={compact ? 'text-sm font-medium' : 'font-semibold'}>
          Poznámka {compact ? '' : 'k dnešku'}
        </span>
        {notes.length > 0 && (
          <span className="hub-pill hub-pill-neutral tabular-nums">
            {notes.length}
          </span>
        )}
        <span className="text-xs text-muted-foreground tabular-nums ml-auto">{date}</span>
      </button>

      {open && notes.length > 0 && (
        <ul className="space-y-1.5 mt-3 mb-3">
          {notes.map((n) => {
            const g = n.gecko_id != null ? geckoById[n.gecko_id] : null;
            return (
              <li
                key={n.id}
                className="flex items-start gap-2 py-2 px-3 rounded-xl border border-border bg-secondary/50 text-sm"
              >
                {g && (
                  <span
                    className="w-3 h-3 rounded-full border border-border/40 shrink-0 mt-1"
                    style={{ background: g.color_hex ?? '#ccc' }}
                    title={g.name}
                    aria-hidden
                  />
                )}
                <div className="flex-1 min-w-0">
                  {g && (
                    <span className="text-xs text-muted-foreground mr-1">{g.name}:</span>
                  )}
                  <span className="break-words">{n.text}</span>
                </div>
                <span className="text-[10px] text-muted-foreground tabular-nums shrink-0 mt-1">
                  {formatTime(n.created_at)}
                </span>
                <button
                  onClick={() => remove(n.id)}
                  className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                  aria-label="Smazat"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {open && (
      <div className="flex flex-wrap gap-2 items-stretch mt-3">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Co se dnes dělo…"
          className="hub-input flex-1 min-w-[180px] !w-auto"
        />
        <select
          value={geckoId}
          onChange={(e) => setGeckoId(e.target.value)}
          className="hub-input !w-auto"
          aria-label="Týká se"
        >
          <option value="">— obecná</option>
          {geckos.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
        <button
          onClick={submit}
          disabled={busy || !text.trim()}
          className="hub-btn hub-btn-primary"
        >
          <Plus className="w-4 h-4" /> Přidat
        </button>
      </div>
      )}
    </div>
  );
}
