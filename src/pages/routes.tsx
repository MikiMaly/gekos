import type { RouteObject } from 'react-router';
import GeckosDashboard from './Dashboard';
import GeckosCalendar from './CalendarPage';
import GeckoProfile from './GeckoProfilePage';
import MistingHistory from './MistingPage';

export const geckoRoutes: RouteObject[] = [
  { path: '/private/geckos', element: <GeckosDashboard /> },
  { path: '/private/geckos/calendar', element: <GeckosCalendar /> },
  { path: '/private/geckos/misting', element: <MistingHistory /> },
  { path: '/private/geckos/:slug', element: <GeckoProfile /> },
];

export { GeckosDashboard, GeckosCalendar, GeckoProfile, MistingHistory };
