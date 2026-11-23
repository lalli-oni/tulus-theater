import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import type { Health } from '@tulu/shared';
import { config } from './config.js';

export function createApp() {
  const app = express();
  // Only the Vite dev server may call the API from a browser.
  app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }));
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    const body: Health = { ok: true, tmdbConfigured: config.tmdbApiKey.length > 0 };
    res.json(body);
  });

  if (config.isProd && fs.existsSync(config.webDist)) {
    app.use(express.static(config.webDist));
    app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(config.webDist, 'index.html')));
  }

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
