import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, '../../../.env') });

export const config = {
  port: Number(process.env.PORT ?? 3000),
  host: process.env.HOST ?? '127.0.0.1',
  tmdbApiKey: process.env.TMDB_API_KEY ?? '',
  isProd: process.env.NODE_ENV === 'production',
  webDist: path.resolve(here, '../../web/dist'),
};
