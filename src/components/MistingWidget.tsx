import { useState } from 'react';
import { Cloud, Sun, Moon, Sparkles, Check, X, Plus, Undo2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import type { MistingEvent, PartOfDay } from '../lib/types';
import { api } from '../lib/api';
import { formatTime, PART_OF_DAY_LABELS } from '../lib/format';
import { pragueLogicalDateString, pragueWallTimeToUtc } from '../lib/time';

interface Props {
  today: {
    rano: { latest_ts: string | null; latest_done: 0 | 1 | null };
    vecer: { latest_ts: string | null; latest_done: 0 | 1 | null };
    nahodne: { count: number; latest_ts: string | null };
  };
  onChange: () => void;
}

const ICONS: Record<PartOfDay, typeof Cloud> = {
  rano: Sun,
  vecer: Moon,
  nahodne: Sparkles,
};

const SLOT_HOUR: Record<Exclude<PartOfDay, 'nahodne'>, number> = {
  rano: 9,
  vecer: 22,
};

export default function MistingWidget({ today, onChange }: Props) {
  const [pending, setPending] = useState<PartOfDay | null>(null);
  const [lastCreated, setLastCreated] = useState<MistingEvent | null>(null);

  const submit = async (part: PartOfDay) => {
    setPending(part);
    try {
      // Slot časy musí používat logický den (04:00–04:00), shodně s dashboardem
      // i historií. Po půlnoci (00:00–04:00) je kalendářní den už zítřek, takže
      // pragueDateString() by zápis posunul mimo dnešní logické okno → "nejde
      // zaznamenat" rano/vecer. Náhodné si nechává reálný okamžik kliknutí.
      const ts =
        part === 'nahodne'
          ? undefined
          : pragueWallTimeToUtc(pragueLogicalDateString(), SLOT_HOUR[part]).toISOString();
      const r = await api.misting.create({ part_of_day: part, ts });
      setLastCreated(r.event);
      onChange();
      setTimeout(() => {
        setLastCreated((prev) => (prev && prev.id === r.event.id ? null : prev));
      }, 8000);
    } finally {
      setPending(null);
    }
  };

  const undoLast = async () => {
    if (!lastCreated) return;
    await api.misting.remove(lastCreated.id);
    setLastCreated(null);
    onChange();
  };

  const row = (part: PartOfDay) => {
    const Icon = ICONS[part];
    let state: 'done' | 'skipped' | 'pending';
    let ts: string | null;
    let subtitle: string;

    if (part === 'nahodne') {
      state = today.nahodne.count > 0 ? 'done' : 'pending';
      ts = today.nahodne.latest_ts;
      subtitle =
        today.nahodne.count > 0
          ? `${today.nahodne.count}× dnes${ts ? ` · ${formatTime(ts)}` : ''}`
          : 'zatím dnes ne';
    } else {
      const slot = today[part];
      if (slot.latest_done === 1) state = 'done';
      else if (slot.latest_done === 0) state = 'skipped';
      else state = 'pending';
      ts = slot.latest_ts;
      subtitle =
        state === 'done'
          ? `✓ rošeno · ${ts ? formatTime(ts) : ''}`
          : state === 'skipped'
          ? `✗ nerošeno · ${ts ? formatTime(ts) : ''}`
          : 'zatím dnes ne';
    }

    return (
      <div
        key={part}
        className="flex items-center justify-between gap-3 py-2.5 border-b border-border/40 last:border-0"
      >
        <div className="flex items-center gap-3 min-w-0">
          <Icon
            className={
              'w-4 h-4 ' +
              (state === 'done'
                ? 'text-blue-500'
                : state === 'skipped'
                ? 'text-red-500'
                : 'text-muted-foreground')
            }
          />
          <span className="font-medium">{PART_OF_DAY_LABELS[part]}</span>
          <span className="text-xs text-muted-foreground truncate">{subtitle}</span>
        </div>
        <button
          onClick={() => submit(part)}
          disabled={pending === part}
          className={
            'w-9 h-9 rounded-md flex items-center justify-center disabled:opacity-50 ' +
            (state === 'done'
              ? 'bg-blue-500/15 text-blue-600 hover:bg-blue-500/25'
              : state === 'skipped'
              ? 'bg-red-500/15 text-red-600 hover:bg-red-500/25'
              : 'bg-primary/10 text-primary hover:bg-primary/20')
          }
          aria-label={`Zaznamenat mlžení ${PART_OF_DAY_LABELS[part]}`}
        >
          {state === 'done' && part !== 'nahodne' ? (
            <Check className="w-4 h-4" />
          ) : state === 'skipped' ? (
            <X className="w-4 h-4" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
        </button>
      </div>
    );
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 relative">
      <header className="flex items-center justify-between gap-2 mb-3">
        <Link
          to="/private/geckos/misting"
          className="flex items-center gap-2 group"
        >
          <Cloud className="w-5 h-5 text-blue-500" />
          <h3 className="text-xl font-semibold group-hover:text-primary transition-colors">
            Mlžení terária
          </h3>
          <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>
        <Link
          to="/private/geckos/misting"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Historie →
        </Link>
      </header>

      <div className="flex flex-col">
        {(['rano', 'vecer', 'nahodne'] as PartOfDay[]).map(row)}
      </div>

      {lastCreated && (
        <div className="absolute bottom-3 right-3 left-3 flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-foreground/90 text-background text-xs shadow-lg">
          <span>Zapsáno: mlžení {PART_OF_DAY_LABELS[lastCreated.part_of_day]}</span>
          <button onClick={undoLast} className="inline-flex items-center gap-1 underline">
            <Undo2 className="w-3 h-3" /> Vrátit
          </button>
        </div>
      )}
    </div>
  );
}
