import { useState } from 'react';
import { Cloud, Sun, Moon, Check, X } from 'lucide-react';
import type { PartOfDay } from '../lib/types';
import { api } from '../lib/api';
import { formatTime, PART_OF_DAY_LABELS } from '../lib/format';

interface Props {
  today: Record<PartOfDay, { done: boolean; ts: string | null }>;
  onChange: () => void;
}

export default function MistingWidget({ today, onChange }: Props) {
  const [pending, setPending] = useState<PartOfDay | null>(null);

  const submit = async (part: PartOfDay, done: boolean) => {
    setPending(part);
    try {
      await api.misting.create({ part_of_day: part, done });
      onChange();
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <header className="flex items-center gap-2 mb-4">
        <Cloud className="w-5 h-5 text-blue-500" />
        <h3 className="text-xl font-semibold">Mlžení terária</h3>
      </header>

      <div className="grid grid-cols-2 gap-3">
        {(['rano', 'vecer'] as PartOfDay[]).map((part) => {
          const slot = today[part];
          const Icon = part === 'rano' ? Sun : Moon;
          return (
            <div
              key={part}
              className="rounded-xl border border-border p-4 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{PART_OF_DAY_LABELS[part]}</span>
                </div>
                {slot.ts && (
                  <span className="text-xs text-muted-foreground">{formatTime(slot.ts)}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => submit(part, true)}
                  disabled={pending === part}
                  className={
                    'flex-1 py-2 rounded-md flex items-center justify-center gap-1.5 text-sm font-medium disabled:opacity-50 ' +
                    (slot.done
                      ? 'bg-green-500 text-white'
                      : 'bg-green-500/10 text-green-600 hover:bg-green-500/20')
                  }
                >
                  <Check className="w-4 h-4" /> Ano
                </button>
                <button
                  onClick={() => submit(part, false)}
                  disabled={pending === part}
                  className={
                    'flex-1 py-2 rounded-md flex items-center justify-center gap-1.5 text-sm font-medium disabled:opacity-50 ' +
                    (slot.ts && !slot.done
                      ? 'bg-red-500 text-white'
                      : 'bg-red-500/10 text-red-600 hover:bg-red-500/20')
                  }
                >
                  <X className="w-4 h-4" /> Ne
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
