import type { Genre, Movie, MovieGenre, MovieTag, Season, Series, SeriesGenre, Tag } from '@prisma/client';
import type { AddedBy, MovieDTO, MovieStatus, SeriesDTO, SeriesStatus } from '@tulu/shared';

export type SeriesRow = Series & { genres: Array<SeriesGenre & { genre: Genre }>; seasons: Season[] };
export type MovieRow = Movie & { genres: Array<MovieGenre & { genre: Genre }>; tags: Array<MovieTag & { tag: Tag }> };

export const seriesInclude = { genres: { include: { genre: true } }, seasons: { orderBy: { seasonNumber: 'asc' as const } } };
export const movieInclude = { genres: { include: { genre: true } }, tags: { include: { tag: true } } };

const iso = (d: Date | null): string | null => (d ? d.toISOString() : null);

export function toSeriesDTO(s: SeriesRow): SeriesDTO {
  return {
    id: s.id,
    tmdbId: s.tmdbId,
    title: s.title,
    posterUrl: s.posterUrl,
    synopsis: s.synopsis,
    genres: s.genres.map((g) => ({ id: g.genre.id, name: g.genre.name })).sort((a, b) => a.name.localeCompare(b.name)),
    tmdbStatus: s.tmdbStatus,
    numberOfSeasons: s.numberOfSeasons,
    numberOfEpisodes: s.numberOfEpisodes,
    episodeRuntime: s.episodeRuntime,
    status: s.status as SeriesStatus,
    addedBy: s.addedBy as AddedBy,
    suggestedBy: s.suggestedBy,
    rating: s.rating,
    notes: s.notes,
    currentSeason: s.currentSeason,
    currentEpisode: s.currentEpisode,
    dateAdded: s.dateAdded.toISOString(),
    dateWatched: iso(s.dateWatched),
    lastRefreshedAt: iso(s.lastRefreshedAt),
    seasons: s.seasons.map((x) => ({
      seasonNumber: x.seasonNumber,
      name: x.name,
      episodeCount: x.episodeCount,
      airDate: iso(x.airDate),
      watched: x.watched,
      tracked: x.tracked,
    })),
  };
}

export function toMovieDTO(m: MovieRow): MovieDTO {
  return {
    id: m.id,
    tmdbId: m.tmdbId,
    title: m.title,
    posterUrl: m.posterUrl,
    synopsis: m.synopsis,
    genres: m.genres.map((g) => ({ id: g.genre.id, name: g.genre.name })).sort((a, b) => a.name.localeCompare(b.name)),
    tags: m.tags.map((t) => t.tag.name).sort(),
    releaseDate: iso(m.releaseDate),
    runtime: m.runtime,
    status: m.status as MovieStatus,
    addedBy: m.addedBy as AddedBy,
    suggestedBy: m.suggestedBy,
    rating: m.rating,
    notes: m.notes,
    dateAdded: m.dateAdded.toISOString(),
    dateWatched: iso(m.dateWatched),
    lastRefreshedAt: iso(m.lastRefreshedAt),
  };
}
