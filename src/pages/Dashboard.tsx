import { useCallback, useEffect, useState } from 'react';
import { StickyNote } from 'lucide-react';
import { api, type DashboardResponse } from '../lib/api';
import GeckoCard from '../components/GeckoCard';
import MistingWidget from '../components/MistingWidget';
import DayNotesPanel from '../components/DayNotesPanel';
import CalendarBoard from '../components/CalendarBoard';
import GeckoShell from '../components/GeckoShell';

export default function GeckosDashboard() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Poznámky píšu jen párkrát za měsíc, takže panel nedržím na stránce —
  // v hlavičce je jen malá ikonka, která ho na kliknutí rozbalí.
  const [notesOpen, setNotesOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api.dashboard();
      setData(d);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    document.title = 'Gekoni · mmaly.cz';
    load();
  }, [load]);

  if (error) {
    return (
      <GeckoShell icon="🦎" title="Gekoni">
        <p className="px-4 py-3 rounded-xl bg-raspberry/10 border border-raspberry/25 text-raspberry text-sm">
          Chyba: {error}
        </p>
      </GeckoShell>
    );
  }

  if (!data) {
    return (
      <GeckoShell icon="🦎" title="Gekoni">
        <p className="text-muted-foreground">Načítám…</p>
      </GeckoShell>
    );
  }

  return (
    <GeckoShell
      fill
      icon="🦎"
      eyebrow=""
      title="Gekoni"
      subtitle="Krmení, mlžení, svlékání a historie péče"
      aside={
        <>
          <span className="hub-chip px-3 py-1.5 tabular-nums">dnes {data.date_prague}</span>
          <button
            onClick={() => setNotesOpen((o) => !o)}
            className={'hub-btn hub-btn-sm ' + (notesOpen ? 'hub-btn-soft' : 'hub-btn-ghost')}
            aria-expanded={notesOpen}
            title="Poznámka k dnešku"
          >
            <StickyNote className="w-4 h-4" />
            Poznámka
          </button>
        </>
      }
    >
      {notesOpen && (
        <div className="mb-6">
          <DayNotesPanel
            date={data.date_prague}
            geckos={data.geckos.map((g) => g.gecko)}
            compact
            defaultOpen
          />
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 mb-4 shrink-0">
        {data.geckos.map((g) => (
          <GeckoCard
            key={g.gecko.id}
            gecko={g.gecko}
            todayEvents={g.today_events}
            lastPerCategory={g.last_event_per_category}
            lastShedding={g.last_shedding}
            onChange={load}
          />
        ))}
      </section>

      {/* Na širokém monitoru vedle sebe: kalendář bere čtyři pětiny, mlžení
          zbytek. Pod sebou to bylo přes dvě obrazovky scrollu, i když obojí
          se vedle sebe v klidu vejde. Pod xl se to složí zpátky.

          Kalendářový sloupec má strop na výšku okna a scrolluje sám v sobě.
          Bez toho rozklik dne (detail + poznámky) natáhl celou stránku a
          muselo se scrollovat znovu od začátku. */}
      <div className="grid gap-4 xl:grid-cols-5 items-start xl:items-stretch xl:flex-1 xl:min-h-0">
        <section className="hub-card px-4 py-3 xl:col-span-4 xl:min-h-0 xl:overflow-y-auto xl:flex xl:flex-col">
          <CalendarBoard />
        </section>
        <div className="xl:self-start">
          <MistingWidget today={data.misting_today} onChange={load} />
        </div>
      </div>
    </GeckoShell>
  );
}
