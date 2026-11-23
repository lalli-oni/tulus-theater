import { describe, expect, it, vi } from 'vitest';
import { createTmdbClient, TmdbError } from './tmdb.js';
import type { CacheStore } from './tmdb.js';

function memoryCache(): CacheStore & { store: Map<string, { payload: string; fetchedAt: Date }> } {
  const store = new Map<string, { payload: string; fetchedAt: Date }>();
  return {
    store,
    async get(k) { return store.get(k) ?? null; },
    async set(k, payload, fetchedAt) { store.set(k, { payload, fetchedAt }); },
  };
}
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers });

describe('createTmdbClient', () => {
  it('refuses to run without an API key', async () => {
    const c = createTmdbClient({ apiKey: '', cache: memoryCache(), fetchImpl: vi.fn() });
    await expect(c.get('/search/tv', { query: 'x' })).rejects.toMatchObject({ code: 'not_configured' });
  });

  it('sends a v3 key as a query parameter and a v4 token as a bearer header', async () => {
    const f = vi.fn(async () => json({ ok: 1 }));
    await createTmdbClient({ apiKey: 'a'.repeat(32), cache: memoryCache(), fetchImpl: f }).get('/tv/1');
    const [url, init] = f.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.searchParams.get('api_key')).toBe('a'.repeat(32));
    expect((init.headers as Record<string, string>).authorization).toBeUndefined();

    const f2 = vi.fn(async () => json({ ok: 1 }));
    await createTmdbClient({ apiKey: 'b'.repeat(200), cache: memoryCache(), fetchImpl: f2 }).get('/tv/1');
    const [url2, init2] = f2.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url2.searchParams.get('api_key')).toBeNull();
    expect((init2.headers as Record<string, string>).authorization).toBe(`Bearer ${'b'.repeat(200)}`);
  });

  it('serves a fresh cache entry without calling the network', async () => {
    const cache = memoryCache();
    const f = vi.fn(async () => json({ n: 1 }));
    const c = createTmdbClient({ apiKey: 'k', cache, fetchImpl: f });
    await c.get('/tv/1');
    const second = await c.get('/tv/1');
    expect(second).toEqual({ data: { n: 1 }, stale: false });
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('falls back to stale cache when TMDB is unreachable', async () => {
    const cache = memoryCache();
    let t = new Date('2026-01-01T00:00:00Z');
    const f = vi.fn().mockResolvedValueOnce(json({ n: 1 })).mockRejectedValueOnce(new Error('offline'));
    const c = createTmdbClient({ apiKey: 'k', cache, fetchImpl: f, now: () => t });
    await c.get('/tv/1');
    t = new Date('2026-01-03T00:00:00Z');
    expect(await c.get('/tv/1')).toEqual({ data: { n: 1 }, stale: true });
  });

  it('throws when TMDB is unreachable and nothing is cached', async () => {
    const c = createTmdbClient({ apiKey: 'k', cache: memoryCache(), fetchImpl: vi.fn().mockRejectedValue(new Error('offline')) });
    await expect(c.get('/tv/1')).rejects.toBeInstanceOf(TmdbError);
  });

  it('retries once after a 429 and then succeeds', async () => {
    const sleep = vi.fn(async () => {});
    const f = vi.fn().mockResolvedValueOnce(json({}, 429, { 'retry-after': '2' })).mockResolvedValueOnce(json({ ok: true }));
    const c = createTmdbClient({ apiKey: 'k', cache: memoryCache(), fetchImpl: f, sleep });
    expect((await c.get('/tv/1')).data).toEqual({ ok: true });
    expect(sleep).toHaveBeenCalledWith(2000);
  });

  it('reports 404 as not_found and does not fall back to cache', async () => {
    const c = createTmdbClient({ apiKey: 'k', cache: memoryCache(), fetchImpl: vi.fn(async () => json({}, 404)) });
    await expect(c.get('/tv/999')).rejects.toMatchObject({ code: 'not_found' });
  });
});
