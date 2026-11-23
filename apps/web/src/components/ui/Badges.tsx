import { Icon } from './Icon';
import { Moon } from './Ornaments';
import type { IconName, MoonPhase, MovieStatusKey, Person, ReleaseState, SeriesStatusKey } from './types';
import { cx } from './types';

type Tone = 'violet' | 'emerald' | 'amber' | 'silver' | 'rose';
interface StatusDef { label: string; tone: Tone; moon: MoonPhase; live?: boolean }

export const SERIES_STATUS: Record<SeriesStatusKey, StatusDef> = {
  wishlist: { label: 'Wishlist', tone: 'violet', moon: 'new' },
  watching: { label: 'Watching', tone: 'emerald', moon: 'waxing-crescent', live: true },
  'up-to-date': { label: 'Up to date', tone: 'emerald', moon: 'waxing-gibbous' },
  'on-hold': { label: 'On hold', tone: 'amber', moon: 'first-quarter' },
  completed: { label: 'Completed', tone: 'silver', moon: 'full' },
  dropped: { label: 'Dropped', tone: 'rose', moon: 'waning-crescent' },
};

export const MOVIE_STATUS: Record<MovieStatusKey, StatusDef> = {
  wishlist: { label: 'Wishlist', tone: 'violet', moon: 'new' },
  watched: { label: 'Watched', tone: 'emerald', moon: 'full' },
  dropped: { label: 'Dropped', tone: 'rose', moon: 'waning-crescent' },
};

export interface StatusBadgeProps {
  kind?: 'series' | 'movie';
  status: SeriesStatusKey | MovieStatusKey;
  className?: string;
}

/** Personal watching status. Always states the status in words; colour and moon reinforce it. */
export function StatusBadge({ kind = 'series', status, className }: StatusBadgeProps) {
  const map: Record<string, StatusDef> = kind === 'movie' ? MOVIE_STATUS : SERIES_STATUS;
  const s = map[status] ?? { label: String(status), tone: 'silver' as Tone, moon: 'full' as MoonPhase };
  return (
    <span className={cx('tt-badge', `tt-tone-${s.tone}`, className)}>
      {s.live ? <span className="tt-live-dot" aria-hidden="true" /> : <Moon phase={s.moon} size={12} />}
      {s.label}
    </span>
  );
}

const RELEASE: Record<ReleaseState, { label: string; icon: IconName; cls: string }> = {
  returning: { label: 'Returning', icon: 'returning', cls: 'returning' },
  ended: { label: 'Ended', icon: 'ended', cls: 'ended' },
  canceled: { label: 'Canceled', icon: 'x', cls: 'canceled' },
  'in-production': { label: 'In production', icon: 'production', cls: 'production' },
};

/** TMDB release state. Outlined and quieter than the personal status. */
export function ReleaseBadge({ state, className }: { state: ReleaseState; className?: string }) {
  const r = RELEASE[state] ?? { label: String(state), icon: 'info' as IconName, cls: 'ended' };
  return (
    <span className={cx('tt-badge', 'tt-release', `tt-release-${r.cls}`, className)} title="TMDB release state">
      <Icon name={r.icon} size={12} strokeWidth={1.75} />
      <span className="tt-sr-only">Release state: </span>
      {r.label}
    </span>
  );
}

const PEOPLE: Record<Person, { name: string; mark: string }> = {
  alecha: { name: 'Alecha', mark: 'A' },
  lalli: { name: 'Lalli', mark: 'L' },
  unknown: { name: 'Unknown', mark: '?' },
};

export function AddedByBadge({ person = 'unknown', compact, className }: { person?: Person; compact?: boolean; className?: string }) {
  const key: Person = person in PEOPLE ? person : 'unknown';
  const p = PEOPLE[key];
  const label = `Added by ${p.name}`;
  return (
    <span className={cx('tt-added', `tt-who-${key}`, compact && 'tt-added-compact', className)} title={label}>
      <span className="tt-sigil-dot" aria-hidden="true">{p.mark}</span>
      {compact ? <span className="tt-sr-only">{label}</span> : (<><span className="tt-sr-only">Added by </span>{p.name}</>)}
    </span>
  );
}

export function NewEpisodesBadge({ count, className }: { count?: number; className?: string }) {
  const text = count == null ? 'New episodes' : count === 1 ? '1 new' : `${count} new`;
  const full = count == null ? 'New episodes' : `${count} ${count === 1 ? 'new episode' : 'new episodes'}`;
  return (
    <span className={cx('tt-new', className)} title={full}>
      <span aria-hidden="true">{text}</span>
      <span className="tt-sr-only">{full}</span>
    </span>
  );
}
