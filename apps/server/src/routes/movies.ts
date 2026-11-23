import { Router } from 'express';
import { CreateMovieSchema, ListQuerySchema, UpdateMovieSchema } from '@tulu/shared';
import type { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { HttpError, handler, idParam, parse } from '../http.js';
import { mapMovieDetails } from '../domain/tmdb-mapping.js';
import { ensureGenres } from '../services/genres.js';
import { movieInclude, toMovieDTO } from '../services/dto.js';
import { tmdb } from '../services/tmdb.js';

export const moviesRouter = Router();

moviesRouter.get(
  '/',
  handler(async (req, res) => {
    const { q, status, genre, addedBy } = parse(ListQuerySchema, req.query);
    const where: Prisma.MovieWhereInput = {};
    if (q) where.title = { contains: q };
    if (status) where.status = { in: status.split(',') };
    if (genre) where.genres = { some: { genreId: genre } };
    if (addedBy) where.addedBy = addedBy;
    const rows = await prisma.movie.findMany({ where, include: movieInclude, orderBy: { title: 'asc' } });
    res.json(rows.map(toMovieDTO));
  }),
);

moviesRouter.get(
  '/:id',
  handler(async (req, res) => {
    const row = await prisma.movie.findUnique({ where: { id: idParam(req) }, include: movieInclude });
    if (!row) throw new HttpError(404, 'Movie not found');
    res.json(toMovieDTO(row));
  }),
);

moviesRouter.post(
  '/',
  handler(async (req, res) => {
    const input = parse(CreateMovieSchema, req.body);
    if (await prisma.movie.findUnique({ where: { tmdbId: input.tmdbId } })) {
      throw new HttpError(409, 'This movie is already in the library');
    }
    const { data } = await tmdb().get(`/movie/${input.tmdbId}`, {}, 24 * 60 * 60 * 1000);
    const meta = mapMovieDetails(data as Record<string, unknown>);
    const genreIds = await ensureGenres(meta.genres);
    const row = await prisma.movie.create({
      data: {
        tmdbId: meta.tmdbId,
        title: meta.title,
        posterUrl: meta.posterUrl,
        synopsis: meta.synopsis,
        releaseDate: meta.releaseDate,
        runtime: meta.runtime,
        lastRefreshedAt: new Date(),
        status: input.status,
        addedBy: input.addedBy,
        suggestedBy: input.suggestedBy ?? null,
        genres: { create: genreIds.map((genreId) => ({ genreId })) },
      },
      include: movieInclude,
    });
    res.status(201).json(toMovieDTO(row));
  }),
);

moviesRouter.patch(
  '/:id',
  handler(async (req, res) => {
    const id = idParam(req);
    const { tags, dateWatched, ...rest } = parse(UpdateMovieSchema, req.body);
    try {
      const row = await prisma.$transaction(async (tx) => {
        if (tags) {
          const unique = [...new Set(tags)];
          const tagRows = await Promise.all(unique.map((name) => tx.tag.upsert({ where: { name }, create: { name }, update: {} })));
          await tx.movieTag.deleteMany({ where: { movieId: id } });
          await tx.movieTag.createMany({ data: tagRows.map((t) => ({ movieId: id, tagId: t.id })) });
        }
        return tx.movie.update({
          where: { id },
          data: { ...rest, ...(dateWatched !== undefined && { dateWatched: dateWatched ? new Date(dateWatched) : null }) },
          include: movieInclude,
        });
      });
      res.json(toMovieDTO(row));
    } catch (e) {
      if ((e as { code?: string }).code === 'P2025') throw new HttpError(404, 'Movie not found');
      throw e;
    }
  }),
);

moviesRouter.delete(
  '/:id',
  handler(async (req, res) => {
    try {
      await prisma.movie.delete({ where: { id: idParam(req) } });
      res.status(204).end();
    } catch (e) {
      if ((e as { code?: string }).code === 'P2025') throw new HttpError(404, 'Movie not found');
      throw e;
    }
  }),
);
