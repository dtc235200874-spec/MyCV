# AGENTS.md

## Repo layout
- Root (`index.html`, `style.css`, `cv_source.pdf`) is a static CV page; unrelated to the app.
- The actual app lives in `electronics-shop/`. Root `package.json` only delegates scripts into that folder.
- `d?MyCVelectronics-shop/` is a stale empty scaffold; ignore it.

## Stack
- Backend: Cloudflare Worker using Hono (`electronics-shop/src/index.js`).
- Database: Cloudflare D1 (SQLite). Schema + seed in `electronics-shop/migrations/0001_init.sql`.
- File storage: Cloudflare R2 (product images via `/api/upload`, served via `/api/images/:key`).
- Frontend: React + Vite in `electronics-shop/client/`, built to `client/dist` and served by the Worker through the `ASSETS` binding.

## Commands (run from `electronics-shop/`)
- Install: `npm install` then `cd client && npm install`
- Build frontend: `npm run build` (runs `cd client && npm run build`)
- Local DB migrate: `npm run db:migrate:local` (required before first `dev`)
- Dev server: `npm run dev` → `http://localhost:8787` (Vite dev proxies `/api` to 8787)
- Deploy: `npm run deploy` (build + `wrangler deploy`); remote migrate: `npm run db:migrate:remote`

## Gotchas
- D1 local state is in `.wrangler/` (gitignored). If the DB is stale or migration changes, delete `.wrangler/` then re-run `db:migrate:local`.
- `wrangler.toml` ships a placeholder `database_id`; replace it with the real D1 id before remote deploy.
- JWT verification uses `hono/jwt` and **requires** the algorithm argument: `verify(token, secret, 'HS256')`. Omitting it throws.
- Password hashing uses `bcryptjs` (pure JS, Workers-compatible). Do not swap in native `bcrypt`.
- `client/dist` is committed so the app runs without a build, but rebuild after frontend changes.
- No test suite exists; verify with manual smoke tests against `http://localhost:8787`.
- Seed accounts: `admin@shop.com` / `admin123` (admin), `user@shop.com` / `123456` (customer).

## Conventions
- API routes are all under `/api/*`; everything else falls through to the SPA (`client/dist/index.html`).
- Admin-only routes go through `adminMiddleware`; authenticated routes through `authMiddleware`.