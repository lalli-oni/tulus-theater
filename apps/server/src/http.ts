import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodTypeAny, z } from 'zod';
import { ZodError } from 'zod';
import { TmdbError } from './services/tmdb.js';

export class HttpError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

/** Wraps an async handler so rejections reach the error middleware (Express 4 does not do this). */
export const handler =
  (fn: (req: Request, res: Response) => Promise<void>): RequestHandler =>
  (req, res, next) => {
    fn(req, res).catch(next);
  };

export function parse<S extends ZodTypeAny>(schema: S, value: unknown): z.infer<S> {
  const r = schema.safeParse(value);
  if (!r.success) throw new HttpError(400, 'Invalid input', r.error.flatten());
  return r.data;
}

export function idParam(req: Request): number {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'Invalid id');
  return id;
}

export function errorMiddleware(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) return void res.status(err.status).json({ error: err.message, details: err.details });
  if (err instanceof ZodError) return void res.status(400).json({ error: 'Invalid input', details: err.flatten() });
  if (err instanceof TmdbError) {
    const status = err.code === 'not_configured' ? 503 : err.code === 'not_found' ? 404 : 502;
    return void res.status(status).json({ error: err.message, code: err.code });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
}
