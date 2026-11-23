import { Router } from 'express';
import { SettingsSchema } from '@tulu/shared';
import { z } from 'zod';
import { prisma } from '../db.js';
import { handler, idParam, parse } from '../http.js';
import { seriesInclude, toSeriesDTO } from '../services/dto.js';
import { toChangeDTOs, undoChange } from '../services/progress.js';
import { getSettings, saveSettings } from '../services/settings.js';

export const changesRouter = Router();

const QuerySchema = z.object({ seriesId: z.coerce.number().int().optional(), limit: z.coerce.number().int().min(1).max(50).default(10) });

changesRouter.get(
  '/',
  handler(async (req, res) => {
    const { seriesId, limit } = parse(QuerySchema, req.query);
    const rows = await prisma.changeLog.findMany({
      where: seriesId ? { seriesId } : {},
      orderBy: { id: 'desc' },
      take: limit,
      include: { series: { select: { title: true } } },
    });
    res.json(await toChangeDTOs(rows));
  }),
);

/** Undo a change. Returns the restored series. */
changesRouter.post(
  '/:id/undo',
  handler(async (req, res) => {
    const seriesId = await undoChange(idParam(req));
    res.json(toSeriesDTO(await prisma.series.findUniqueOrThrow({ where: { id: seriesId }, include: seriesInclude })));
  }),
);

export const settingsRouter = Router();
settingsRouter.get('/', handler(async (_req, res) => { res.json(await getSettings()); }));
settingsRouter.put('/', handler(async (req, res) => { res.json(await saveSettings(parse(SettingsSchema, req.body))); }));
