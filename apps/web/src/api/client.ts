import { HealthSchema } from '@tulu/shared';
import type {
  CreateMovieInput, CreateSeriesInput, GenreDTO, Health, MediaKind, MovieDTO, SeriesDTO,
  TmdbSearchResponse, UpdateMovieInput, UpdateSeasonInput, UpdateSeriesInput,
} from '@tulu/shared';

export class ApiRequestError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { method, headers: body ? { 'content-type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiRequestError(0, 'The local server is not responding.');
  }
  if (res.status === 204) return undefined as T;
  const json = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
  if (!res.ok) throw new ApiRequestError(res.status, json.error ?? `Request failed (${res.status})`, json.code);
  return json as T;
}

const qs = (p: Record<string, string | number | undefined>) => {
  const e = Object.entries(p).filter(([, v]) => v !== undefined && v !== '');
  return e.length ? `?${new URLSearchParams(e.map(([k, v]) => [k, String(v)])).toString()}` : '';
};

export interface ListParams { q?: string; status?: string; genre?: number; addedBy?: string }

export const api = {
  health: async (): Promise<Health> => HealthSchema.parse(await request('GET', '/api/health')),
  genres: () => request<GenreDTO[]>('GET', '/api/genres'),
  search: (kind: MediaKind, q: string) => request<TmdbSearchResponse>('GET', `/api/tmdb/search${qs({ kind, q })}`),
  series: {
    list: (p: ListParams = {}) => request<SeriesDTO[]>('GET', `/api/series${qs({ ...p })}`),
    create: (b: CreateSeriesInput) => request<SeriesDTO>('POST', '/api/series', b),
    update: (id: number, b: UpdateSeriesInput) => request<SeriesDTO>('PATCH', `/api/series/${id}`, b),
    remove: (id: number) => request<void>('DELETE', `/api/series/${id}`),
    updateSeason: (id: number, season: number, b: UpdateSeasonInput) => request<SeriesDTO>('PATCH', `/api/series/${id}/seasons/${season}`, b),
    watchedThrough: (id: number, season: number | null) => request<SeriesDTO>('POST', `/api/series/${id}/watched-through`, { season }),
  },
  movies: {
    list: (p: ListParams = {}) => request<MovieDTO[]>('GET', `/api/movies${qs({ ...p })}`),
    create: (b: CreateMovieInput) => request<MovieDTO>('POST', '/api/movies', b),
    update: (id: number, b: UpdateMovieInput) => request<MovieDTO>('PATCH', `/api/movies/${id}`, b),
    remove: (id: number) => request<void>('DELETE', `/api/movies/${id}`),
  },
};
