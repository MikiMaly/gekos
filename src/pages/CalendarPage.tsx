import { useEffect } from 'react';
import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import CalendarBoard from '../components/CalendarBoard';

// Samostatná stránka kalendáře. Mřížku i detail dne drží CalendarBoard,
// protože ten samý kalendář se renderuje i na spodku dashboardu.
export default function GeckosCalendar() {
  useEffect(() => {
    document.title = 'Kalendář — Gekoni';
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-5xl mx-auto p-6">
        <Link
          to="/private/geckos"
          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Zpět
        </Link>
        <CalendarBoard />
      </div>
    </div>
  );
}
