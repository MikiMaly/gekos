import type {
  CareCategory,
  CareEvent,
  CreateCareEventInput,
  CreateMistingInput,
  CreateSheddingInput,
  Gecko,
  GeckoSlug,
  MistingEvent,
  SheddingEvent,
} from './types';

const BASE = '/api/geckos';

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  geckos: {
    list: () => req<{ geckos: Gecko[] }>(''),
    get: (slug: GeckoSlug) => req<{ gecko: Gecko }>(`/${slug}`),
    update: (slug: GeckoSlug, body: { rescue_mode?: boolean; notes?: string; birth_date?: string }) =>
      req<{ gecko: Gecko }>(`/${slug}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    events: {
      list: (slug: GeckoSlug, params?: { from?: string; to?: string; category?: CareCategory }) => {
        const qs = new URLSearchParams();
        if (params?.from) qs.set('from', params.from);
        if (params?.to) qs.set('to', params.to);
        if (params?.category) qs.set('category', params.category);
        const q = qs.toString();
        return req<{ events: CareEvent[] }>(`/${slug}/events${q ? `?${q}` : ''}`);
      },
      last: (slug: GeckoSlug) =>
        req<{ last: Record<CareCategory, CareEvent | null> }>(`/${slug}/events/last`),
      create: (slug: GeckoSlug, body: CreateCareEventInput) =>
        req<{ event: CareEvent }>(`/${slug}/events`, {
          method: 'POST',
          body: JSON.stringify(body),
        }),
      remove: (slug: GeckoSlug, id: number) =>
        req<{ deleted: number }>(`/${slug}/events?id=${id}`, { method: 'DELETE' }),
    },
    shedding: {
      list: (slug: GeckoSlug) =>
        req<{ events: SheddingEvent[] }>(`/${slug}/shedding`),
      create: (slug: GeckoSlug, body: CreateSheddingInput = {}) =>
        req<{ event: SheddingEvent }>(`/${slug}/shedding`, {
          method: 'POST',
          body: JSON.stringify(body),
        }),
      markChecked: (slug: GeckoSlug, id: number, checked = true) =>
        req<{ event: SheddingEvent }>(`/${slug}/shedding?id=${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ checked }),
        }),
      remove: (slug: GeckoSlug, id: number) =>
        req<{ deleted: number }>(`/${slug}/shedding?id=${id}`, { method: 'DELETE' }),
    },
  },
  misting: {
    list: (params?: { from?: string; to?: string }) => {
      const qs = new URLSearchParams();
      if (params?.from) qs.set('from', params.from);
      if (params?.to) qs.set('to', params.to);
      const q = qs.toString();
      return req<{ events: MistingEvent[] }>(`/misting${q ? `?${q}` : ''}`);
    },
    create: (body: CreateMistingInput) =>
      req<{ event: MistingEvent }>('/misting', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    remove: (id: number) =>
      req<{ deleted: number }>(`/misting?id=${id}`, { method: 'DELETE' }),
  },
  dashboard: () => req<DashboardResponse>('/dashboard'),
};

export interface DashboardGecko {
  gecko: Gecko;
  today_events: CareEvent[];
  last_event_per_category: Record<CareCategory, CareEvent | null>;
  last_shedding: SheddingEvent | null;
}

export interface DashboardResponse {
  date_prague: string;
  geckos: DashboardGecko[];
  misting_today: {
    rano: { latest_ts: string | null; latest_done: 0 | 1 | null };
    vecer: { latest_ts: string | null; latest_done: 0 | 1 | null };
    nahodne: { count: number; latest_ts: string | null };
  };
}
