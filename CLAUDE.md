# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # Vite (HMR, :5173) + Fastify (tsx watch, :4000) together, proxied
npm run build             # tsc -b && vite build && tsc -p tsconfig.server.json, then writes dist-server/package.json
npm start                 # runs the production build: node dist-server/server/index.js
npm run lint               # oxlint
npm run db:generate        # drizzle-kit generate — after editing server/db/schema.ts
npm run db:migrate         # tsx server/db/migrate.ts — applies pending migrations
npm run db:seed            # tsx server/db/seed.ts — seeds cities/movies/cinemas/shows
npm run admin:promote -- <email>   # flips is_admin on an existing account

npm run test:e2e           # Playwright e2e suite (headed)
npm run test:e2e:headless  # same, headless
npm run test:e2e:ui        # Playwright UI mode
npm run test:e2e:report    # opens the last HTML report
```

To run a single spec or test: `npx playwright test --config e2e/playwright.config.js
e2e/tests/booking.spec.js` or add `-g "<test name>"`.

Type-checking: `npx tsc -b` (frontend, via project references in `tsconfig.json`) and
`npx tsc -p tsconfig.server.json --noEmit` (server) are separate builds — run both when
touching anything under `shared/`, since it's compiled by both.

Requires a `.env` (see `.env.example`) with `DATABASE_URL` (Neon Postgres, pooled
connection string) and `SESSION_SECRET` (random hex, see the comment in `.env.example`
for how to generate one).

## Testing

The `e2e/` directory is a Playwright suite (`e2e/playwright.config.js`) that runs against
real `vite`/`tsx watch` dev servers and a real database — it is not run against `.env`,
but against `.env.test` (a separate Neon branch), loaded explicitly by the config rather
than through the app's default dotenv lookup, so a test run can never touch the dev
database. Page objects live in `e2e/pages/`, specs in `e2e/tests/`, and shared setup in
`e2e/fixtures/` (`auth.js`, `db.js`, `api-helpers.js`).

Two things worth knowing before changing this suite:
- **Execution is forced serial** (1 worker), not Playwright's usual local default of
  several. `/api/auth/signup` is rate-limited to 10 req/15min
  (`server/routes/auth.ts`), and each worker creates its own `user`/`admin` identity
  once via `registerUser` (worker-scoped fixture in `e2e/fixtures/auth.js`) rather than
  per-test, so worker count directly multiplies real signup calls against that budget.
  See the comment in `e2e/playwright.config.js` before changing worker count or retries.
- **Auth fixtures sign up via direct API call, not the UI** (`e2e/fixtures/auth.js`),
  then inject the resulting session cookie into the browser context via `storageState`
  — the actual sign-in *form* is only exercised in `e2e/tests/auth.spec.js`.
  `e2e/fixtures/db.js` connects directly to the test Postgres branch for the two things
  with no API surface: promoting a user to admin, and force-expiring a seat hold
  (`HOLD_DURATION_MS` is 5 minutes — the lifecycle spec doesn't wait for it in real time).

## Architecture

**Single artifact, no separate frontend/backend deploys.** `npm run build` compiles the
React app into `dist/` and compiles `server/` (CommonJS, via `tsconfig.server.json`) into
`dist-server/`. One Fastify process (`server/index.ts`) serves both: API routes under
`/api/*`, and `dist/` as static files with an SPA fallback (`server/app.ts`) for everything
else. In dev, Vite and Fastify run as separate processes via `concurrently`, with Vite's
`server.proxy` forwarding `/api` to Fastify on `:4000` (`vite.config.ts`).

**`shared/` is the single source of truth for domain logic**, imported by both `src/`
(via the `@shared` alias) and `server/` (via relative imports) — never duplicate pricing,
seat-grid, or ID-generation logic between the two:
- `shared/types/domain.ts` — domain types (`Movie`, `Show`, `Booking`, `SeatState`, `UserProfile`, ...)
- `shared/lib/seatGrid.ts` — seat enumeration and tier price-breakdown math
- `shared/lib/id.ts`, `qr.ts`, `format.ts` — ID generation, QR payload shape, formatting
- `shared/lib/apiError.ts` — the `ApiError` class thrown by the server and caught by the frontend

**Frontend data-access boundary**: `src/data/api.ts` defines the `BookingApi` interface;
`src/data/httpApi.ts` implements it against the Fastify backend; `src/data/apiClient.ts`
is the *only* place that should ever be imported from — hooks and components go through
`api` from `apiClient.ts`, never `httpApi.ts` directly, so the implementation stays
swappable. Auth (`src/data/authApi.ts`) is deliberately kept separate from `BookingApi` —
it's a cross-cutting concern, not a booking-domain method. `src/data/httpClient.ts` holds
the shared `request`/`qs`/`toUndefinedOn404` fetch helpers both of the above build on.

**Seat holds use a Postgres advisory lock, not Redis.** `server/services/seatLock.ts`
wraps hold creation in `pg_advisory_xact_lock(hashtext(showId))` — this serializes
concurrent hold attempts *for the same show* while letting different shows proceed in
parallel. Holds expire after 5 minutes; reads treat expired holds as available, and a
periodic sweep (started in `server/index.ts`) clears stale rows.

**Auth**: scrypt password hashing (`server/lib/password.ts`, Node core, no bcrypt/argon2
dependency) plus a hand-rolled HMAC-SHA256-signed httpOnly session cookie
(`server/lib/session.ts` — payload is `userId.expiresAt.signature`, verified with
`timingSafeEqual`) instead of `@fastify/secure-session` (avoids the `sodium-native`
native dependency) or a DB-backed session table. `server/lib/authGuard.ts` exports
`requireAuth`/`requireAdmin` as Fastify `preHandler`s; `requireAdmin` is applied via
`app.addHook('preHandler', requireAdmin)` inside `adminRoutes` (Fastify plugin
encapsulation — it only affects routes registered on that plugin instance, not globally).
Login failures always return the same generic "Invalid email or password" regardless of
whether the email exists (no user-enumeration signal). `confirmBooking`/`cancelBooking`/
`bookings/me` always derive `userId` from the session, never from the request body.
There's no seeded admin — promote an account after signup with `npm run admin:promote`.

**Route → service → db layering**: `server/routes/*.ts` are thin Fastify handlers;
business logic lives in `server/services/*.ts` (`booking.ts`, `seatLock.ts`, `seatMap.ts`,
`analytics.ts`, `users.ts`); `server/db/schema.ts` (Drizzle) and `server/db/client.ts`
(exports `pool`, `db`, and a `DbExecutor` type so services can accept either the
top-level `db` or a transaction handle) are the persistence layer. Errors are thrown as
`ApiError(code, message)` from anywhere in this stack and translated to HTTP status codes
in one place — `server/lib/httpError.ts`'s `statusForErrorCode`, used by the single
`setErrorHandler` in `server/app.ts`.

**State**: TanStack Query for all server data (hooks in `src/hooks/`, one hook file per
domain area), Zustand for client-only state — `src/store/authStore.ts` (session status,
*not* persisted — the httpOnly cookie is the actual source of truth, so there's nothing
safe to rehydrate from localStorage), `bookingFlowStore.ts` (in-progress seat
selection/hold), `cityStore.ts`.

## Deployment

Deployed on Render (free tier) as a single web service, auto-deploying from `main`.
Build command is `npm install --include=dev && npm run build` — the `--include=dev` is
required because Render sets `NODE_ENV=production`, which makes plain `npm install` skip
devDependencies (vite, typescript, etc.) that the build needs. Database is Neon
serverless Postgres — same `DATABASE_URL` for local dev and production.
