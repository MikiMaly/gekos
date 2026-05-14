import { useState } from 'react';
import { Bug, Banana, Pill, Droplet, Plus, Minus, ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import type { CareCategory, CareEvent, Gecko, GeckoSlug } from '../lib/types';
import { CATEGORY_LABELS, relativeFromNow } from '../lib/format';
import { api } from '../lib/api';

const CATEGORY_ICONS: Record<CareCategory, typeof Bug> = {
  cvrcci: Bug,
  banan: Banana,
  antib: Pill,
  mast: Droplet,
};

const CATEGORIES: CareCategory[] = ['cvrcci', 'banan', 'antib', 'mast'];

interface Props {
  gecko: Gecko;
  todayEvents: CareEvent[];
  lastPerCategory: Record<CareCategory, CareEvent | null>;
  onChange: () => void;
}

export default function GeckoCard({ gecko, todayEvents, lastPerCategory, onChange }: Props) {
  const [pending, setPending] = useState<CareCategory | null>(null);

  const latestTodayPerCategory: Record<CareCategory, CareEvent | null> = {
    cvrcci: null, banan: null, antib: null, mast: null,
  };
  for (const ev of todayEvents) {
    if (!latestTodayPerCategory[ev.category]) latestTodayPerCategory[ev.category] = ev;
  }

  const submit = async (category: CareCategory, given: boolean) => {
    setPending(category);
    try {
      await api.geckos.events.create(gecko.slug as GeckoSlug, { category, given });
      onChange();
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className="w-10 h-10 rounded-full border-2 border-border shrink-0"
            style={{ background: gecko.color_hex ?? '#ccc' }}
            aria-hidden
          />
          <h3 className="text-xl font-semibold">{gecko.name}</h3>
        </div>
        <Link
          to={`/private/geckos/${gecko.slug}`}
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          Profil <ArrowRight className="w-4 h-4" />
        </Link>
      </header>

      <ul className="flex flex-col gap-2">
        {CATEGORIES.map((cat) => {
          const Icon = CATEGORY_ICONS[cat];
          const todayLatest = latestTodayPerCategory[cat];
          const last = lastPerCategory[cat];
          const todayState = todayLatest ? (todayLatest.given === 1 ? '+' : '−') : null;

          return (
            <li
              key={cat}
              className="flex items-center justify-between gap-3 py-1.5 border-b border-border/40 last:border-0"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="font-medium">{CATEGORY_LABELS[cat]}</span>
                {todayState && (
                  <span
                    className={
                      'text-xs px-1.5 py-0.5 rounded ' +
                      (todayState === '+'
                        ? 'bg-green-500/15 text-green-600'
                        : 'bg-red-500/15 text-red-600')
                    }
                  >
                    dnes {todayState}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  {last ? relativeFromNow(last.ts) : 'nikdy'}
                </span>
                <button
                  onClick={() => submit(cat, true)}
                  disabled={pending === cat}
                  className="w-8 h-8 rounded-md bg-green-500/10 hover:bg-green-500/20 text-green-600 disabled:opacity-50 flex items-center justify-center"
                  aria-label={`${CATEGORY_LABELS[cat]} +`}
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => submit(cat, false)}
                  disabled={pending === cat}
                  className="w-8 h-8 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-600 disabled:opacity-50 flex items-center justify-center"
                  aria-label={`${CATEGORY_LABELS[cat]} -`}
                >
                  <Minus className="w-4 h-4" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
