import { Router } from 'express';
import { CreateSeriesSchema, ListQuerySchema, UpdateSeriesSchema } from '@tulu/shared';
import type { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { HttpError, handler, idParam, parse } from '../http.js';
import { mapTvDetails } from '../domain/tmdb-mapping.js';
import { ensureGenres } from '../services/genres.js';
import { seriesInclude, toSeriesDTO } from '../services/dto.js';
import { tmdb } from '../services/tmdb.js';

export const seriesRouter = Router();

seriesRouter.get(
  '/',
  handler(async (req, res) => {
    const { q, status, genre } = parse(ListQuerySchema, req.query);
    const where: Prisma.SeriesWhereInput = {};
    if (q) where.title = { contains: q };
    if (status) where.status = { in: status.split(',') };
    if (genre) where.genres = { some: { genreId: genre } };
    const rows = await prisma.series.findMany({ where, include: seriesInclude, orderBy: { title: 'asc' } });
    res.json(rows.map(toSeriesDTO));
  }),
);

seriesRouter.get(
  '/:id',
  handler(async (req, res) => {
    const row = await prisma.series.findUnique({ where: { id: idParam(req) }, include: seriesInclude });
    if (!row) throw new HttpError(404, 'Series not found');
    res.json(toSeriesDTO(row));
  }),
);

seriesRouter.post(
  '/',
  handler(async (req, res) => {
    const input = parse(CreateSeriesSchema, req.body);
    if (await prisma.series.findUnique({ where: { tmdbId: input.tmdbId } })) {
      throw new HttpError(409, 'This series is already in the library');
    }
    const { data } = await tmdb().get(`/tv/${input.tmdbId}`, {}, 24 * 60 * 60 * 1000);
    const meta = mapTvDetails(data as Record<string, unknown>);
    const genreIds = await ensureGenres(meta.genres);
    const row = await prisma.series.create({
      data: {
        tmdbId: meta.tmdbId,
        title: meta.title,
        posterUrl: meta.posterUrl,
        synopsis: meta.synopsis,
        tmdbStatus: meta.tmdbStatus,
        numberOfSeasons: meta.numberOfSeasons,
        numberOfEpisodes: meta.numberOfEpisodes,
        episodeRuntime: meta.episodeRuntime,
        nextEpisodeAirDate: meta.nextEpisodeAirDate,
        nextEpisodeSeason: meta.nextEpisodeSeason,
        nextEpisodeNumber: meta.nextEpisodeNumber,
        lastRefreshedAt: new Date(),
        status: input.status,
        addedBy: input.addedBy,
        suggestedBy: input.suggestedBy ?? null,
        genres: { create: genreIds.map((genreId) => ({ genreId })) },
        // Season 0 (specials) is stored but not tracked unless the user opts in.
        seasons: {
          create: meta.seasons.map((s) => ({
            seasonNumber: s.seasonNumber,
            name: s.name,
            episodeCount: s.episodeCount,
            airDate: s.airDate,
            tracked: s.seasonNumber !== 0,
          })),
        },
      },
      include: seriesInclude,
    });
    res.status(201).json(toSeriesDTO(row));
  }),
);

seriesRouter.patch(
  '/:id',
  handler(async (req, res) => {
    const id = idParam(req);
    const input = parse(UpdateSeriesSchema, req.body);
    const { dateWatched, ...rest } = input;
    try {
      const row = await prisma.series.update({
        where: { id },
        data: { ...rest, ...(dateWatched !== undefined && { dateWatched: dateWatched ? new Date(dateWatched) : null }) },
        include: seriesInclude,
      });
      res.json(toSeriesDTO(row));
    } catch (e) {
      if ((e as { code?: string }).code === 'P2025') throw new HttpError(404, 'Series not found');
      throw e;
    }
  }),
);

seriesRouter.delete(
  '/:id',
  handler(async (req, res) => {
    try {
      await prisma.series.delete({ where: { id: idParam(req) } });
      res.status(204).end();
    } catch (e) {
      if ((e as { code?: string }).code === 'P2025') throw new HttpError(404, 'Series not found');
      throw e;
    }
  }),
);
