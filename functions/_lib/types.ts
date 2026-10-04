export type GeckoSlug = 'bily' | 'bezovy' | 'hnedy';

export type CareCategory = 'cvrcci' | 'banan' | 'antib' | 'mast';

export type PartOfDay = 'rano' | 'vecer' | 'nahodne';

// 'manual' = naklikané v appce nebo odkliknuté z Telegramu
// 'auto'   = zápis automatického rosiče (viz AUTO_MISTER_* v cron/src/index.ts)
export type MistingSource = 'manual' | 'auto';

// Automatický rosič na časovači. Jediná runtime hodnota v tomhle modulu —
// potřebuje ji UI (odznak ve widgetu, filtr v historii) i Functions.
// POZOR: cron worker má vlastní kopii (AUTO_MISTER_* v cron/src/index.ts),
// protože se deployuje zvlášť a nesdílí bundle. Měníš tady → měň i tam.
export const AUTO_MISTER = {
  since: '2026-06-01',        // první den, kdy rosič visel v teráriu
  intervalHours: 8,
  durationSec: 45,
  cycleHoursPrague: [6, 14, 22],  // 06:00 → rano, 14:00 → nahodne, 22:00 → vecer
} as const;

export interface Gecko {
  id: number;
  slug: GeckoSlug;
  name: string;
  color_hex: string | null;
  photo_url: string | null;
  birth_date: string | null;
  notes: string | null;
  rescue_mode: 0 | 1;
  created_at: string;
}

export interface CareEvent {
  id: number;
  gecko_id: number;
  ts: string;
  category: CareCategory;
  count: number;
  note: string | null;
}

export interface MistingEvent {
  id: number;
  ts: string;
  part_of_day: PartOfDay;
  done: 0 | 1;
  source: MistingSource;
  duration_sec: number | null;   // délka cyklu rosiče; NULL u ručních zápisů
  note: string | null;
}

export interface SheddingEvent {
  id: number;
  gecko_id: number;
  ts: string;
  checked: 0 | 1;
  check_reminded: 0 | 1;
  note: string | null;
}

export interface CreateCareEventInput {
  category: CareCategory;
  count?: number;
  note?: string;
  ts?: string;
}

export interface CreateMistingInput {
  part_of_day: PartOfDay;
  done?: boolean;             // default true (rošeno); false = nerošeno
  source?: MistingSource;     // default 'manual'
  duration_sec?: number;      // délka cyklu v sekundách (rosič posílá 45)
  note?: string;
  ts?: string;
}

export interface CreateSheddingInput {
  ts?: string;
  note?: string;
}

export interface DayNote {
  id: number;
  date_prague: string;          // YYYY-MM-DD logický den
  gecko_id: number | null;      // null = obecná poznámka
  text: string;
  created_at: string;
}

export interface CreateDayNoteInput {
  date_prague?: string;         // default = dnešní logický den
  gecko_id?: number | null;
  text: string;
}
