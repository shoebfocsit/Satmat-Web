# SATMAT

SATMAT is a Satta Matka gaming platform delivered as three apps backed by a single shared API:

| Directory   | What it is                                  | Stack                                  |
|-------------|---------------------------------------------|----------------------------------------|
| `src/`      | Web app (Next.js PWA: auth, wallet, bids)   | Next.js 15, React 19, Tailwind 4        |
| `backend/`  | Shared API for both frontends               | NestJS 10, Prisma, Postgres             |
| `Website/`  | Marketing landing (read-only live data)     | Vite, React 19, Tailwind 4              |

API contract: run the backend and open Swagger at `http://localhost:8080/api/v1/docs`.
Repo-level architecture, security and deployment notes: see [`ARCHITECTURE.md`](../ARCHITECTURE.md) and [`SECURITY.md`](../SECURITY.md).

## Prerequisites

- Node.js 20+
- Postgres (for the backend) — see `backend/docker-compose.yml`

## Run the web app

```bash
npm install
npm run dev        # http://localhost:3000
```

The web app is 100% live — markets, results, charts, notices, game types and
rates are read straight from the backend. There are no mock or sample
fallbacks: when the backend is unreachable the UI renders an honest
error/offline state.

## Run the backend

```bash
cd backend
npm install
cp .env.example .env   # fill in DATABASE_URL, JWT secrets, provider keys
npx prisma migrate deploy
npm run db:seed
npm run start:dev      # http://localhost:8080/api/v1
```

Swagger docs: `http://localhost:8080/api/v1/docs`. Mock providers are the
default (`*_PROVIDER=mock`); swap to real providers and set keys before going
to production. **Never commit `.env`.**

## Tests

```bash
# web
npm run typecheck
npm run build

# backend
cd backend
npm run typecheck
npm test
```

## Security notes (before production)

- Replace all `change-me-*` secrets in `backend/.env` (see `backend/.env.example`).
- Set `MANUAL_PAYMENTS=false` — `true` settles money with no gateway (test only).
- Refresh-token / OTP / idempotency stores require `REDIS_URL` in production
  (`MemoryCache` is a local-dev fallback only).
- Add real payment/SMS/push providers (`mock` is the default).
- See [`SECURITY.md`](../SECURITY.md) for the full checklist.

## Deploy to Vercel

1. Import the GitHub repo on [vercel.com](https://vercel.com)
2. Set **Root Directory** to `web`
3. Add environment variable:
   - `API_BASE_URL` = `https://satmat-backendfinal.onrender.com` (PRIVATE — server-side only)
4. Deploy — Vercel auto-detects Next.js
