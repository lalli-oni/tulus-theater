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
