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
  /** Every tracked season that has episodes is marked watched. */
  allTrackedWatched: boolean;
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
  return {
    watchedEpisodes,
    totalEpisodes,
    position,
    allTrackedWatched: released.length > 0 && released.every((s) => s.watched),
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
 * Mark every tracked season up to and including `season` as watched and the rest as not watched.
 * `null` clears all progress. Seasons that are not tracked (e.g. specials) are left alone.
 */
export function watchedThrough(seasons: ProgressSeason[], season: number | null): Array<{ seasonNumber: number; watched: boolean }> {
  return seasons.filter((s) => s.tracked).map((s) => ({ seasonNumber: s.seasonNumber, watched: season !== null && s.seasonNumber <= season }));
}

export interface StatusSuggestion { status: SeriesStatus; reason: string }

/**
 * A gentle hint only. The app never changes the personal status by itself; the UI
 * offers this as a one-click prompt.
 */
export function suggestStatus(input: ProgressInput & { status: SeriesStatus; tmdbStatus: string | null }): StatusSuggestion | null {
  const progress = computeProgress(input);
  if (input.status === 'WISHLIST' && progress.watchedEpisodes > 0) {
    return { status: 'WATCHING', reason: 'You have recorded progress on this series.' };
  }
  const ended = input.tmdbStatus === 'Ended' || input.tmdbStatus === 'Canceled';
  if (ended && progress.allTrackedWatched && ['WATCHING', 'UP_TO_DATE', 'ON_HOLD'].includes(input.status)) {
    return { status: 'COMPLETED', reason: 'Every season is watched and the series has ended.' };
  }
  return null;
}
