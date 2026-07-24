// Auth-via-API, not auth-via-UI: each identity signs up by calling the
// backend directly (fast, isolates its identity from every other test's),
// then transfers the resulting `cinehall_session` cookie into a real browser
// context via storageState. This works even though the API call hits a
// different port (:4000) than the app under test (:5173) — cookies are
// scoped by domain ("localhost"), not port, so a cookie obtained talking to
// the backend directly is sent automatically once that same context
// navigates to the frontend's dev-server port. Driving the actual sign-in
// form is covered separately in tests/auth.spec.js.
//
// Identities are created once per *worker*, not once per test: /api/auth/
// signup is rate-limited to 10 requests / 15 minutes per IP
// (server/routes/auth.ts's AUTH_RATE_LIMIT), and this suite has ~25 tests —
// one signup per test would blow through that real limit well before the
// suite finishes, which would look like random 429s ("flakiness") rather
// than the deterministic, load-bearing behavior it actually is. Each test
// still gets its own fresh browser context/page (via the `user`/`admin`
// fixtures below), so there's no cross-test UI-state leakage — only the
// underlying account is shared across the tests running in one worker, and
// workers run their tests strictly sequentially, never concurrently with
// each other on the same identity.
import { test as base, request as playwrightRequest } from '@playwright/test'
import { registerUser, uniqueEmail, BACKEND_URL } from './api-helpers.js'
import { promoteToAdmin } from './db.js'

export const test = base.extend({
  userIdentity: [
    async ({}, use, testInfo) => {
      const api = await playwrightRequest.newContext({ baseURL: BACKEND_URL })
      const email = uniqueEmail(`user-${testInfo.workerIndex}`)
      const password = 'TestPass123!'
      const name = `E2E User ${testInfo.workerIndex}`
      const profile = await registerUser(api, { name, email, password })
      const storageState = await api.storageState()
      await use({ api, email, password, name, profile, storageState })
      await api.dispose()
    },
    { scope: 'worker' },
  ],

  user: async ({ browser, userIdentity }, use) => {
    const context = await browser.newContext({ storageState: userIdentity.storageState })
    const page = await context.newPage()
    await use({
      page,
      context,
      api: userIdentity.api,
      email: userIdentity.email,
      password: userIdentity.password,
      name: userIdentity.name,
      profile: userIdentity.profile,
    })
    await context.close()
  },

  adminIdentity: [
    async ({}, use, testInfo) => {
      const api = await playwrightRequest.newContext({ baseURL: BACKEND_URL })
      const email = uniqueEmail(`admin-${testInfo.workerIndex}`)
      const password = 'TestPass123!'
      const name = `E2E Admin ${testInfo.workerIndex}`
      const profile = await registerUser(api, { name, email, password })
      await promoteToAdmin(email)
      // The signup response's session cookie was minted before the
      // promotion — its payload is just `userId.expiresAt.sig` (no embedded
      // role), and `requireAdmin` re-checks `isAdmin` from the DB on every
      // request rather than trusting anything baked into the cookie, so the
      // existing session is valid for admin routes without a re-login.
      const storageState = await api.storageState()
      await use({ api, email, password, name, profile, storageState })
      await api.dispose()
    },
    { scope: 'worker' },
  ],

  admin: async ({ browser, adminIdentity }, use) => {
    const context = await browser.newContext({ storageState: adminIdentity.storageState })
    const page = await context.newPage()
    await use({
      page,
      context,
      api: adminIdentity.api,
      email: adminIdentity.email,
      password: adminIdentity.password,
      name: adminIdentity.name,
      profile: adminIdentity.profile,
    })
    await context.close()
  },
})

export { expect } from '@playwright/test'
