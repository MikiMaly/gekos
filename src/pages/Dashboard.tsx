import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Calendar as CalendarIcon, ArrowLeft } from 'lucide-react';
import { api, type DashboardResponse } from '../lib/api';
import GeckoCard from '../components/GeckoCard';
import MistingWidget from '../components/MistingWidget';

export default function GeckosDashboard() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      <div className="max-w-4xl mx-auto p-6">
        <p className="text-destructive">Chyba: {error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <p className="text-muted-foreground">Načítám…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-5xl mx-auto p-6">
        <header className="flex items-center justify-between mb-8">
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
          <Link
            to="/private/geckos/calendar"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-secondary hover:bg-muted text-sm"
          >
            <CalendarIcon className="w-4 h-4" /> Kalendář
          </Link>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 mb-6">
          {data.geckos.map((g) => (
            <GeckoCard
              key={g.gecko.id}
              gecko={g.gecko}
              todayEvents={g.today_events}
              lastPerCategory={g.last_event_per_category}
              onChange={load}
            />
          ))}
        </section>

        <MistingWidget today={data.misting_today} onChange={load} />
      </div>
    </div>
  );
}
