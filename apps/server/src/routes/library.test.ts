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
  it('adds a series from TMDB with genres and seasons, specials untracked', async () => {
    const r = await api('POST', '/api/series', { tmdbId: 95396, addedBy: 'LALLI', suggestedBy: 'Sam' });
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ title: 'Severance', status: 'WISHLIST', addedBy: 'LALLI', suggestedBy: 'Sam', episodeRuntime: 50 });
    expect(r.body.genres).toEqual([{ id: 18, name: 'Drama' }]);
    expect(r.body.seasons.map((s: { seasonNumber: number; tracked: boolean }) => [s.seasonNumber, s.tracked])).toEqual([[0, false], [1, true]]);
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
    seasons: [
      { season_number: 0, name: 'Specials', episode_count: 2 },
      { season_number: 1, name: 'Season 1', episode_count: 9 },
      { season_number: 2, name: 'Season 2', episode_count: 10 },
      { season_number: 3, name: 'Season 3', episode_count: 8 },
    ],
  };
  let id: number;
  beforeEach(async () => {
    tmdbGet.mockImplementation(async () => ({ data: tvWithSeasons, stale: false }));
    id = (await api('POST', '/api/series', { tmdbId: 95396, addedBy: 'ALECHA' })).body.id;
  });

  it('marks a season watched and reports it', async () => {
    const r = await api('PATCH', `/api/series/${id}/seasons/1`, { watched: true });
    expect(r.body.seasons.find((s: { seasonNumber: number }) => s.seasonNumber === 1).watched).toBe(true);
    expect((await api('PATCH', `/api/series/${id}/seasons/9`, { watched: true })).status).toBe(404);
  });

  it('validates the current season and episode', async () => {
    expect((await api('PATCH', `/api/series/${id}`, { currentSeason: 2, currentEpisode: 4 })).body).toMatchObject({ currentSeason: 2, currentEpisode: 4 });
    expect((await api('PATCH', `/api/series/${id}`, { currentEpisode: 99 })).status).toBe(400);
    expect((await api('PATCH', `/api/series/${id}`, { currentSeason: 7 })).status).toBe(400);
    expect((await api('PATCH', `/api/series/${id}`, { currentSeason: null })).body).toMatchObject({ currentSeason: null, currentEpisode: null });
  });

  it('clears the partial pointer when that season is marked watched', async () => {
    await api('PATCH', `/api/series/${id}`, { currentSeason: 2, currentEpisode: 4 });
    const r = await api('PATCH', `/api/series/${id}/seasons/2`, { watched: true });
    expect(r.body).toMatchObject({ currentSeason: null, currentEpisode: null });
  });

  it('marks watched-through a season, skipping untracked specials, and can clear', async () => {
    const r = await api('POST', `/api/series/${id}/watched-through`, { season: 2 });
    const flags = Object.fromEntries(r.body.seasons.map((s: { seasonNumber: number; watched: boolean }) => [s.seasonNumber, s.watched]));
    expect(flags).toEqual({ 0: false, 1: true, 2: true, 3: false });
    const cleared = await api('POST', `/api/series/${id}/watched-through`, { season: null });
    expect(cleared.body.seasons.every((s: { watched: boolean }) => !s.watched)).toBe(true);
  });

  it('lets specials be opted in', async () => {
    const r = await api('PATCH', `/api/series/${id}/seasons/0`, { tracked: true });
    expect(r.body.seasons.find((s: { seasonNumber: number }) => s.seasonNumber === 0).tracked).toBe(true);
  });

  it('does not change the personal status when progress changes', async () => {
    await api('POST', `/api/series/${id}/watched-through`, { season: 3 });
    expect((await api('GET', `/api/series/${id}`)).body.status).toBe('WISHLIST');
  });

  it('filters by added by', async () => {
    expect((await api('GET', '/api/series?addedBy=ALECHA')).body).toHaveLength(1);
    expect((await api('GET', '/api/series?addedBy=UNKNOWN')).body).toHaveLength(0);
  });
});
