import { useMutation, useQueryClient } from '@tanstack/react-query';
import { computeProgress } from '@tulu/shared';
import type { MovieDTO, MovieStatus, SeriesDTO, SeriesStatus } from '@tulu/shared';
import { api } from '../api/client';
import { PosterCard } from './ui';
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

/** Poster card with a quick status control that appears on hover or keyboard focus. */
export function EntryCard({ entry, variant, onOpen }: { entry: Entry; variant: 'grid' | 'list'; onOpen: (e: Entry) => void }) {
  const qc = useQueryClient();
  const change = useMutation({
    mutationFn: (status: string): Promise<unknown> =>
      entry.kind === 'series' ? api.series.update(entry.item.id, { status: status as SeriesStatus }) : api.movies.update(entry.item.id, { status: status as MovieStatus }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [entry.kind === 'series' ? 'series' : 'movies'] }),
  });
  const options = entry.kind === 'series' ? SERIES_STATUS_OPTIONS : MOVIE_STATUS_OPTIONS;

  const select = (
    <select
      aria-label={`Change status for ${entry.item.title}`}
      value={entry.item.status}
      disabled={change.isPending}
      onChange={(e) => change.mutate(e.target.value)}
      className="tt-chip pointer-events-auto cursor-pointer bg-surface-overlay text-text-primary"
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );

  return (
    <div className="group relative">
      <Card entry={entry} variant={variant} onOpen={onOpen} />
      {variant === 'grid' ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-end justify-center p-2 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100" style={{ aspectRatio: '2 / 3' }}>
          {select}
        </div>
      ) : (
        <div className="absolute bottom-2 right-3 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">{select}</div>
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
