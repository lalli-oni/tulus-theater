import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { SeriesDTO } from '@tulu/shared';
import { computeProgress, nextEpisode } from '@tulu/shared';
import { api } from '../api/client';
import { useRefreshSeries, useUndoToast, useWatchedNext } from '../lib/useProgressActions';
import { RecentChanges } from './RecentChanges';
import { Banner, Button, Input, Select } from './ui';

/**
 * Season-level progress. Every action saves immediately, so there is no "unsaved" state to lose.
 * No per-episode checkboxes: whole seasons plus an optional current season and episode.
 */
export function SeasonProgress({ series, onChange }: { series: SeriesDTO; onChange: (s: SeriesDTO) => void }) {
  const refresh = useRefreshSeries();
  const announce = useUndoToast();
  const [season, setSeason] = useState(series.currentSeason != null ? String(series.currentSeason) : '');
  const [episode, setEpisode] = useState(series.currentEpisode != null ? String(series.currentEpisode) : '');

  const apply = (s: SeriesDTO) => {
    onChange(s);
    setSeason(s.currentSeason != null ? String(s.currentSeason) : '');
    setEpisode(s.currentEpisode != null ? String(s.currentEpisode) : '');
    void refresh();
  };
  const watchNext = useWatchedNext(apply);

  const toggle = useMutation({
    mutationFn: (v: { season: number; watched?: boolean; tracked?: boolean }) => api.series.updateSeason(series.id, v.season, { watched: v.watched, tracked: v.tracked }),
    onSuccess: (r) => { apply(r.series); announce(r.change); },
  });
  const through = useMutation({ mutationFn: (n: number | null) => api.series.watchedThrough(series.id, n), onSuccess: (r) => { apply(r.series); announce(r.change); } });
  const position = useMutation({
    mutationFn: (v: { season: number | null; episode: number | null }) => api.series.update(series.id, { currentSeason: v.season, currentEpisode: v.episode }),
    onSuccess: apply,
  });

  const error = (toggle.error ?? through.error ?? position.error ?? watchNext.error) as Error | null;
  const progress = computeProgress(series);
  const real = series.seasons.filter((s) => s.seasonNumber !== 0);
  const specials = series.seasons.find((s) => s.seasonNumber === 0);
  const tracked = series.seasons.filter((s) => s.tracked && s.seasonNumber !== 0);

  if (series.seasons.length === 0) return <p className="text-text-secondary">No season information yet. It appears after the next TMDB refresh.</p>;

  const episodeNum = episode.trim() === '' ? null : Number(episode);
  const episodeBad = episodeNum !== null && (!Number.isInteger(episodeNum) || episodeNum < 1);
  const busy = toggle.isPending || through.isPending || position.isPending || watchNext.isPending;
  const next = nextEpisode(series);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-sans text-heading-sm">Season progress</h3>
        <span className="tt-mono text-text-muted">
          {progress.totalEpisodes > 0 ? `${progress.watchedEpisodes} of ${progress.totalEpisodes} episodes` : 'No episodes counted yet'}
          {progress.position ? ` · S${String(progress.position.season).padStart(2, '0')}E${String(progress.position.episode).padStart(2, '0')}` : ''}
        </span>
      </div>

      {next && (
        <div>
          <Button variant="secondary" icon="check" disabled={busy} onClick={() => watchNext.mutate(series.id)}>
            Watched S{String(next.season).padStart(2, '0')}E{String(next.episode).padStart(2, '0')}
          </Button>
        </div>
      )}

      <ul className="m-0 grid list-none gap-2 p-0" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))' }}>
        {real.map((s) => (
          <li key={s.seasonNumber}>
            <label className="flex cursor-pointer items-center gap-3 rounded-md border border-border-default bg-surface-sunken px-3 py-2 hover:bg-surface-hover">
              <input
                type="checkbox"
                className="h-4 w-4 accent-violet-500"
                checked={s.watched}
                disabled={busy}
                onChange={(e) => toggle.mutate({ season: s.seasonNumber, watched: e.target.checked })}
              />
              <span className="flex-1 text-label">{s.name ?? `Season ${s.seasonNumber}`}</span>
              <span className="tt-mono text-text-muted">{s.episodeCount ? `${s.episodeCount} ep` : 'TBA'}</span>
            </label>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-end gap-3">
        <Select
          label="Watched through"
          value=""
          disabled={busy}
          onChange={(e) => { if (e.target.value !== '') through.mutate(e.target.value === 'none' ? null : Number(e.target.value)); }}
          options={[{ value: '', label: 'Choose a season…' }, ...real.map((s) => ({ value: String(s.seasonNumber), label: `Season ${s.seasonNumber}` })), { value: 'none', label: 'Nothing yet' }]}
          className="w-52"
        />
        <Select
          label="Current season"
          value={season}
          disabled={busy}
          onChange={(e) => { setSeason(e.target.value); if (e.target.value === '') setEpisode(''); }}
          options={[{ value: '', label: 'None' }, ...tracked.filter((s) => !s.watched).map((s) => ({ value: String(s.seasonNumber), label: `Season ${s.seasonNumber}` }))]}
          className="w-44"
        />
        <Input
          label="Current episode"
          inputMode="numeric"
          value={episode}
          disabled={season === '' || busy}
          error={episodeBad ? 'Enter a whole number from 1' : undefined}
          onChange={(e) => setEpisode(e.target.value)}
          className="w-36"
        />
        <Button
          variant="outline"
          disabled={busy || episodeBad}
          onClick={() => position.mutate({ season: season === '' ? null : Number(season), episode: season === '' ? null : episodeNum })}
        >
          Set position
        </Button>
      </div>

      {specials && (
        <label className="flex cursor-pointer items-center gap-3 text-body-sm text-text-secondary">
          <input
            type="checkbox"
            className="h-4 w-4 accent-violet-500"
            checked={specials.tracked}
            disabled={busy}
            onChange={(e) => toggle.mutate({ season: 0, tracked: e.target.checked })}
          />
          Track specials ({specials.episodeCount ?? 0} episodes). Specials never hold back Up to date or Completed.
        </label>
      )}
      {specials?.tracked && (
        <label className="flex cursor-pointer items-center gap-3 text-body-sm">
          <input type="checkbox" className="h-4 w-4 accent-violet-500" checked={specials.watched} disabled={busy} onChange={(e) => toggle.mutate({ season: 0, watched: e.target.checked })} />
          Specials watched
        </label>
      )}
      <details className="text-body-sm">
        <summary className="cursor-pointer text-text-secondary">Recent changes</summary>
        <div className="mt-2"><RecentChanges seriesId={series.id} limit={6} onSeries={apply} /></div>
      </details>
      {error && <Banner tone="error" title="Could not update progress.">{error.message}</Banner>}
    </div>
  );
}
