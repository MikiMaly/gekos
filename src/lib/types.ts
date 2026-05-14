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

export interface CreateSheddingInput {
  ts?: string;
  note?: string;
}

export interface CreateCareEventInput {
  category: CareCategory;
  count?: number;     // default 1 server-side
  note?: string;
  ts?: string;        // default now server-side
}

export interface CreateMistingInput {
  part_of_day: PartOfDay;
  note?: string;
  ts?: string;
}

export interface Env {
  DB: D1Database;
}
