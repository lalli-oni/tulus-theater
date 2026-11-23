import { describe, expect, it } from 'vitest';
import { formatRuntime, movieStatusKey, personKey, releaseState, seriesStatusKey } from './ui-mapping';

describe('ui mapping', () => {
  it('converts API enums to design-system keys', () => {
    expect(seriesStatusKey('UP_TO_DATE')).toBe('up-to-date');
    expect(seriesStatusKey('ON_HOLD')).toBe('on-hold');
    expect(seriesStatusKey('WATCHING')).toBe('watching');
    expect(movieStatusKey('WATCHED')).toBe('watched');
    expect(personKey('UNKNOWN')).toBe('unknown');
  });
  it('maps TMDB release status, leaving unknown values unset', () => {
    expect(releaseState('Returning Series')).toBe('returning');
    expect(releaseState('Planned')).toBe('in-production');
    expect(releaseState('Something New')).toBeUndefined();
    expect(releaseState(null)).toBeUndefined();
  });
  it('formats runtimes', () => {
    expect(formatRuntime(136)).toBe('2h 16m');
    expect(formatRuntime(45)).toBe('45m');
    expect(formatRuntime(null)).toBeUndefined();
  });
});
