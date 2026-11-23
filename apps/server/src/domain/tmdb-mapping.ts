/**
 * Pure mapping from TMDB JSON to our own shapes. No network, no database.
 * Only TMDB-owned fields are produced here, so a refresh can never touch personal data.
 */

const IMAGE_BASE = 'https://image.tmdb.org/t/p/w342';

export interface TmdbGenre { id: number; name: string }

export interface TvMeta {
  tmdbId: number;
  title: string;
  posterUrl: string | null;
  synopsis: string | null;
  genres: TmdbGenre[];
  tmdbStatus: string | null;
  numberOfSeasons: number | null;
  numberOfEpisodes: number | null;
  episodeRuntime: number | null;
  nextEpisodeAirDate: Date | null;
  nextEpisodeSeason: number | null;
  nextEpisodeNumber: number | null;
  seasons: Array<{ seasonNumber: number; name: string | null; episodeCount: number | null; airDate: Date | null }>;
}

export interface MovieMeta {
  tmdbId: number;
  title: string;
  posterUrl: string | null;
  synopsis: string | null;
  genres: TmdbGenre[];
  releaseDate: Date | null;
  runtime: number | null;
}

export interface SearchHit {
  tmdbId: number;
  title: string;
  year: number | null;
  posterUrl: string | null;
  overview: string | null;
}

type Json = Record<string, unknown>;

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v : null);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export function parseDate(v: unknown): Date | null {
  const s = str(v);
  if (!s) return null;
  const d = new Date(`${s.slice(0, 10)}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function posterUrl(path: unknown): string | null {
  const p = str(path);
  return p ? `${IMAGE_BASE}${p}` : null;
}

function genres(v: unknown): TmdbGenre[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((g) => {
    const o = g as Json;
    const id = num(o.id);
    const name = str(o.name);
    return id !== null && name ? [{ id, name }] : [];
  });
}

/** Typical runtime: first listed episode runtime, else last aired episode's runtime. */
function episodeRuntime(d: Json): number | null {
  if (Array.isArray(d.episode_run_time)) {
    const first = num(d.episode_run_time[0]);
    if (first && first > 0) return first;
  }
  const last = d.last_episode_to_air as Json | null | undefined;
  const r = last ? num(last.runtime) : null;
  return r && r > 0 ? r : null;
}

export function mapTvDetails(d: Json): TvMeta {
  const tmdbId = num(d.id);
  if (tmdbId === null) throw new Error('TMDB TV response has no id');
  const next = (d.next_episode_to_air ?? null) as Json | null;
  const seasons = Array.isArray(d.seasons) ? (d.seasons as Json[]) : [];
  return {
    tmdbId,
    title: str(d.name) ?? 'Untitled',
    posterUrl: posterUrl(d.poster_path),
    synopsis: str(d.overview),
    genres: genres(d.genres),
    tmdbStatus: str(d.status),
    numberOfSeasons: num(d.number_of_seasons),
    numberOfEpisodes: num(d.number_of_episodes),
    episodeRuntime: episodeRuntime(d),
    nextEpisodeAirDate: next ? parseDate(next.air_date) : null,
    nextEpisodeSeason: next ? num(next.season_number) : null,
    nextEpisodeNumber: next ? num(next.episode_number) : null,
    seasons: seasons.flatMap((s) => {
      const seasonNumber = num(s.season_number);
      return seasonNumber === null
        ? []
        : [{ seasonNumber, name: str(s.name), episodeCount: num(s.episode_count), airDate: parseDate(s.air_date) }];
    }),
  };
}

export function mapMovieDetails(d: Json): MovieMeta {
  const tmdbId = num(d.id);
  if (tmdbId === null) throw new Error('TMDB movie response has no id');
  const runtime = num(d.runtime);
  return {
    tmdbId,
    title: str(d.title) ?? 'Untitled',
    posterUrl: posterUrl(d.poster_path),
    synopsis: str(d.overview),
    genres: genres(d.genres),
    releaseDate: parseDate(d.release_date),
    runtime: runtime && runtime > 0 ? runtime : null,
  };
}

export function mapSearchResults(d: Json, kind: 'tv' | 'movie'): SearchHit[] {
  const results = Array.isArray(d.results) ? (d.results as Json[]) : [];
  return results.flatMap((r) => {
    const tmdbId = num(r.id);
    if (tmdbId === null) return [];
    const title = str(kind === 'tv' ? r.name : r.title);
    if (!title) return [];
    const date = parseDate(kind === 'tv' ? r.first_air_date : r.release_date);
    return [{ tmdbId, title, year: date ? date.getUTCFullYear() : null, posterUrl: posterUrl(r.poster_path), overview: str(r.overview) }];
  });
}
