export type IconName =
  | 'dashboard' | 'tv' | 'film' | 'star' | 'settings' | 'search' | 'x' | 'chevronDown' | 'check' | 'plus'
  | 'alert' | 'info' | 'grid' | 'list' | 'returning' | 'ended' | 'production' | 'undo';
export type MoonPhase =
  | 'new' | 'waxing-crescent' | 'first-quarter' | 'waxing-gibbous' | 'full'
  | 'waning-gibbous' | 'last-quarter' | 'waning-crescent';
export type SeriesStatusKey = 'wishlist' | 'watching' | 'up-to-date' | 'on-hold' | 'completed' | 'dropped';
export type MovieStatusKey = 'wishlist' | 'watched' | 'dropped';
export type ReleaseState = 'returning' | 'ended' | 'canceled' | 'in-production';
export type Person = 'alecha' | 'lalli' | 'unknown';
export interface Action { label: string; onClick?: () => void; icon?: IconName }

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
