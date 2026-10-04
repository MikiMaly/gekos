import { useEffect } from 'react';
import CalendarBoard from '../components/CalendarBoard';
import GeckoShell from '../components/GeckoShell';

// Samostatná stránka kalendáře. Mřížku i detail dne drží CalendarBoard,
// protože ten samý kalendář se renderuje i na spodku dashboardu.
export default function GeckosCalendar() {
  useEffect(() => {
    document.title = 'Kalendář · Gekoni';
  }, []);

  return (
    <GeckoShell back="/private/geckos" icon="🗓️" title="Kalendář" narrow>
      <div className="hub-card p-4 sm:p-5">
        <CalendarBoard />
      </div>
    </GeckoShell>
  );
}
