import { Router } from 'express';
import { prisma } from '../db.js';
import { handler } from '../http.js';

export const genresRouter = Router();

/** Only genres that are actually used by something in the library. */
genresRouter.get(
  '/',
  handler(async (_req, res) => {
    const rows = await prisma.genre.findMany({
      where: { OR: [{ series: { some: {} } }, { movies: { some: {} } }] },
      orderBy: { name: 'asc' },
    });
    res.json(rows.map((g) => ({ id: g.id, name: g.name })));
  }),
);
