import { z } from 'zod';

export const ADDED_BY = ['ALECHA', 'LALLI', 'UNKNOWN'] as const;
export const AddedBySchema = z.enum(ADDED_BY);
export type AddedBy = z.infer<typeof AddedBySchema>;

export const SERIES_STATUS = ['WISHLIST', 'WATCHING', 'UP_TO_DATE', 'ON_HOLD', 'COMPLETED', 'DROPPED'] as const;
export const SeriesStatusSchema = z.enum(SERIES_STATUS);
export type SeriesStatus = z.infer<typeof SeriesStatusSchema>;

export const MOVIE_STATUS = ['WISHLIST', 'WATCHED', 'DROPPED'] as const;
export const MovieStatusSchema = z.enum(MOVIE_STATUS);
export type MovieStatus = z.infer<typeof MovieStatusSchema>;

export const HealthSchema = z.object({
  ok: z.literal(true),
  tmdbConfigured: z.boolean(),
});
export type Health = z.infer<typeof HealthSchema>;

// ---------- TMDB search ----------
export const MediaKindSchema = z.enum(['tv', 'movie']);
export type MediaKind = z.infer<typeof MediaKindSchema>;

export const TmdbSearchQuerySchema = z.object({
  kind: MediaKindSchema,
  q: z.string().trim().min(1).max(200),
});

export interface TmdbSearchResult {
  tmdbId: number;
  kind: MediaKind;
  title: string;
  year: number | null;
  posterUrl: string | null;
  overview: string | null;
  /** Already in the library? Set by the server. */
  inLibrary: boolean;
}

export interface TmdbSearchResponse {
  results: TmdbSearchResult[];
  /** True when TMDB could not be reached and cached results were returned. */
  stale: boolean;
}

// ---------- Library entities ----------
export interface GenreDTO { id: number; name: string }

export interface SeasonDTO {
  seasonNumber: number;
  name: string | null;
  episodeCount: number | null;
  airDate: string | null;
  watched: boolean;
  tracked: boolean;
}

export interface SeriesDTO {
  id: number;
  tmdbId: number;
  title: string;
  posterUrl: string | null;
  synopsis: string | null;
  genres: GenreDTO[];
  tmdbStatus: string | null;
  numberOfSeasons: number | null;
  numberOfEpisodes: number | null;
  episodeRuntime: number | null;
  status: SeriesStatus;
  addedBy: AddedBy;
  suggestedBy: string | null;
  rating: number | null;
  notes: string | null;
  currentSeason: number | null;
  currentEpisode: number | null;
  dateAdded: string;
  dateWatched: string | null;
  lastRefreshedAt: string | null;
  seasons: SeasonDTO[];
}

export interface MovieDTO {
  id: number;
  tmdbId: number;
  title: string;
  posterUrl: string | null;
  synopsis: string | null;
  genres: GenreDTO[];
  tags: string[];
  releaseDate: string | null;
  runtime: number | null;
  status: MovieStatus;
  addedBy: AddedBy;
  suggestedBy: string | null;
  rating: number | null;
  notes: string | null;
  dateAdded: string;
  dateWatched: string | null;
  lastRefreshedAt: string | null;
}

const optionalText = z.string().trim().max(2000).nullable().optional();
const dateString = z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/));

// ---------- Inputs ----------
export const CreateSeriesSchema = z.object({
  tmdbId: z.number().int().positive(),
  addedBy: AddedBySchema,
  suggestedBy: z.string().trim().max(200).nullable().optional(),
  status: SeriesStatusSchema.default('WISHLIST'),
});
export type CreateSeriesInput = z.infer<typeof CreateSeriesSchema>;

export const UpdateSeriesSchema = z.object({
  status: SeriesStatusSchema.optional(),
  addedBy: AddedBySchema.optional(),
  suggestedBy: z.string().trim().max(200).nullable().optional(),
  notes: optionalText,
  rating: z.number().min(0).max(5).nullable().optional(),
  currentSeason: z.number().int().min(0).nullable().optional(),
  currentEpisode: z.number().int().min(0).nullable().optional(),
  dateWatched: dateString.nullable().optional(),
});
export type UpdateSeriesInput = z.infer<typeof UpdateSeriesSchema>;

export const CreateMovieSchema = z.object({
  tmdbId: z.number().int().positive(),
  addedBy: AddedBySchema,
  suggestedBy: z.string().trim().max(200).nullable().optional(),
  status: MovieStatusSchema.default('WISHLIST'),
});
export type CreateMovieInput = z.infer<typeof CreateMovieSchema>;

export const UpdateMovieSchema = z.object({
  status: MovieStatusSchema.optional(),
  addedBy: AddedBySchema.optional(),
  suggestedBy: z.string().trim().max(200).nullable().optional(),
  notes: optionalText,
  rating: z.number().min(0).max(5).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  dateWatched: dateString.nullable().optional(),
});
export type UpdateMovieInput = z.infer<typeof UpdateMovieSchema>;

export const ListQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  status: z.string().optional(),
  genre: z.coerce.number().int().optional(),
  addedBy: AddedBySchema.optional(),
});
export type ListQuery = z.infer<typeof ListQuerySchema>;

export interface ApiError { error: string; details?: unknown }

export * from './progress';

export const UpdateSeasonSchema = z.object({
  watched: z.boolean().optional(),
  tracked: z.boolean().optional(),
});
export type UpdateSeasonInput = z.infer<typeof UpdateSeasonSchema>;

/** Mark seasons up to this number watched. null clears all season progress. */
export const WatchedThroughSchema = z.object({ season: z.number().int().min(0).nullable() });
export type WatchedThroughInput = z.infer<typeof WatchedThroughSchema>;
