# Tulu's Theater

A local-first shared TV series and movie tracker. Runs only on your computer; the collection works offline, and TMDB is used for lookups and refreshes. See [PLAN.md](PLAN.md) for the design.

## Requirements
- Node.js 20+
- A free [TMDB API key](https://www.themoviedb.org/settings/api) (needed from Phase B)

## Setup
```bash
npm install
cp .env.example .env      # then add TMDB_API_KEY
npm run db:migrate        # creates apps/server/data/theater.db
```

## Scripts
| Command | What it does |
|---|---|
| `npm run dev` | API on 127.0.0.1:3000 and web app on http://localhost:5173 |
| `npm run build` | Typechecks and builds the web app |
| `npm start` | Serves the built app and API on http://127.0.0.1:3000 |
| `npm test` | Runs all tests |
| `npm run typecheck` / `npm run lint` | Static checks |
| `npm run db:migrate` / `db:studio` | Apply migrations / browse the database |

## Structure
- `apps/web`: React + Vite + Tailwind
- `apps/server`: Express + Prisma + SQLite
- `packages/shared`: types and zod schemas shared by both

The TMDB key lives only in `.env` on the server and is never sent to the browser.
