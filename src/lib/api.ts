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

const BASE = '/api';

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
    list: () => req<{ geckos: Gecko[] }>('/geckos'),
    get: (slug: GeckoSlug) => req<{ gecko: Gecko }>(`/geckos/${slug}`),
    events: {
      list: (slug: GeckoSlug, params?: { from?: string; to?: string; category?: CareCategory }) => {
        const qs = new URLSearchParams();
        if (params?.from) qs.set('from', params.from);
        if (params?.to) qs.set('to', params.to);
        if (params?.category) qs.set('category', params.category);
        const q = qs.toString();
        return req<{ events: CareEvent[] }>(`/geckos/${slug}/events${q ? `?${q}` : ''}`);
      },
      last: (slug: GeckoSlug) =>
        req<{ last: Record<CareCategory, CareEvent | null> }>(`/geckos/${slug}/events/last`),
      create: (slug: GeckoSlug, body: CreateCareEventInput) =>
        req<{ event: CareEvent }>(`/geckos/${slug}/events`, {
          method: 'POST',
          body: JSON.stringify(body),
        }),
      remove: (slug: GeckoSlug, id: number) =>
        req<{ deleted: number }>(`/geckos/${slug}/events?id=${id}`, { method: 'DELETE' }),
    },
    shedding: {
      list: (slug: GeckoSlug) =>
        req<{ events: SheddingEvent[] }>(`/geckos/${slug}/shedding`),
      create: (slug: GeckoSlug, body: CreateSheddingInput = {}) =>
        req<{ event: SheddingEvent }>(`/geckos/${slug}/shedding`, {
          method: 'POST',
          body: JSON.stringify(body),
        }),
      markChecked: (slug: GeckoSlug, id: number, checked = true) =>
        req<{ event: SheddingEvent }>(`/geckos/${slug}/shedding?id=${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ checked }),
        }),
      remove: (slug: GeckoSlug, id: number) =>
        req<{ deleted: number }>(`/geckos/${slug}/shedding?id=${id}`, { method: 'DELETE' }),
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
    rano: { latest_ts: string | null };
    vecer: { latest_ts: string | null };
    nahodne: { count: number; latest_ts: string | null };
  };
}
