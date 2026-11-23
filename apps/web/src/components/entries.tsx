import type { MovieDTO, SeriesDTO } from '@tulu/shared';
import { PosterCard } from './ui';
import { formatRuntime, movieStatusKey, personKey, releaseState, seriesStatusKey } from '../lib/ui-mapping';

export type Entry = { kind: 'series'; item: SeriesDTO } | { kind: 'movie'; item: MovieDTO };

export function EntryCard({ entry, variant, onOpen }: { entry: Entry; variant: 'grid' | 'list'; onOpen: (e: Entry) => void }) {
  if (entry.kind === 'series') {
    const s = entry.item;
    return (
      <PosterCard
        kind="series"
        variant={variant}
        title={s.title}
        posterUrl={s.posterUrl ?? undefined}
        status={seriesStatusKey(s.status)}
        releaseState={releaseState(s.tmdbStatus)}
        addedBy={personKey(s.addedBy)}
        overview={s.synopsis ?? undefined}
        onClick={() => onOpen(entry)}
      />
    );
  }
  const m = entry.item;
  return (
    <PosterCard
      kind="movie"
      variant={variant}
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
