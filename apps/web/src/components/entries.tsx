import { useMutation, useQueryClient } from '@tanstack/react-query';
import { computeProgress, nextEpisode } from '@tulu/shared';
import type { MovieDTO, MovieStatus, SeriesDTO, SeriesStatus } from '@tulu/shared';
import { api } from '../api/client';
import { useUndoToast, useWatchedNext } from '../lib/useProgressActions';
import { Icon, PosterCard } from './ui';
import { MOVIE_STATUS_OPTIONS, SERIES_STATUS_OPTIONS, formatRuntime, movieStatusKey, personKey, releaseState, seriesStatusKey } from '../lib/ui-mapping';

export type Entry = { kind: 'series'; item: SeriesDTO } | { kind: 'movie'; item: MovieDTO };

function Card({ entry, variant, onOpen }: { entry: Entry; variant: 'grid' | 'list'; onOpen: (e: Entry) => void }) {
  if (entry.kind === 'series') {
    const s = entry.item;
    return (
      <PosterCard
        kind="series"
        variant={variant}
        className="w-full"
        title={s.title}
        posterUrl={s.posterUrl ?? undefined}
        status={seriesStatusKey(s.status)}
        releaseState={releaseState(s.tmdbStatus)}
        addedBy={personKey(s.addedBy)}
        overview={s.synopsis ?? undefined}
        progress={seriesCardProgress(s)}
        onClick={() => onOpen(entry)}
      />
    );
  }
  const m = entry.item;
  return (
    <PosterCard
      kind="movie"
      variant={variant}
      className="w-full"
      title={m.title}
      year={m.releaseDate ? new Date(m.releaseDate).getUTCFullYear() : undefined}
      runtime={formatRuntime(m.runtime)}
      posterUrl={m.posterUrl ?? undefined}
      status={movieStatusKey(m.status)}
      addedBy={personKey(m.addedBy)}
      overview={m.synopsis ?? undefined}
      onClick={() => onOpen(entry)}
    />
  );
}

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Poster card plus quick actions: a visible "Watched S02E05" button for series in progress,
 * and a status dropdown that appears on hover or keyboard focus. Both can be undone from a toast.
 */
export function EntryCard({ entry, variant, onOpen }: { entry: Entry; variant: 'grid' | 'list'; onOpen: (e: Entry) => void }) {
  const qc = useQueryClient();
  const announce = useUndoToast();
  const watchNext = useWatchedNext();
  const change = useMutation({
    mutationFn: (status: string): Promise<unknown> =>
      entry.kind === 'series' ? api.series.update(entry.item.id, { status: status as SeriesStatus }) : api.movies.update(entry.item.id, { status: status as MovieStatus }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: [entry.kind === 'series' ? 'series' : 'movies'] });
      if (entry.kind === 'series') {
        await qc.invalidateQueries({ queryKey: ['changes'] });
        announce((await api.changes({ seriesId: entry.item.id, limit: 1 }))[0] ?? null);
      }
    },
  });
  const options = entry.kind === 'series' ? SERIES_STATUS_OPTIONS : MOVIE_STATUS_OPTIONS;

  const select = (
    <select
      aria-label={`Change status for ${entry.item.title}`}
      value={entry.item.status}
      disabled={change.isPending}
      onChange={(e) => change.mutate(e.target.value)}
      className="tt-chip tt-card-select pointer-events-auto cursor-pointer"
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );

  const next = entry.kind === 'series' && ['WATCHING', 'UP_TO_DATE', 'ON_HOLD'].includes(entry.item.status) ? nextEpisode(entry.item) : null;
  const code = next ? `S${pad(next.season)}E${pad(next.episode)}` : '';
  const watchButton = next && entry.kind === 'series' && (
    <button
      type="button"
      className="tt-btn tt-btn-sm tt-btn-secondary pointer-events-auto shadow-md"
      aria-label={`Mark ${code} of ${entry.item.title} watched`}
      disabled={watchNext.isPending}
      onClick={() => watchNext.mutate(entry.item.id)}
    >
      <Icon name="check" size={16} />
      <span className="tt-mono">{code}</span>
    </button>
  );
  const hoverOnly = 'opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100';

  return (
    <div className="group relative">
      <Card entry={entry} variant={variant} onOpen={onOpen} />
      {variant === 'grid' ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col items-center justify-end gap-1 p-2" style={{ aspectRatio: '2 / 3' }}>
          {watchButton}
          <div className={hoverOnly}>{select}</div>
        </div>
      ) : (
        <div className="absolute bottom-2 right-3 flex items-center gap-2">
          {watchButton}
          <div className={hoverOnly}>{select}</div>
        </div>
      )}
      {change.error && <span role="alert" className="tt-sr-only">Could not change status</span>}
    </div>
  );
}

export function seriesCardProgress(s: SeriesDTO) {
  const p = computeProgress(s);
  if (!p.position || p.totalEpisodes === 0) return undefined;
  return { season: p.position.season, episode: p.position.episode, watched: p.watchedEpisodes, total: p.totalEpisodes };
}
