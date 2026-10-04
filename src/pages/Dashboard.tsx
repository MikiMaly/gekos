import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, StickyNote } from 'lucide-react';
import { api, type DashboardResponse } from '../lib/api';
import GeckoCard from '../components/GeckoCard';
import MistingWidget from '../components/MistingWidget';
import DayNotesPanel from '../components/DayNotesPanel';
import CalendarBoard from '../components/CalendarBoard';

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
    document.title = 'Gekoni — mmaly.cz';
    load();
  }, [load]);

  if (error) {
    return (
      <div className="max-w-[1600px] mx-auto p-6">
        <p className="text-destructive">Chyba: {error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-[1600px] mx-auto p-6">
        <p className="text-muted-foreground">Načítám…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-[1600px] mx-auto p-6">
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link
              to="/private"
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" /> Zpět
            </Link>
            <h1 className="text-3xl font-semibold">🦎 Gekoni</h1>
            <span className="text-sm text-muted-foreground">{data.date_prague}</span>
          </div>
          <button
            onClick={() => setNotesOpen((o) => !o)}
            className={
              'p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted ' +
              (notesOpen ? 'bg-muted text-foreground' : '')
            }
            aria-expanded={notesOpen}
            aria-label="Poznámka k dnešku"
            title="Poznámka k dnešku"
          >
            <StickyNote className="w-4 h-4" />
          </button>
        </header>

        {notesOpen && (
          <div className="-mt-4 mb-6">
            <DayNotesPanel
              date={data.date_prague}
              geckos={data.geckos.map((g) => g.gecko)}
              compact
              defaultOpen
            />
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 mb-6">
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
        <div className="grid gap-6 xl:grid-cols-5 items-start">
          <section className="xl:col-span-4 xl:max-h-[calc(100vh-13rem)] xl:overflow-y-auto xl:pr-2">
            <CalendarBoard />
          </section>
          <MistingWidget today={data.misting_today} onChange={load} />
        </div>
      </div>
    </div>
  );
}
