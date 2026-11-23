import { describe, expect, it } from 'vitest';
import { mapMovieDetails, mapSearchResults, mapTvDetails, parseDate, posterUrl } from './tmdb-mapping.js';

describe('posterUrl / parseDate', () => {
  it('builds poster URLs and tolerates missing paths', () => {
    expect(posterUrl('/abc.jpg')).toBe('https://image.tmdb.org/t/p/w342/abc.jpg');
    expect(posterUrl(null)).toBeNull();
    expect(posterUrl('')).toBeNull();
  });
  it('parses TMDB dates as UTC and rejects junk', () => {
    expect(parseDate('2024-03-05')?.toISOString()).toBe('2024-03-05T00:00:00.000Z');
    expect(parseDate('')).toBeNull();
    expect(parseDate('not a date')).toBeNull();
    expect(parseDate(undefined)).toBeNull();
  });
});

describe('mapTvDetails', () => {
  const raw = {
    id: 95396,
    name: 'Severance',
    overview: 'Mark leads a team.',
    poster_path: '/s.jpg',
    status: 'Returning Series',
    number_of_seasons: 2,
    number_of_episodes: 19,
    episode_run_time: [],
    last_episode_to_air: { runtime: 52 },
    genres: [{ id: 18, name: 'Drama' }, { id: 'x', name: 'bad' }],
    next_episode_to_air: { air_date: '2027-01-17', season_number: 3, episode_number: 1 },
    seasons: [
      { season_number: 0, name: 'Specials', episode_count: 3, air_date: null },
      { season_number: 1, name: 'Season 1', episode_count: 9, air_date: '2022-02-18' },
      { season_number: 2, name: 'Season 2', episode_count: 10, air_date: '2025-01-17' },
    ],
  };
  it('maps core fields, keeping each season episode count', () => {
    const m = mapTvDetails(raw);
    expect(m).toMatchObject({ tmdbId: 95396, title: 'Severance', tmdbStatus: 'Returning Series', numberOfSeasons: 2, numberOfEpisodes: 19 });
    expect(m.seasons.map((s) => [s.seasonNumber, s.episodeCount])).toEqual([[0, 3], [1, 9], [2, 10]]);
  });
  it('drops malformed genres and falls back to last episode runtime', () => {
    const m = mapTvDetails(raw);
    expect(m.genres).toEqual([{ id: 18, name: 'Drama' }]);
    expect(m.episodeRuntime).toBe(52);
  });
  it('maps the next episode, and null when none is announced', () => {
    expect(mapTvDetails(raw)).toMatchObject({ nextEpisodeSeason: 3, nextEpisodeNumber: 1 });
    expect(mapTvDetails(raw).nextEpisodeAirDate?.toISOString()).toBe('2027-01-17T00:00:00.000Z');
    const m = mapTvDetails({ ...raw, next_episode_to_air: null });
    expect(m.nextEpisodeAirDate).toBeNull();
  });
  it('prefers episode_run_time when present', () => {
    expect(mapTvDetails({ ...raw, episode_run_time: [45, 60] }).episodeRuntime).toBe(45);
  });
  it('throws when the id is missing', () => {
    expect(() => mapTvDetails({ name: 'x' })).toThrow();
  });
});

describe('mapMovieDetails', () => {
  it('maps fields and treats a zero runtime as unknown', () => {
    const m = mapMovieDetails({ id: 1, title: 'Dredd', overview: '', release_date: '2012-09-07', runtime: 0, poster_path: null, genres: [] });
    expect(m).toMatchObject({ tmdbId: 1, title: 'Dredd', synopsis: null, runtime: null, posterUrl: null });
    expect(m.releaseDate?.toISOString()).toBe('2012-09-07T00:00:00.000Z');
  });
});

describe('mapSearchResults', () => {
  it('uses name/first_air_date for tv and title/release_date for movies, skipping unusable rows', () => {
    const tv = mapSearchResults({ results: [{ id: 1, name: 'Fringe', first_air_date: '2008-09-09' }, { id: 2 }, { name: 'no id' }] }, 'tv');
    expect(tv).toEqual([{ tmdbId: 1, title: 'Fringe', year: 2008, posterUrl: null, overview: null }]);
    const mv = mapSearchResults({ results: [{ id: 3, title: 'Oldboy', release_date: '' }] }, 'movie');
    expect(mv[0]).toMatchObject({ title: 'Oldboy', year: null });
  });
  it('handles a missing results array', () => {
    expect(mapSearchResults({}, 'tv')).toEqual([]);
  });
});
