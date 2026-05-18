export type GeckoSlug = 'bily' | 'bezovy' | 'hnedy';

export type CareCategory = 'cvrcci' | 'banan' | 'antib' | 'mast';

export type PartOfDay = 'rano' | 'vecer' | 'nahodne';

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
  done?: boolean;       // default true (rošeno); false = nerošeno
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
