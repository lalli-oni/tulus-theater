import { Router } from 'express';
import { TmdbSearchQuerySchema } from '@tulu/shared';
import type { TmdbSearchResponse } from '@tulu/shared';
import { prisma } from '../db.js';
import { handler, parse } from '../http.js';
import { mapSearchResults } from '../domain/tmdb-mapping.js';
import { tmdb } from '../services/tmdb.js';

export const tmdbRouter = Router();

tmdbRouter.get(
  '/search',
  handler(async (req, res) => {
    const { kind, q } = parse(TmdbSearchQuerySchema, req.query);
    const { data, stale } = await tmdb().get(`/search/${kind}`, { query: q, include_adult: 'false' }, 6 * 60 * 60 * 1000);
    const hits = mapSearchResults(data as Record<string, unknown>, kind).slice(0, 20);
    const ids = hits.map((h) => h.tmdbId);
    const existing = new Set(
      (kind === 'tv'
        ? await prisma.series.findMany({ where: { tmdbId: { in: ids } }, select: { tmdbId: true } })
        : await prisma.movie.findMany({ where: { tmdbId: { in: ids } }, select: { tmdbId: true } })
      ).map((r) => r.tmdbId),
    );
    const body: TmdbSearchResponse = { results: hits.map((h) => ({ ...h, kind, inLibrary: existing.has(h.tmdbId) })), stale };
    res.json(body);
  }),
);
