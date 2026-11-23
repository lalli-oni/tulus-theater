import { describe, expect, it } from 'vitest';
import { computeProgress, suggestStatus, validateCurrent, watchedThrough } from './progress';
import type { ProgressSeason } from './progress';

const s = (seasonNumber: number, episodeCount: number | null, watched = false, tracked = true): ProgressSeason => ({ seasonNumber, episodeCount, watched, tracked });

describe('computeProgress', () => {
  it('handles seasons with different episode counts', () => {
    const r = computeProgress({ seasons: [s(1, 9, true), s(2, 10, true), s(3, 8)], currentSeason: null, currentEpisode: null });
    expect(r).toMatchObject({ watchedEpisodes: 19, totalEpisodes: 27, position: { season: 2, episode: 10 }, allTrackedWatched: false });
  });
  it('counts a partially watched current season', () => {
    const r = computeProgress({ seasons: [s(1, 9, true), s(2, 10)], currentSeason: 2, currentEpisode: 4 });
    expect(r).toMatchObject({ watchedEpisodes: 13, position: { season: 2, episode: 4 } });
  });
  it('clamps a current episode beyond the season length', () => {
    expect(computeProgress({ seasons: [s(1, 5)], currentSeason: 1, currentEpisode: 9 }).watchedEpisodes).toBe(5);
  });
  it('ignores specials unless they are tracked', () => {
    const base = [s(0, 3, true, false), s(1, 8, true)];
    expect(computeProgress({ seasons: base, currentSeason: null, currentEpisode: null }).totalEpisodes).toBe(8);
    const tracked = [s(0, 3, false, true), s(1, 8, true)];
    const r = computeProgress({ seasons: tracked, currentSeason: null, currentEpisode: null });
    expect(r.totalEpisodes).toBe(11);
    expect(r.allTrackedWatched).toBe(false);
  });
  it('ignores announced seasons with no episodes when judging "all watched"', () => {
    const r = computeProgress({ seasons: [s(1, 8, true), s(2, 0)], currentSeason: null, currentEpisode: null });
    expect(r.allTrackedWatched).toBe(true);
  });
  it('reports no position for an unstarted series', () => {
    const r = computeProgress({ seasons: [s(1, 8)], currentSeason: null, currentEpisode: null });
    expect(r).toMatchObject({ watchedEpisodes: 0, position: null, allTrackedWatched: false });
  });
  it('treats unknown episode counts as zero', () => {
    expect(computeProgress({ seasons: [s(1, null, true)], currentSeason: null, currentEpisode: null }).totalEpisodes).toBe(0);
  });
});

describe('validateCurrent', () => {
  const seasons = [s(1, 9), s(2, 10)];
  it('accepts valid pairs and clears', () => {
    expect(validateCurrent(seasons, 2, 4)).toBeNull();
    expect(validateCurrent(seasons, 2, null)).toBeNull();
    expect(validateCurrent(seasons, null, null)).toBeNull();
  });
  it('rejects an episode without a season, unknown seasons, and out-of-range episodes', () => {
    expect(validateCurrent(seasons, null, 3)).toMatch(/season/i);
    expect(validateCurrent(seasons, 5, null)).toMatch(/does not exist/);
    expect(validateCurrent(seasons, 1, 12)).toMatch(/only 9/);
    expect(validateCurrent(seasons, 1, 0)).toMatch(/start at 1/);
  });
  it('does not bound the episode when the season length is unknown', () => {
    expect(validateCurrent([s(3, null)], 3, 40)).toBeNull();
  });
});

describe('watchedThrough', () => {
  const seasons = [s(0, 2, false, false), s(1, 8), s(2, 8), s(3, 8)];
  it('marks seasons up to N and skips untracked ones', () => {
    expect(watchedThrough(seasons, 2)).toEqual([{ seasonNumber: 1, watched: true }, { seasonNumber: 2, watched: true }, { seasonNumber: 3, watched: false }]);
  });
  it('clears everything for null', () => {
    expect(watchedThrough(seasons, null).every((x) => !x.watched)).toBe(true);
  });
});

describe('suggestStatus', () => {
  const ended = { seasons: [s(1, 8, true), s(2, 8, true)], currentSeason: null, currentEpisode: null, tmdbStatus: 'Ended' };
  it('suggests Completed for a fully watched ended series, never for a returning one', () => {
    expect(suggestStatus({ ...ended, status: 'UP_TO_DATE' })?.status).toBe('COMPLETED');
    expect(suggestStatus({ ...ended, tmdbStatus: 'Returning Series', status: 'UP_TO_DATE' })).toBeNull();
  });
  it('does not nag about dropped, completed or on-wishlist-without-progress series', () => {
    expect(suggestStatus({ ...ended, status: 'DROPPED' })).toBeNull();
    expect(suggestStatus({ ...ended, status: 'COMPLETED' })).toBeNull();
    expect(suggestStatus({ seasons: [s(1, 8)], currentSeason: null, currentEpisode: null, tmdbStatus: 'Ended', status: 'WISHLIST' })).toBeNull();
  });
  it('suggests Watching when a wishlist series has progress', () => {
    expect(suggestStatus({ seasons: [s(1, 8)], currentSeason: 1, currentEpisode: 2, tmdbStatus: 'Ended', status: 'WISHLIST' })?.status).toBe('WATCHING');
  });
});
