# Tulu's Theater: Plan

Status: **proposal, awaiting approval. No application code written yet.**

## 1. What the spreadsheet tells us

The sheet has five tabs, and they overlap:

| Tab | What it is | Rows | Notes |
|---|---|---|---|
| Form Responses 1 | Original suggestion form (2020), later used as a free-form list (2024-25) | ~130 | Title, Type (Series/Movie, sometimes blank), "Done?" (`Yes!`, `Yes`, `Watching`, `Up to date`, blank), episode length, seasons, eps/season, genres, notes. Dates in mixed formats (`8/8/2020`, `14/09/2024`, `2025`). |
| Suggestions | Copy of the wishlist titles | ~35 | Duplicates Form Responses. Ignore as a source, except for "Tough to watch?". |
| Series Log | Series watched | 20 | Name, genre/type, rating (0-5), year watched, comment. Comment often means *who* ("Alecha") or a status ("Havent finish", "Forgot about it"). |
| Movies | Movies watched | 7 | Same columns as Series Log. |
| Panel shows | Taskmaster, Bake Off, QI, etc. | ~15 | Season count, status (Ongoing / Up to date), free-text comment with next-season hints. |

Consequences for the design:

- **Every title needs matching to TMDB.** The sheet has titles only, with typos (`The equilizer`, `Never mnd the buzzcock`), junk rows (`martial arts %top imdb`, `Sharpe series (classic British)`), and some rows with no type (`Babylon 5`, `Oldboy`). The import must be a **review-then-commit** flow, not a blind import.
- **The same title appears in several tabs** (Body of lies is in Form, Movies and Suggestions). The importer merges by normalised title.
- **We need a rating field.** Series Log and Movies both have 0-5 ratings. It is not in your field list, so I propose adding it (optional).
- **"Added by" is mostly unknown.** Only a few comments say "Alecha" or "Lalli". The importer defaults to a choice you make once and lets you fix them in the review step.
- **Panel shows are real and need a status.** "Up to date, next in September" maps directly onto Up to date + Awaiting more.
- **Year watched exists, full date mostly doesn't.** `dateWatched` stays optional and the importer stores `watchedYear` hints in notes only when there is no full date.

Suggested mapping from the sheet to our statuses:

| Sheet value | TV status | Movie status |
|---|---|---|
| `Watching` | Watching | n/a |
| `Up to date` | Up to date | n/a |
| `Yes` / `Yes!` | Completed | Watched |
| In Series Log / Movies tab with a year watched | Completed | Watched |
| `Havent finish`, `Forgot about it` | On hold | n/a |
| Blank "Done?" | Wishlist | Wishlist |

## 2. Architecture

Simple npm-workspaces monorepo. Two apps, one shared types package. No extra tooling.

```
tulus-theater/
  package.json              # workspaces + root scripts
  .env.example
  README.md  PLAN.md
  packages/
    shared/                 # TS types + zod schemas = the API contract
  apps/
    server/                 # Express + Prisma + SQLite
      prisma/schema.prisma
      src/
        index.ts            # binds 127.0.0.1 only
        routes/             # series, movies, tmdb, dashboard, import, backup
        services/           # tmdb client, refresh, import, backup
        domain/             # PURE logic: status rules, episode availability, mapping
        db.ts
      data/                 # SQLite file + backups (gitignored)
    web/                    # React + Vite + Tailwind
      src/
        components/ui/      # design system: Button, Badge, Card, Poster, Modal, Tabs...
        components/         # TitleCard, TitleGrid, SeasonProgress, StatusMenu...
        pages/              # Dashboard, Series, Movies, Wishlist, Settings
        api/                # typed fetch client + TanStack Query hooks
```

Key decisions:

- **Shared package with zod.** Request and response shapes are defined once and validated on the server. The frontend gets the same types.
- **Pure domain layer.** Status rules, episode availability and TMDB mapping are plain functions with no DB or network. That is what the tests target.
- **TMDB key lives only on the server.** The web app calls `/api/tmdb/...`. Server responses are cached in a `TmdbCache` table, which is what makes "show cached data if TMDB is down" work.
- **Localhost only.** Express binds `127.0.0.1`. CORS allows only the Vite dev origin. In production mode Express serves the built web app, so there is one process on one port.
- **TanStack Query** on the frontend for caching and loading and error states. Plain React state otherwise. No Redux.
- **Offline:** the library is read from SQLite, so it always works. Only search and refresh need internet, and they fail softly with a toast and a "last refreshed" label.
- **Tests:** Vitest. Targets: status logic, episode availability, TMDB mapping, CSV import.

## 3. Database schema (Prisma, SQLite)

SQLite has no enums or arrays in Prisma, so statuses are validated strings (zod on the way in) and genres are a join table. Series and movies are **separate tables** that share a `Genre` table.

```prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "sqlite"; url = env("DATABASE_URL") }

model Genre {
  id      Int      @id            // TMDB genre id
  name    String
  series  SeriesGenre[]
  movies  MovieGenre[]
}

model Series {
  id               Int      @id @default(autoincrement())
  tmdbId           Int      @unique
  title            String
  posterUrl        String?
  synopsis         String?
  tmdbStatus       String?          // Returning Series | Ended | Canceled | In Production | Planned
  numberOfSeasons  Int?
  numberOfEpisodes Int?
  episodeRuntime   Int?             // typical minutes
  nextEpisodeAirDate DateTime?      // from TMDB next_episode_to_air
  nextEpisodeSeason  Int?
  nextEpisodeNumber  Int?
  status           String   @default("WISHLIST") // WISHLIST|WATCHING|UP_TO_DATE|ON_HOLD|COMPLETED|DROPPED
  addedBy          String           // ALECHA | LALLI
  suggestedBy      String?
  rating           Float?
  notes            String?
  currentSeason    Int?
  currentEpisode   Int?
  dateAdded        DateTime @default(now())
  dateWatched      DateTime?
  lastRefreshedAt  DateTime?        // last SUCCESSFUL refresh
  lastRefreshError String?
  genres           SeriesGenre[]
  seasons          Season[]
}

model SeriesGenre { seriesId Int; genreId Int
  series Series @relation(fields: [seriesId], references: [id], onDelete: Cascade)
  genre  Genre  @relation(fields: [genreId],  references: [id])
  @@id([seriesId, genreId]) }

// One row per TMDB season. Season 0 (specials) is stored but flagged.
model Season {
  id            Int      @id @default(autoincrement())
  seriesId      Int
  seasonNumber  Int                 // 0 = specials
  name          String?
  episodeCount  Int?                // TMDB total (can differ per season)
  airDate       DateTime?
  // Personal progress: only user-owned fields below, never overwritten by refresh
  watched       Boolean  @default(false)  // whole season done
  tracked       Boolean  @default(true)   // false for specials unless user opts in
  series        Series   @relation(fields: [seriesId], references: [id], onDelete: Cascade)
  episodes      Episode[]
  @@unique([seriesId, seasonNumber])
}

// Cached air dates so "new episodes available" works offline and accounts for real dates.
model Episode {
  id            Int      @id @default(autoincrement())
  seasonId      Int
  episodeNumber Int
  airDate       DateTime?
  runtime       Int?
  season        Season   @relation(fields: [seasonId], references: [id], onDelete: Cascade)
  @@unique([seasonId, episodeNumber])
}

model Movie {
  id          Int      @id @default(autoincrement())
  tmdbId      Int      @unique
  title       String
  posterUrl   String?
  synopsis    String?
  releaseDate DateTime?
  runtime     Int?
  status      String   @default("WISHLIST")  // WISHLIST|WATCHED|DROPPED
  addedBy     String
  suggestedBy String?
  rating      Float?
  notes       String?
  dateAdded   DateTime @default(now())
  dateWatched DateTime?
  lastRefreshedAt DateTime?
  genres      MovieGenre[]
  tags        MovieTag[]
}
model MovieGenre { movieId Int; genreId Int; /* relations as above */ @@id([movieId, genreId]) }
model Tag        { id Int @id @default(autoincrement()); name String @unique; movies MovieTag[] }
model MovieTag   { movieId Int; tagId Int; /* relations */ @@id([movieId, tagId]) }

model TmdbCache {            // response cache + offline fallback
  key       String   @id    // e.g. "search:tv:the office:1"
  payload   String
  fetchedAt DateTime
}

model AppSetting { key String @id; value String }   // e.g. last backup time, default addedBy
```

How each requirement is met:

- **Personal data is never overwritten on refresh.** Refresh writes only TMDB-owned columns (title, poster, tmdbStatus, counts, next-episode fields, Season/Episode metadata). `status`, `notes`, `addedBy`, `suggestedBy`, `rating`, season `watched`, `currentSeason/Episode` are never touched. A test enforces this.
- **Per-season tracking without episode checkboxes:** `Season.watched` plus an optional `currentSeason`/`currentEpisode` pointer on the series. A partially watched season is "current season = 3, episode = 4".
- **Season 0:** stored, `tracked=false` by default, excluded from all progress and availability maths unless the user turns it on.
- **Episode air dates:** `Episode` rows are cached per season on refresh, so availability uses real dates (`airDate <= today`), not season totals.

### Episode availability rule (the heart of the dashboard)

For a tracked series, let *aired* = tracked episodes with `airDate <= today`, and *watched position* =
- every episode in seasons with `watched = true`, plus
- in `currentSeason`, episodes `1..currentEpisode`.

**New episodes available** = there is an aired episode not covered by the watched position. The result includes a count and the first unwatched episode, so the card can say "S3E5 + 3 more".

**Up to date / awaiting more** = status UP_TO_DATE and no unwatched aired episodes. Next date comes from `nextEpisodeAirDate`, else a future season air date, else "Date not announced" if tmdbStatus is Returning Series, else nothing.

Personal status is never auto-changed. The dashboard may *suggest* a change ("You are caught up. Mark as Up to date?") as a one-click prompt, which is cheap and keeps you in control.

## 4. Screens

1. **Dashboard**: four sections: *Currently Watching* (with progress), *New Episodes Available*, *Up to Date / Awaiting More*, *Upcoming Releases* (confirmed date or "Date not announced"). Also a small "What should we watch next?" card (see assumptions).
2. **TV Series**: poster grid or list toggle, search, genre and status filters, quick status menu on each card, "Add" button.
3. **Movies**: same components, movie-specific statuses and tags.
4. **Wishlist**: filtered view of both collections (status = Wishlist), showing who added or suggested each title. Tabs: All / Series / Movies.
5. **Title detail** (drawer or page): poster, synopsis, genres, season list with watched toggles, current season/episode, notes, rating, added by, suggested by, edit and remove (with confirmation).
6. **Add title flow** (modal): pick TV or Movie, search TMDB, preview result, choose added by, suggested by and status, confirm.
7. **Settings**: TMDB key status (set in `.env`, never shown), "Refresh all now", last refresh times, CSV import wizard, backup and restore, default "added by".

## 5. Design system

The theme comes from the Claude Design system "Tulu's Theater" (single theme "After dark"). It is ported into `apps/web/src/styles/`:

- `tokens.css`: CSS custom properties (colour, spacing, duration). `theme.css`: Tailwind v4 `@theme` mapping. Both come from the design system's `tailwind.md`.
- `components.css`: the design system's component styles (`tt-*` classes).
- `components/ui/`: typed React versions of its components (Button, Input, Select, SearchBar, Tabs, Chip, StatusBadge, ReleaseBadge, AddedByBadge, NewEpisodesBadge, PosterCard, EmptyState, Toast, Banner, Dialog, Moon, Sigil, OrnamentRule, Icon). `/design` in the app shows all of them.
- Fonts (Grenze Gotisch, Figtree, JetBrains Mono) are bundled via `@fontsource`, so the app works offline.
- Tailwind v4 replaces the v3 setup from Phase A.

Rules that matter for later phases: neon is for focus and live status only, every status is also a word, and body text never goes below 13px. Tokens are edited in the design system and re-synced, not by hand.

## 6. Implementation phases

| Phase | Scope | Checks at the end |
|---|---|---|
| **A** | Monorepo, scripts, Prisma schema + migration, Express skeleton on 127.0.0.1, Vite + Tailwind theme, layout/nav, UI primitives | typecheck, lint, server boots, `/api/health` |
| **B** | TMDB client + cache, search (TV/movie), add flow, library grid/list, filters, edit, delete | unit tests for TMDB mapping, manual add and search |
| **C** | Status management, quick status menu, season watched toggles, current season/episode | unit tests for status rules |
| **D** | Episode caching, availability logic, dashboard sections, launch-time 24h refresh, offline/error states | unit tests for availability, refresh-preserves-personal-data test |
| **E** | CSV/sheet import with review step, backup/restore, polish, README | importer tests, full test run, README walkthrough |

I will run typecheck, lint and the relevant tests after each phase and report what was built, tested and left over.

## 7. Import plan (Phase E, shaped by your sheet)

1. Export the sheet tabs as CSV (or I read them through the Sheets connector for a one-off seed).
2. Parser normalises titles, merges duplicates across tabs, maps statuses (table in section 1), parses mixed date formats.
3. For each row, search TMDB and propose the top match with poster. Rows you need to resolve are flagged: no type, ambiguous, junk, no match.
4. You review in a table (accept / pick another match / skip), then commit. Nothing is written until you confirm.
5. Panel shows (Taskmaster etc.) import as normal TV series.

## 8. Decisions (confirmed)

- **Repo:** `lalli-oni/tulus-theater`.
- **Added by for imported rows:** a third value `UNKNOWN`, used only by the importer. A **"Fill in unknowns" view** (Settings, with a badge on the nav when any exist) lists every title with `addedBy = UNKNOWN` in a compact table with one-click Alecha / Lalli buttons and optional suggested-by, so cleanup takes a minute. Planned for Phase C (needs the status/edit UI); the importer in Phase E relies on it.
- **Import approach:** a one-off **seed script** (`npm run seed`) instead of a wizard. It reads exported CSVs of the sheet tabs, merges duplicates, maps statuses (section 1), matches titles on TMDB and writes a `seed-report.md` listing unmatched or ambiguous rows for manual adding via the app. The generic CSV import for the app stays in Phase E in simple form.
- **Status mapping, rating, synopsis, Season/Episode cache tables:** accepted as written.
- Everything else below was not objected to, so it is accepted.

## 9. Original assumptions (for reference)

1. **Where should the code live?** No repo exists yet. Do you want a new GitHub repo (name suggestion: `tulus-theater`)? I cannot create one, so you would create it and tell me, and I would attach it. Until then PLAN.md sits in the project files.
2. **Extra fields I added:** `rating` (0-5, from the sheet), `synopsis` for series, cached next-episode fields, `Season` and `Episode` tables. OK?
3. **Added by for old sheet rows:** default to one of you, or leave a third "Unknown" value? I recommend an "Unknown" option only for imported rows, shown as a dash.
4. **Import approach:** review-then-commit wizard (recommended) vs. one-off seed script I run myself. The wizard costs more but doubles as the CSV import feature you asked for.
5. **Statuses from the sheet:** is the mapping in section 1 right? In particular, should anything in Series Log with a year watched be Completed, even if the show has not ended?
6. **"What should we watch next?"** I propose a simple rule-based card: new episodes on Watching shows first, then oldest Wishlist item. No randomness unless you want a "surprise me" button.
7. **Stack details:** TanStack Query, zod, Vitest, ESLint and Prettier, npm workspaces (not pnpm), Node 20+. Fine?
8. **Production mode:** `npm start` serves the built app from Express on `127.0.0.1:3000`; `npm run dev` runs Vite and the API together. Fine?
9. **Backups:** Settings has "Backup now" (copies the SQLite file) plus an automatic daily backup on launch, keeping the last 14. OK?
10. **TMDB:** you will need a free API key (v3 key or read token) from themoviedb.org, region and language default to `en-US`. Streaming-provider info is out of scope for the MVP.
11. **Fonts and decoration:** I will propose a small visual mockup (palette + typography + one card) at the start of Phase A before building the full UI, so you can course-correct early.
