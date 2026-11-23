import { prisma } from '../db.js';
import type { TmdbGenre } from '../domain/tmdb-mapping.js';

/** Ensure the genres exist and return their ids. Genre ids are TMDB's own. */
export async function ensureGenres(genres: TmdbGenre[]): Promise<number[]> {
  for (const g of genres) {
    await prisma.genre.upsert({ where: { id: g.id }, create: g, update: { name: g.name } });
  }
  return genres.map((g) => g.id);
}
