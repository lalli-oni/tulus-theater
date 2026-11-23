import type { SeriesStatus } from './index';

/**
 * Pure season-progress and status rules, shared by server and web.
 * No episode checkboxes: progress is whole seasons watched plus an optional
 * current season and episode for a partially watched season.
 */

export interface ProgressSeason {
  seasonNumber: number;
  episodeCount: number | null;
  watched: boolean;
  tracked: boolean;
}

export interface ProgressInput {
  seasons: ProgressSeason[];
  currentSeason: number | null;
  currentEpisode: number | null;
}

export interface ProgressSummary {
  watchedEpisodes: number;
  totalEpisodes: number;
  /** Latest known position, for display like S02E04. Null when nothing is watched. */
  position: { season: number; episode: number } | null;
  /** Every tracked season that has episodes is marked watched, specials included. */
  allTrackedWatched: boolean;
  /** Every tracked regular season (not specials) with episodes is watched. Drives automatic status. */
  mainWatched: boolean;
}

const count = (s: ProgressSeason) => s.episodeCount ?? 0;

export function computeProgress(p: ProgressInput): ProgressSummary {
  const tracked = p.seasons.filter((s) => s.tracked).sort((a, b) => a.seasonNumber - b.seasonNumber);
  let watchedEpisodes = 0;
  let totalEpisodes = 0;
  let position: ProgressSummary['position'] = null;

  for (const s of tracked) {
    totalEpisodes += count(s);
    if (s.watched) {
      watchedEpisodes += count(s);
      if (count(s) > 0 && (position === null || s.seasonNumber > position.season)) {
        position = { season: s.seasonNumber, episode: count(s) };
      }
    } else if (s.seasonNumber === p.currentSeason && p.currentEpisode) {
      const e = s.episodeCount ? Math.min(p.currentEpisode, s.episodeCount) : p.currentEpisode;
      watchedEpisodes += e;
      if (position === null || s.seasonNumber >= position.season) position = { season: s.seasonNumber, episode: e };
    }
  }

  const released = tracked.filter((s) => count(s) > 0);
  const mainReleased = released.filter((s) => s.seasonNumber !== 0);
  return {
    watchedEpisodes,
    totalEpisodes,
    position,
    allTrackedWatched: released.length > 0 && released.every((s) => s.watched),
    mainWatched: mainReleased.length > 0 && mainReleased.every((s) => s.watched),
  };
}

/** Error message if the current season/episode pair is not valid for these seasons, else null. */
export function validateCurrent(seasons: ProgressSeason[], season: number | null, episode: number | null): string | null {
  if (season === null) return episode === null ? null : 'Set a current season before a current episode';
  const s = seasons.find((x) => x.seasonNumber === season);
  if (!s) return `Season ${season} does not exist for this series`;
  if (episode !== null) {
    if (episode < 1) return 'Episode numbers start at 1';
    if (s.episodeCount && episode > s.episodeCount) return `Season ${season} has only ${s.episodeCount} episodes`;
  }
  return null;
}

/**
 * Mark every tracked regular season up to and including `season` as watched and the rest as not watched.
 * Specials (season 0) are left alone because "through season N" says nothing about them.
 * `null` clears all progress, specials included. Untracked seasons are never touched.
 */
export function watchedThrough(seasons: ProgressSeason[], season: number | null): Array<{ seasonNumber: number; watched: boolean }> {
  return seasons
    .filter((s) => s.tracked && (season === null || s.seasonNumber !== 0))
    .map((s) => ({ seasonNumber: s.seasonNumber, watched: season !== null && s.seasonNumber <= season }));
}

export interface NextEpisode { season: number; episode: number; lastOfSeason: boolean }

/**
 * The next unwatched episode in viewing order. Regular seasons come first;
 * tracked specials are offered only once the regular seasons are done.
 * `isAired` lets the caller skip episodes that have not aired yet.
 */
export function nextEpisode(p: ProgressInput, isAired: (season: number, episode: number) => boolean = () => true): NextEpisode | null {
  const candidates = (seasons: ProgressSeason[]): NextEpisode | null => {
    for (const s of seasons) {
      if (s.watched || !s.episodeCount) continue;
      const start = s.seasonNumber === p.currentSeason && p.currentEpisode ? p.currentEpisode + 1 : 1;
      if (start > s.episodeCount) continue;
      if (!isAired(s.seasonNumber, start)) return null; // viewing order: do not skip past an unaired episode
      return { season: s.seasonNumber, episode: start, lastOfSeason: start >= s.episodeCount };
    }
    return null;
  };
  const tracked = p.seasons.filter((x) => x.tracked).sort((a, b) => a.seasonNumber - b.seasonNumber);
  // An explicit current position wins, even if earlier seasons were never ticked off.
  const current = p.currentSeason !== null && p.currentEpisode ? tracked.filter((x) => x.seasonNumber === p.currentSeason) : [];
  return candidates(current) ?? candidates(tracked.filter((x) => x.seasonNumber !== 0)) ?? candidates(tracked.filter((x) => x.seasonNumber === 0));
}

export interface AdvanceResult {
  /** Seasons newly completed by this step. */
  watchedSeasons: number[];
  currentSeason: number | null;
  currentEpisode: number | null;
  episode: { season: number; episode: number };
}

/** Mark the next episode watched. Finishing a season marks it watched and clears the partial pointer. */
export function advanceOne(p: ProgressInput, isAired?: (season: number, episode: number) => boolean): AdvanceResult | null {
  const next = nextEpisode(p, isAired);
  if (!next) return null;
  const episode = { season: next.season, episode: next.episode };
  return next.lastOfSeason
    ? { watchedSeasons: [next.season], currentSeason: null, currentEpisode: null, episode }
    : { watchedSeasons: [], currentSeason: next.season, currentEpisode: next.episode, episode };
}

export interface AutoStatusResult { status: SeriesStatus; reason: string }

/**
 * Status that follows from the couple's own progress actions. Returns null when the
 * status should stay as it is. Never derived from TMDB changes alone.
 * Specials do not hold back Up to date or Completed.
 */
export function autoStatus(input: ProgressInput & { status: SeriesStatus; tmdbStatus: string | null }): AutoStatusResult | null {
  const progress = computeProgress(input);
  if (progress.watchedEpisodes === 0) return null;
  const ended = input.tmdbStatus === 'Ended' || input.tmdbStatus === 'Canceled';
  const target: SeriesStatus = progress.mainWatched ? (ended ? 'COMPLETED' : 'UP_TO_DATE') : 'WATCHING';
  if (target === input.status) return null;
  // Completed is final: further ticks never reopen it.
  if (input.status === 'COMPLETED') return null;
  const reason =
    target === 'COMPLETED' ? 'Every season is watched and the series has ended.'
    : target === 'UP_TO_DATE' ? 'You have watched everything released so far.'
    : input.status === 'WISHLIST' ? 'You started watching it.'
    : 'There are episodes left to watch.';
  return { status: target, reason };
}
