import { describe, expect, it } from 'vitest';
import { advanceOne, autoStatus, computeProgress, nextEpisode, validateCurrent, watchedThrough } from './progress';
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
  it('leaves tracked specials alone unless clearing', () => {
    const withSpecials = [s(0, 2, true, true), s(1, 8), s(2, 8)];
    expect(watchedThrough(withSpecials, 1).map((x) => x.seasonNumber)).toEqual([1, 2]);
    expect(watchedThrough(withSpecials, null).map((x) => x.seasonNumber)).toEqual([0, 1, 2]);
  });
});

describe('nextEpisode / advanceOne', () => {
  const input = (seasons: ProgressSeason[], currentSeason: number | null = null, currentEpisode: number | null = null) => ({ seasons, currentSeason, currentEpisode });

  it('starts at S01E01 and then continues within the season', () => {
    expect(nextEpisode(input([s(1, 3), s(2, 5)]))).toEqual({ season: 1, episode: 1, lastOfSeason: false });
    expect(advanceOne(input([s(1, 3)]))).toMatchObject({ currentSeason: 1, currentEpisode: 1, watchedSeasons: [] });
    expect(nextEpisode(input([s(1, 3)], 1, 1))).toMatchObject({ season: 1, episode: 2 });
  });
  it('marks the season watched on its last episode and moves on to the next season', () => {
    const r = advanceOne(input([s(1, 3), s(2, 5)], 1, 2));
    expect(r).toMatchObject({ watchedSeasons: [1], currentSeason: null, currentEpisode: null, episode: { season: 1, episode: 3 } });
    expect(nextEpisode(input([s(1, 3, true), s(2, 5)]))).toMatchObject({ season: 2, episode: 1 });
  });
  it('works with uneven season lengths and one-episode seasons', () => {
    expect(advanceOne(input([s(1, 1), s(2, 24)]))).toMatchObject({ watchedSeasons: [1] });
  });
  it('offers specials only after the regular seasons', () => {
    const seasons = [s(0, 2), s(1, 3, true)];
    expect(nextEpisode(input(seasons))).toMatchObject({ season: 0, episode: 1 });
    expect(nextEpisode(input([s(0, 2), s(1, 3)]))).toMatchObject({ season: 1, episode: 1 });
  });
  it('returns null when everything is watched, nothing is tracked, or counts are unknown', () => {
    expect(nextEpisode(input([s(1, 3, true)]))).toBeNull();
    expect(nextEpisode(input([s(1, 3, false, false)]))).toBeNull();
    expect(nextEpisode(input([s(1, null)]))).toBeNull();
    expect(advanceOne(input([s(1, 3, true)]))).toBeNull();
  });
  it('continues from an explicit current position even when earlier seasons are not ticked', () => {
    expect(nextEpisode(input([s(1, 9), s(2, 10)], 2, 4))).toMatchObject({ season: 2, episode: 5 });
  });
  it('stops at an episode that has not aired yet', () => {
    const aired = (season: number, episode: number) => !(season === 2 && episode >= 4);
    expect(nextEpisode(input([s(1, 3, true), s(2, 8)], 2, 2), aired)).toMatchObject({ season: 2, episode: 3 });
    expect(nextEpisode(input([s(1, 3, true), s(2, 8)], 2, 3), aired)).toBeNull();
  });
});

describe('autoStatus', () => {
  const base = { currentSeason: null, currentEpisode: null };
  it('moves Wishlist to Watching once something is watched', () => {
    expect(autoStatus({ ...base, seasons: [s(1, 8)], currentSeason: 1, currentEpisode: 1, status: 'WISHLIST', tmdbStatus: 'Returning Series' })?.status).toBe('WATCHING');
  });
  it('does nothing when nothing is watched', () => {
    expect(autoStatus({ ...base, seasons: [s(1, 8)], status: 'WISHLIST', tmdbStatus: 'Ended' })).toBeNull();
  });
  it('picks Up to date for a returning series and Completed for an ended one', () => {
    const seasons = [s(1, 8, true)];
    expect(autoStatus({ ...base, seasons, status: 'WATCHING', tmdbStatus: 'Returning Series' })?.status).toBe('UP_TO_DATE');
    expect(autoStatus({ ...base, seasons, status: 'WATCHING', tmdbStatus: 'Ended' })?.status).toBe('COMPLETED');
    expect(autoStatus({ ...base, seasons, status: 'WATCHING', tmdbStatus: 'Canceled' })?.status).toBe('COMPLETED');
  });
  it('does not let specials hold back Up to date', () => {
    expect(autoStatus({ ...base, seasons: [s(0, 3), s(1, 8, true)], status: 'WATCHING', tmdbStatus: 'Returning Series' })?.status).toBe('UP_TO_DATE');
  });
  it('returns to Watching when Up to date has episodes left, and revives On hold or Dropped', () => {
    const seasons = [s(1, 8, true), s(2, 8)];
    expect(autoStatus({ ...base, seasons, status: 'UP_TO_DATE', tmdbStatus: 'Returning Series' })?.status).toBe('WATCHING');
    expect(autoStatus({ ...base, seasons, status: 'ON_HOLD', tmdbStatus: 'Returning Series' })?.status).toBe('WATCHING');
    expect(autoStatus({ ...base, seasons, status: 'DROPPED', tmdbStatus: 'Returning Series' })?.status).toBe('WATCHING');
  });
  it('leaves Completed and an already-correct status alone', () => {
    expect(autoStatus({ ...base, seasons: [s(1, 8, true), s(2, 8)], status: 'COMPLETED', tmdbStatus: 'Ended' })).toBeNull();
    expect(autoStatus({ ...base, seasons: [s(1, 8, true), s(2, 8)], status: 'WATCHING', tmdbStatus: 'Ended' })).toBeNull();
  });
});
