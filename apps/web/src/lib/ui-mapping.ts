import type { AddedBy, MovieStatus, SeriesStatus } from '@tulu/shared';
import type { MovieStatusKey, Person, ReleaseState, SeriesStatusKey } from '../components/ui';

/** API values (UP_TO_DATE) to design-system keys (up-to-date). */
export const seriesStatusKey = (s: SeriesStatus): SeriesStatusKey => s.toLowerCase().replace(/_/g, '-') as SeriesStatusKey;
export const movieStatusKey = (s: MovieStatus): MovieStatusKey => s.toLowerCase() as MovieStatusKey;
export const personKey = (a: AddedBy): Person => a.toLowerCase() as Person;

export function releaseState(tmdbStatus: string | null): ReleaseState | undefined {
  switch (tmdbStatus) {
    case 'Returning Series': return 'returning';
    case 'Ended': return 'ended';
    case 'Canceled': return 'canceled';
    case 'In Production':
    case 'Planned':
    case 'Pilot': return 'in-production';
    default: return undefined;
  }
}

export const SERIES_STATUS_OPTIONS: Array<{ value: SeriesStatus; label: string }> = [
  { value: 'WISHLIST', label: 'Wishlist' },
  { value: 'WATCHING', label: 'Watching' },
  { value: 'UP_TO_DATE', label: 'Up to date' },
  { value: 'ON_HOLD', label: 'On hold' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'DROPPED', label: 'Dropped' },
];
export const MOVIE_STATUS_OPTIONS: Array<{ value: MovieStatus; label: string }> = [
  { value: 'WISHLIST', label: 'Wishlist' },
  { value: 'WATCHED', label: 'Watched' },
  { value: 'DROPPED', label: 'Dropped' },
];
export const ADDED_BY_OPTIONS: Array<{ value: AddedBy; label: string }> = [
  { value: 'ALECHA', label: 'Alecha' },
  { value: 'LALLI', label: 'Lalli' },
  { value: 'UNKNOWN', label: 'Unknown' },
];

export function formatRuntime(min: number | null): string | undefined {
  if (!min) return undefined;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
}
