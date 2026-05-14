export type GeckoSlug = 'bily' | 'bezovy' | 'hnedy';

export type CareCategory = 'cvrcci' | 'banan' | 'antib' | 'mast';

export type PartOfDay = 'rano' | 'vecer';

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
  given: 0 | 1;
  note: string | null;
}

export interface MistingEvent {
  id: number;
  ts: string;
  part_of_day: PartOfDay;
  done: 0 | 1;
  note: string | null;
}

export interface CreateCareEventInput {
  category: CareCategory;
  given: boolean;
  note?: string;
  ts?: string;
}

export interface CreateMistingInput {
  part_of_day: PartOfDay;
  done: boolean;
  note?: string;
  ts?: string;
}

export interface Env {
  DB: D1Database;
}
