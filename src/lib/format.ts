const TZ = 'Europe/Prague';

const dateTimeFmt = new Intl.DateTimeFormat('cs-CZ', {
  timeZone: TZ,
  day: 'numeric',
  month: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const dateFmt = new Intl.DateTimeFormat('cs-CZ', {
  timeZone: TZ,
  day: 'numeric',
  month: 'numeric',
  year: 'numeric',
});

const timeFmt = new Intl.DateTimeFormat('cs-CZ', {
  timeZone: TZ,
  hour: '2-digit',
  minute: '2-digit',
});

export function formatDateTime(iso: string): string {
  return dateTimeFmt.format(new Date(iso));
}

export function formatDate(iso: string): string {
  return dateFmt.format(new Date(iso));
}

export function formatTime(iso: string): string {
  return timeFmt.format(new Date(iso));
}

export function relativeFromNow(iso: string, now: Date = new Date()): string {
  const diffMs = now.getTime() - new Date(iso).getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return 'právě teď';
  if (diffMin < 60) return `před ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `před ${diffH} h`;
  const diffD = Math.round(diffH / 24);
  if (diffD < 30) return `před ${diffD} ${diffD === 1 ? 'dnem' : 'dny'}`;
  const diffMo = Math.round(diffD / 30);
  return `před ${diffMo} měs.`;
}

export const CATEGORY_LABELS = {
  cvrcci: 'Cvrčci',
  banan: 'Banán',
  antib: 'Antibiotika',
  mast: 'Mast',
} as const;

export const PART_OF_DAY_LABELS = {
  rano: 'Ráno',
  vecer: 'Večer',
} as const;
