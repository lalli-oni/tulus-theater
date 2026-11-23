import { prisma } from '../db.js';
import { config } from '../config.js';

const BASE = 'https://api.themoviedb.org/3';

export class TmdbError extends Error {
  constructor(public code: 'not_configured' | 'unavailable' | 'not_found', message: string) {
    super(message);
  }
}

export interface CacheStore {
  get(key: string): Promise<{ payload: string; fetchedAt: Date } | null>;
  set(key: string, payload: string, fetchedAt: Date): Promise<void>;
}

export const prismaCache: CacheStore = {
  async get(key) {
    return prisma.tmdbCache.findUnique({ where: { key } });
  },
  async set(key, payload, fetchedAt) {
    await prisma.tmdbCache.upsert({ where: { key }, create: { key, payload, fetchedAt }, update: { payload, fetchedAt } });
  },
};

export interface TmdbClientOptions {
  apiKey: string;
  cache: CacheStore;
  fetchImpl?: typeof fetch;
  now?: () => Date;
  /** Wait between a 429 and its single retry. */
  sleep?: (ms: number) => Promise<void>;
}

export interface TmdbResult<T> { data: T; stale: boolean }

export function createTmdbClient(opts: TmdbClientOptions) {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const now = opts.now ?? (() => new Date());
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));

  // v4 read tokens are long JWTs; v3 keys are 32 hex chars.
  const isBearer = opts.apiKey.length > 40;

  async function request(path: string, params: Record<string, string>): Promise<unknown> {
    const url = new URL(BASE + path);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    if (!isBearer) url.searchParams.set('api_key', opts.apiKey);
    const headers: Record<string, string> = { accept: 'application/json' };
    if (isBearer) headers.authorization = `Bearer ${opts.apiKey}`;

    for (let attempt = 0; ; attempt++) {
      let res: Response;
      try {
        res = await fetchImpl(url, { headers, signal: AbortSignal.timeout(10_000) });
      } catch {
        throw new TmdbError('unavailable', 'Could not reach TMDB');
      }
      if (res.status === 429 && attempt === 0) {
        const wait = Math.min(Number(res.headers.get('retry-after') ?? 1), 10) * 1000;
        await sleep(wait);
        continue;
      }
      if (res.status === 404) throw new TmdbError('not_found', 'TMDB has no such title');
      if (!res.ok) throw new TmdbError('unavailable', `TMDB responded with ${res.status}`);
      return res.json();
    }
  }

  /**
   * GET with a cache. A fresh cache entry avoids the network; if the network fails,
   * any cached entry (however old) is returned with stale=true.
   */
  async function get(path: string, params: Record<string, string> = {}, ttlMs = 60 * 60 * 1000): Promise<TmdbResult<unknown>> {
    if (!opts.apiKey) throw new TmdbError('not_configured', 'TMDB_API_KEY is not set');
    const sorted = Object.entries({ language: 'en-US', ...params }).sort(([a], [b]) => a.localeCompare(b));
    const key = `${path}?${sorted.map(([k, v]) => `${k}=${v}`).join('&')}`;
    const cached = await opts.cache.get(key);
    if (cached && now().getTime() - cached.fetchedAt.getTime() < ttlMs) {
      return { data: JSON.parse(cached.payload), stale: false };
    }
    try {
      const data = await request(path, Object.fromEntries(sorted));
      await opts.cache.set(key, JSON.stringify(data), now());
      return { data, stale: false };
    } catch (e) {
      if (e instanceof TmdbError && e.code === 'unavailable' && cached) {
        return { data: JSON.parse(cached.payload), stale: true };
      }
      throw e;
    }
  }

  return { get };
}

export type TmdbClient = ReturnType<typeof createTmdbClient>;

let shared: TmdbClient | null = null;
export function tmdb(): TmdbClient {
  shared ??= createTmdbClient({ apiKey: config.tmdbApiKey, cache: prismaCache });
  return shared;
}
