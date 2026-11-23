import type { Prisma } from '@prisma/client';
import { autoStatus } from '@tulu/shared';
import type { ChangeDTO, SeriesStatus } from '@tulu/shared';
import { prisma } from '../db.js';
import { HttpError } from '../http.js';
import { getSettings } from './settings.js';

type Tx = Prisma.TransactionClient;

/** Everything a progress action can change, so it can be put back exactly. */
export interface Snapshot {
  status: string;
  currentSeason: number | null;
  currentEpisode: number | null;
  dateWatched: string | null;
  seasons: Array<{ seasonNumber: number; watched: boolean; tracked: boolean }>;
}

export async function snapshot(db: Tx, seriesId: number): Promise<Snapshot> {
  const s = await db.series.findUniqueOrThrow({ where: { id: seriesId }, include: { seasons: { orderBy: { seasonNumber: 'asc' } } } });
  return {
    status: s.status,
    currentSeason: s.currentSeason,
    currentEpisode: s.currentEpisode,
    dateWatched: s.dateWatched ? s.dateWatched.toISOString() : null,
    seasons: s.seasons.map((x) => ({ seasonNumber: x.seasonNumber, watched: x.watched, tracked: x.tracked })),
  };
}

export async function restore(db: Tx, seriesId: number, snap: Snapshot): Promise<void> {
  await db.series.update({
    where: { id: seriesId },
    data: {
      status: snap.status,
      currentSeason: snap.currentSeason,
      currentEpisode: snap.currentEpisode,
      dateWatched: snap.dateWatched ? new Date(snap.dateWatched) : null,
    },
  });
  for (const s of snap.seasons) {
    await db.season.updateMany({ where: { seriesId, seasonNumber: s.seasonNumber }, data: { watched: s.watched, tracked: s.tracked } });
  }
}

export interface ChangeRow { id: number; seriesId: number; createdAt: Date; action: string; summary: string; undone: boolean; series: { title: string } }

export async function toChangeDTOs(rows: ChangeRow[]): Promise<ChangeDTO[]> {
  // The newest live change per series is the only undoable one.
  const latest = new Map<number, number>();
  const bySeries = [...new Set(rows.map((r) => r.seriesId))];
  for (const seriesId of bySeries) {
    const top = await prisma.changeLog.findFirst({ where: { seriesId, undone: false }, orderBy: { id: 'desc' }, select: { id: true } });
    if (top) latest.set(seriesId, top.id);
  }
  return rows.map((r) => ({
    id: r.id,
    seriesId: r.seriesId,
    seriesTitle: r.series.title,
    createdAt: r.createdAt.toISOString(),
    action: r.action,
    summary: r.summary,
    undone: r.undone,
    canUndo: !r.undone && latest.get(r.seriesId) === r.id,
  }));
}

export interface ActionOptions {
  action: string;
  /** Apply the change. Returns a human summary such as "Watched S02E05". */
  apply: (tx: Tx) => Promise<string>;
  /** Run automatic status rules afterwards (honours the Settings toggle). */
  automate: boolean;
}

/**
 * Runs a progress action atomically, applies automatic status rules, and records a ChangeLog
 * entry with before/after snapshots. Returns the change, or null when nothing changed.
 */
export async function runProgressAction(seriesId: number, opts: ActionOptions): Promise<ChangeDTO | null> {
  const automation = opts.automate ? (await getSettings()).automation.progressStatus : false;
  const changeId = await prisma.$transaction(async (tx) => {
    const before = await snapshot(tx, seriesId);
    let summary = await opts.apply(tx);

    if (automation) {
      const s = await tx.series.findUniqueOrThrow({ where: { id: seriesId }, include: { seasons: true } });
      const auto = autoStatus({ seasons: s.seasons, currentSeason: s.currentSeason, currentEpisode: s.currentEpisode, status: s.status as SeriesStatus, tmdbStatus: s.tmdbStatus });
      if (auto) {
        await tx.series.update({
          where: { id: seriesId },
          data: { status: auto.status, ...(auto.status === 'COMPLETED' && !s.dateWatched && { dateWatched: new Date() }) },
        });
        summary += `. Status set to ${auto.status.toLowerCase().replace(/_/g, ' ')}: ${auto.reason}`;
      }
    }

    const after = await snapshot(tx, seriesId);
    if (JSON.stringify(before) === JSON.stringify(after)) return null;
    const row = await tx.changeLog.create({
      data: { seriesId, action: opts.action, summary, before: JSON.stringify(before), after: JSON.stringify(after) },
    });
    return row.id;
  });
  if (changeId === null) return null;
  const row = await prisma.changeLog.findUniqueOrThrow({ where: { id: changeId }, include: { series: { select: { title: true } } } });
  return (await toChangeDTOs([row]))[0]!;
}

export async function undoChange(changeId: number): Promise<number> {
  const change = await prisma.changeLog.findUnique({ where: { id: changeId } });
  if (!change) throw new HttpError(404, 'Change not found');
  if (change.undone) throw new HttpError(409, 'That change was already undone');
  const newer = await prisma.changeLog.findFirst({ where: { seriesId: change.seriesId, undone: false, id: { gt: change.id } } });
  if (newer) throw new HttpError(409, 'A newer change exists for this series. Undo that one first.');
  await prisma.$transaction(async (tx) => {
    await restore(tx, change.seriesId, JSON.parse(change.before) as Snapshot);
    await tx.changeLog.update({ where: { id: change.id }, data: { undone: true } });
  });
  return change.seriesId;
}
