import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createApp } from '../app.js';
import { prisma } from '../db.js';

const tvDetails = {
  id: 95396, name: 'Severance', overview: 'x', poster_path: '/s.jpg', status: 'Returning Series',
  number_of_seasons: 2, number_of_episodes: 19, episode_run_time: [50], genres: [{ id: 18, name: 'Drama' }],
  seasons: [{ season_number: 0, name: 'Specials', episode_count: 2 }, { season_number: 1, name: 'Season 1', episode_count: 9 }],
};
const movieDetails = { id: 603, title: 'The Matrix', overview: 'y', release_date: '1999-03-31', runtime: 136, genres: [{ id: 28, name: 'Action' }] };

const tmdbGet = vi.fn();
vi.mock('../services/tmdb.js', async (orig) => {
  const actual = await orig<typeof import('../services/tmdb.js')>();
  return { ...actual, tmdb: () => ({ get: tmdbGet }) };
});

let server: Server;
let base: string;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function api(method: string, path: string, body?: unknown): Promise<{ status: number; body: any }> {
  const res = await fetch(base + path, { method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, body: res.status === 204 ? null : await res.json() };
}

beforeEach(async () => {
  await prisma.series.deleteMany();
  await prisma.movie.deleteMany();
  await prisma.appSetting.deleteMany();
  tmdbGet.mockReset();
  tmdbGet.mockImplementation(async (path: string) => {
    if (path === '/tv/95396') return { data: tvDetails, stale: false };
    if (path === '/movie/603') return { data: movieDetails, stale: false };
    if (path === '/search/tv') return { data: { results: [{ id: 95396, name: 'Severance', first_air_date: '2022-02-18' }, { id: 1, name: 'Other' }] }, stale: false };
    throw new Error(`unexpected ${path}`);
  });
  server?.close();
  await new Promise<void>((r) => { server = createApp().listen(0, '127.0.0.1', () => r()); });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

describe('series API', () => {
  it('adds a series from TMDB with genres and seasons, specials tracked', async () => {
    const r = await api('POST', '/api/series', { tmdbId: 95396, addedBy: 'LALLI', suggestedBy: 'Sam' });
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ title: 'Severance', status: 'WISHLIST', addedBy: 'LALLI', suggestedBy: 'Sam', episodeRuntime: 50 });
    expect(r.body.genres).toEqual([{ id: 18, name: 'Drama' }]);
    expect(r.body.seasons.map((s: { seasonNumber: number; tracked: boolean }) => [s.seasonNumber, s.tracked])).toEqual([[0, true], [1, true]]);
  });

  it('rejects duplicates and invalid input', async () => {
    await api('POST', '/api/series', { tmdbId: 95396, addedBy: 'LALLI' });
    expect((await api('POST', '/api/series', { tmdbId: 95396, addedBy: 'LALLI' })).status).toBe(409);
    expect((await api('POST', '/api/series', { tmdbId: 5, addedBy: 'NOBODY' })).status).toBe(400);
  });

  it('edits personal fields only and filters by status, text and genre', async () => {
    const created = (await api('POST', '/api/series', { tmdbId: 95396, addedBy: 'ALECHA' })).body;
    const patched = await api('PATCH', `/api/series/${created.id}`, { status: 'WATCHING', notes: 'great', rating: 4.5 });
    expect(patched.body).toMatchObject({ status: 'WATCHING', notes: 'great', rating: 4.5, title: 'Severance' });
    expect((await api('PATCH', `/api/series/${created.id}`, { rating: 9 })).status).toBe(400);
    expect((await api('GET', '/api/series?status=WATCHING')).body).toHaveLength(1);
    expect((await api('GET', '/api/series?status=DROPPED')).body).toHaveLength(0);
    expect((await api('GET', '/api/series?q=sever')).body).toHaveLength(1);
    expect((await api('GET', '/api/series?genre=18')).body).toHaveLength(1);
    expect((await api('GET', '/api/series?genre=99')).body).toHaveLength(0);
  });

  it('deletes and then 404s', async () => {
    const created = (await api('POST', '/api/series', { tmdbId: 95396, addedBy: 'ALECHA' })).body;
    expect((await api('DELETE', `/api/series/${created.id}`)).status).toBe(204);
    expect((await api('GET', `/api/series/${created.id}`)).status).toBe(404);
  });
});

describe('movies API', () => {
  it('adds a movie, replaces tags, and keeps tags sorted', async () => {
    const created = (await api('POST', '/api/movies', { tmdbId: 603, addedBy: 'LALLI', status: 'WATCHED' })).body;
    expect(created).toMatchObject({ title: 'The Matrix', runtime: 136, status: 'WATCHED' });
    const patched = (await api('PATCH', `/api/movies/${created.id}`, { tags: ['sci-fi', 'classic', 'classic'] })).body;
    expect(patched.tags).toEqual(['classic', 'sci-fi']);
    expect((await api('PATCH', `/api/movies/${created.id}`, { tags: [] })).body.tags).toEqual([]);
  });

  it('rejects a series-only status', async () => {
    expect((await api('POST', '/api/movies', { tmdbId: 603, addedBy: 'LALLI', status: 'WATCHING' })).status).toBe(400);
  });
});

describe('TMDB search API', () => {
  it('marks titles already in the library', async () => {
    await api('POST', '/api/series', { tmdbId: 95396, addedBy: 'LALLI' });
    const r = await api('GET', '/api/tmdb/search?kind=tv&q=sev');
    expect(r.body.results.map((x: { tmdbId: number; inLibrary: boolean }) => [x.tmdbId, x.inLibrary])).toEqual([[95396, true], [1, false]]);
    expect((await api('GET', '/api/tmdb/search?kind=book&q=x')).status).toBe(400);
  });
});


describe('season progress API', () => {
  const tvWithSeasons = {
    ...tvDetails,
    status: 'Ended',
    seasons: [
      { season_number: 0, name: 'Specials', episode_count: 2 },
      { season_number: 1, name: 'Season 1', episode_count: 3 },
      { season_number: 2, name: 'Season 2', episode_count: 2 },
    ],
  };
  let id: number;
  const get = async () => (await api('GET', `/api/series/${id}`)).body;
  const flags = (series: { seasons: Array<{ seasonNumber: number; watched: boolean }> }) => Object.fromEntries(series.seasons.map((x) => [x.seasonNumber, x.watched]));

  beforeEach(async () => {
    tmdbGet.mockImplementation(async () => ({ data: tvWithSeasons, stale: false }));
    id = (await api('POST', '/api/series', { tmdbId: 95396, addedBy: 'ALECHA' })).body.id;
  });

  it('marks a season watched, and 404s for unknown seasons', async () => {
    const r = await api('PATCH', `/api/series/${id}/seasons/1`, { watched: true });
    expect(flags(r.body.series)[1]).toBe(true);
    expect(r.body.change).toMatchObject({ action: 'season', canUndo: true });
    expect((await api('PATCH', `/api/series/${id}/seasons/9`, { watched: true })).status).toBe(404);
  });

  it('validates the current season and episode', async () => {
    expect((await api('PATCH', `/api/series/${id}`, { currentSeason: 2, currentEpisode: 1 })).body).toMatchObject({ currentSeason: 2, currentEpisode: 1 });
    expect((await api('PATCH', `/api/series/${id}`, { currentEpisode: 99 })).status).toBe(400);
    expect((await api('PATCH', `/api/series/${id}`, { currentSeason: 7 })).status).toBe(400);
    expect((await api('PATCH', `/api/series/${id}`, { currentSeason: null })).body).toMatchObject({ currentSeason: null, currentEpisode: null });
  });

  it('watched-through marks seasons up to N and can clear', async () => {
    const r = await api('POST', `/api/series/${id}/watched-through`, { season: 1 });
    expect(flags(r.body.series)).toEqual({ 0: false, 1: true, 2: false });
    const cleared = await api('POST', `/api/series/${id}/watched-through`, { season: null });
    expect(Object.values(flags(cleared.body.series)).every((v) => !v)).toBe(true);
  });

  it('specials are tracked by default and can be opted out', async () => {
    expect((await get()).seasons[0].tracked).toBe(true);
    const r = await api('PATCH', `/api/series/${id}/seasons/0`, { tracked: false });
    expect(r.body.series.seasons[0].tracked).toBe(false);
  });

  it('filters by added by', async () => {
    expect((await api('GET', '/api/series?addedBy=ALECHA')).body).toHaveLength(1);
    expect((await api('GET', '/api/series?addedBy=UNKNOWN')).body).toHaveLength(0);
  });

  describe('watched-next', () => {
    it('advances one episode at a time, rolls into the next season, and moves Wishlist to Watching', async () => {
      let r = await api('POST', `/api/series/${id}/watched-next`);
      expect(r.body.series).toMatchObject({ currentSeason: 1, currentEpisode: 1, status: 'WATCHING' });
      expect(r.body.change.summary).toMatch(/Watched S01E01.*Status set to watching/);
      await api('POST', `/api/series/${id}/watched-next`);
      r = await api('POST', `/api/series/${id}/watched-next`); // S01E03 is the last: season completes
      expect(r.body.series).toMatchObject({ currentSeason: null, currentEpisode: null });
      expect(flags(r.body.series)[1]).toBe(true);
      r = await api('POST', `/api/series/${id}/watched-next`);
      expect(r.body.series).toMatchObject({ currentSeason: 2, currentEpisode: 1 });
    });

    it('sets Completed (and the date watched) when an ended series is finished, ignoring specials', async () => {
      for (let i = 0; i < 5; i++) await api('POST', `/api/series/${id}/watched-next`);
      const series = await get();
      expect(series.status).toBe('COMPLETED');
      expect(series.dateWatched).not.toBeNull();
      // Specials are still offered afterwards, without reopening Completed.
      const sp = await api('POST', `/api/series/${id}/watched-next`);
      expect(sp.body.change.summary).toMatch(/S00E01/);
      expect(sp.body.series.status).toBe('COMPLETED');
    });

    it('409s when nothing is left', async () => {
      await api('POST', `/api/series/${id}/watched-through`, { season: 2 });
      await api('PATCH', `/api/series/${id}/seasons/0`, { watched: true });
      expect((await api('POST', `/api/series/${id}/watched-next`)).status).toBe(409);
    });
  });

  describe('undo', () => {
    it('restores status, position, seasons and date watched exactly', async () => {
      const before = await get();
      const r = await api('POST', `/api/series/${id}/watched-through`, { season: 2 });
      expect(r.body.series.status).toBe('COMPLETED');
      const undo = await api('POST', `/api/changes/${r.body.change.id}/undo`);
      expect(undo.body).toMatchObject({ status: before.status, dateWatched: null, currentSeason: null });
      expect(Object.values(flags(undo.body)).every((v) => !v)).toBe(true);
      expect((await api('POST', `/api/changes/${r.body.change.id}/undo`)).status).toBe(409);
    });

    it('only the newest change of a series can be undone', async () => {
      const a = (await api('POST', `/api/series/${id}/watched-next`)).body.change;
      const b = (await api('POST', `/api/series/${id}/watched-next`)).body.change;
      expect((await api('POST', `/api/changes/${a.id}/undo`)).status).toBe(409);
      expect((await api('POST', `/api/changes/${b.id}/undo`)).body).toMatchObject({ currentSeason: 1, currentEpisode: 1 });
      expect((await api('POST', `/api/changes/${a.id}/undo`)).body).toMatchObject({ currentSeason: null, status: 'WISHLIST' });
    });

    it('lists recent changes with canUndo only on the newest', async () => {
      await api('POST', `/api/series/${id}/watched-next`);
      await api('POST', `/api/series/${id}/watched-next`);
      const list = (await api('GET', `/api/changes?seriesId=${id}`)).body;
      expect(list.map((c: { canUndo: boolean }) => c.canUndo)).toEqual([true, false]);
      expect(list[0].seriesTitle).toBe('Severance');
    });

    it('logs manual status changes so a mis-click can be undone', async () => {
      await api('PATCH', `/api/series/${id}`, { status: 'DROPPED' });
      const [c] = (await api('GET', `/api/changes?seriesId=${id}`)).body;
      expect(c.summary).toMatch(/dropped/);
      await api('POST', `/api/changes/${c.id}/undo`);
      expect((await get()).status).toBe('WISHLIST');
    });
  });

  describe('automation setting', () => {
    it('defaults to on and can be switched off, after which status stays manual', async () => {
      expect((await api('GET', '/api/settings')).body).toEqual({ automation: { progressStatus: true } });
      await api('PUT', '/api/settings', { automation: { progressStatus: false } });
      const r = await api('POST', `/api/series/${id}/watched-next`);
      expect(r.body.series).toMatchObject({ currentSeason: 1, currentEpisode: 1, status: 'WISHLIST' });
    });

    it('never overrides an explicit status choice made together with progress', async () => {
      const r = await api('PATCH', `/api/series/${id}`, { status: 'ON_HOLD', currentSeason: 1, currentEpisode: 2 });
      expect(r.body.status).toBe('ON_HOLD');
    });
  });
});
