# E2E suite: coverage and findings

Playwright regression suite driving the real app end-to-end against a
dedicated Neon Postgres branch (not the local dev or production database).
See `playwright.config.js` and `fixtures/` for how it's wired up.

## Coverage

- **`tests/auth.spec.js`** — the app's `AuthGate` is a full-screen modal that
  blocks the entire app (every route, not just checkout) until signed in;
  signup/login/logout through the real UI; duplicate email; wrong password;
  the `/admin` route guard for non-admin vs. admin users.
- **`tests/browse.spec.js`** — movie grid rendering, free-text search
  (including the empty-state case, verifying no stale list), now-showing vs.
  upcoming tabs, city switching.
- **`tests/movie-detail.spec.js`** — showtimes grouped by date/cinema,
  navigating into seat selection; the "booking opens closer to release"
  case for upcoming movies.
- **`tests/booking.spec.js`** — the core state-changing action (hold seats →
  pay → confirm) end-to-end with an independently-computed expected total;
  client-side and server-side validation of an empty seat selection;
  rejecting a second confirm of an already-consumed hold; and the
  **concurrency invariant**: two users racing to hold the same seat on the
  same show via simultaneous requests — exactly one wins (`pg_advisory_xact_lock`
  serializes hold attempts per show).
- **`tests/hold-lifecycle.spec.js`** — an expired hold (forced via direct DB
  update, since the real hold duration is 5 minutes) frees the seat back to
  available, is rejected on confirm, and the seat is genuinely re-selectable
  through the UI afterward.
- **`tests/admin-cinemas.spec.js`** — create/edit/delete a cinema through
  the real admin form, each verified by re-fetching from the API afterward
  rather than trusting the response body; non-admin access is blocked.
- **`tests/my-bookings.spec.js`** — empty state before any booking, a
  confirmed booking appearing under "My bookings", cancelling moving it to
  "Cancelled" and freeing the seat, and a non-owner being unable to view
  someone else's booking by direct URL.

## Real bugs found and fixed while building this suite

Both were confirmed independently against the running app with `curl`
before being treated as real defects rather than test artifacts:

1. **`src/data/httpClient.ts`** unconditionally sent `Content-Type:
   application/json` on every request, including bodyless POSTs. Fastify's
   default JSON body parser rejects that combination
   (`FST_ERR_CTP_EMPTY_JSON_BODY`), which meant **Sign out**, releasing a
   stale seat hold, and **Cancel booking** all threw HTTP 500 in the actual
   running app. Fixed: only set the header when a body is present.
2. **`server/app.ts`'s error handler** collapsed every non-`ApiError`
   exception to a generic HTTP 500 — including `@fastify/rate-limit`'s own
   `statusCode: 429` — so a client that was genuinely rate-limited saw an
   indistinguishable "Something went wrong" instead of a real 429. Fixed:
   respect the error's own `statusCode` when present.

## Suite-design notes specific to this app

- **`workers: 1`** — `/api/auth/signup` is rate-limited to 10 requests per
  15 minutes (`server/routes/auth.ts`). Identities are created once per
  worker (`fixtures/auth.js`) and reused across that worker's tests, so
  running in parallel multiplies real signup calls against that budget;
  serial execution keeps the suite comfortably under it.
- **No DB reset script** — this suite runs against a persistent, externally
  provided database rather than a disposable local container, so tests that
  create admin resources (cinemas) clean up after themselves, and
  assertions that depend on "no prior activity" (the pre-booking empty
  state) use a dedicated fresh identity rather than the suite-shared one.

## Run history

Two consecutive full runs from an unreset database: **29/29 passed** both
times. An earlier intermediate run had one flaky test — the very first test
against a freshly-started Vite dev server, timing out on cold-start compile
of the lazy-loaded admin bundle, then passing in 2s on retry — which did
not recur in either of the two clean back-to-back runs.
