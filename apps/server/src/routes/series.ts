import { Router } from 'express';
import { CreateSeriesSchema, ListQuerySchema, UpdateSeasonSchema, UpdateSeriesSchema, WatchedThroughSchema, validateCurrent, watchedThrough } from '@tulu/shared';
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
    const { q, status, genre, addedBy } = parse(ListQuerySchema, req.query);
    const where: Prisma.SeriesWhereInput = {};
    if (q) where.title = { contains: q };
    if (status) where.status = { in: status.split(',') };
    if (genre) where.genres = { some: { genreId: genre } };
    if (addedBy) where.addedBy = addedBy;
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
    const existing = await prisma.series.findUnique({ where: { id }, include: { seasons: true } });
    if (!existing) throw new HttpError(404, 'Series not found');

    // Validate the current season/episode pair against what we will store.
    const touchesCurrent = 'currentSeason' in input || 'currentEpisode' in input;
    if (touchesCurrent) {
      const season = 'currentSeason' in input ? (input.currentSeason ?? null) : existing.currentSeason;
      let episode = 'currentEpisode' in input ? (input.currentEpisode ?? null) : existing.currentEpisode;
      if (season === null) episode = null; // clearing the season clears the episode too
      const problem = validateCurrent(existing.seasons, season, episode);
      if (problem) throw new HttpError(400, problem);
      rest.currentSeason = season;
      rest.currentEpisode = episode;
    }

    const row = await prisma.series.update({
      where: { id },
      data: { ...rest, ...(dateWatched !== undefined && { dateWatched: dateWatched ? new Date(dateWatched) : null }) },
      include: seriesInclude,
    });
    res.json(toSeriesDTO(row));
  }),
);

/** Mark one season watched/unwatched, or tracked/untracked (e.g. opt in to specials). */
seriesRouter.patch(
  '/:id/seasons/:season',
  handler(async (req, res) => {
    const id = idParam(req);
    const seasonNumber = Number(req.params.season);
    if (!Number.isInteger(seasonNumber) || seasonNumber < 0) throw new HttpError(400, 'Invalid season');
    const input = parse(UpdateSeasonSchema, req.body);
    const series = await prisma.series.findUnique({ where: { id } });
    if (!series) throw new HttpError(404, 'Series not found');
    const season = await prisma.season.findUnique({ where: { seriesId_seasonNumber: { seriesId: id, seasonNumber } } });
    if (!season) throw new HttpError(404, 'Season not found');

    await prisma.$transaction(async (tx) => {
      await tx.season.update({ where: { id: season.id }, data: input });
      // A fully watched or untracked season no longer needs a partial-progress pointer.
      const done = input.watched === true || input.tracked === false;
      if (done && series.currentSeason === seasonNumber) {
        await tx.series.update({ where: { id }, data: { currentSeason: null, currentEpisode: null } });
      }
    });
    res.json(toSeriesDTO((await prisma.series.findUniqueOrThrow({ where: { id }, include: seriesInclude }))));
  }),
);

/** "We have watched through season N": one click instead of ticking every season. */
seriesRouter.post(
  '/:id/watched-through',
  handler(async (req, res) => {
    const id = idParam(req);
    const { season } = parse(WatchedThroughSchema, req.body);
    const series = await prisma.series.findUnique({ where: { id }, include: { seasons: true } });
    if (!series) throw new HttpError(404, 'Series not found');
    const updates = watchedThrough(series.seasons, season);
    await prisma.$transaction([
      ...updates.map((u) => prisma.season.update({ where: { seriesId_seasonNumber: { seriesId: id, seasonNumber: u.seasonNumber } }, data: { watched: u.watched } })),
      // Season-level progress replaces any partial pointer.
      prisma.series.update({ where: { id }, data: { currentSeason: null, currentEpisode: null } }),
    ]);
    res.json(toSeriesDTO(await prisma.series.findUniqueOrThrow({ where: { id }, include: seriesInclude })));
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
