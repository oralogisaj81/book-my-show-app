import { test, expect } from '../fixtures/auth.js'
import { uniqueEmail } from '../fixtures/api-helpers.js'
import { AuthGatePage } from '../pages/AuthGatePage.js'
import { HomePage } from '../pages/HomePage.js'

test.describe('auth gate', () => {
  test('an anonymous visitor is blocked by the full-screen auth gate on every route, not just checkout', async ({
    page,
  }) => {
    // App.tsx renders <AuthGate /> whenever status === 'unauthenticated', over
    // the whole viewport — there's no separate public-browsing mode.
    await page.goto('/')
    const gate = new AuthGatePage(page)
    await gate.waitFor()
    await expect(gate.heading).toBeVisible()

    // Even a deep link doesn't bypass it.
    await page.goto('/account')
    await gate.waitFor()
    await expect(gate.heading).toBeVisible()
  })

  test('sign up through the real UI, land signed in, sign out, sign back in', async ({ page }) => {
    const gate = new AuthGatePage(page)
    const home = new HomePage(page)
    const email = uniqueEmail('ui-signup')
    const password = 'TestPass123!'
    const name = 'UI Signup Tester'

    await page.goto('/')
    await gate.waitFor()

    const signupResponse = await gate.signUp({ name, email, password })
    expect(signupResponse.status()).toBe(200)
    await expect(gate.heading).not.toBeVisible()
    await expect(page.getByRole('button', { name: new RegExp(name.split(' ')[0]) })).toBeVisible()

    // Sign out — the gate should reappear immediately.
    await page.getByRole('button', { name: new RegExp(name.split(' ')[0]) }).click()
    await page.getByRole('button', { name: 'Sign out' }).click()
    await gate.waitFor()

    // Sign back in with the same credentials.
    const loginResponse = await gate.signIn({ email, password })
    expect(loginResponse.status()).toBe(200)
    await expect(gate.heading).not.toBeVisible()
    await home.searchInput.waitFor({ state: 'visible' })
  })

  // These two reuse the worker-scoped `user` identity's email/password
  // (already registered by the `user` fixture) on a fresh, unauthenticated
  // `page` rather than signing up a brand-new account — /api/auth/signup is
  // rate-limited to 10 req/15min (see fixtures/auth.js), and this suite
  // doesn't need a second real account to prove either of these error paths.
  test('duplicate email on signup is rejected with a clear error, not a silent failure', async ({ page, user }) => {
    const gate = new AuthGatePage(page)
    await page.goto('/')
    await gate.waitFor()

    await gate.signUp({ name: 'Duplicate Attempt', email: user.email, password: 'AnotherPass123!' })
    await expect(gate.error).toHaveText(/already exists/i)
    // Still on the gate — the failed signup did not sign anyone in.
    await expect(gate.heading).toBeVisible()
  })

  test('wrong password shows an error and does not sign in', async ({ page, user }) => {
    const gate = new AuthGatePage(page)
    await page.goto('/')
    await gate.waitFor()

    await gate.signIn({ email: user.email, password: 'DefinitelyWrongPassword!' })
    await expect(gate.error).toHaveText(/invalid email or password/i)
    await expect(gate.heading).toBeVisible()
  })
})

test.describe('admin route guard', () => {
  test('a signed-in, non-admin user hitting /admin is redirected away', async ({ user }) => {
    await user.page.goto('/admin')
    await expect(user.page).toHaveURL('/')
  })

  test('an admin user can reach the admin console', async ({ admin }) => {
    await admin.page.goto('/admin')
    await expect(admin.page).toHaveURL(/\/admin$/)
    await expect(admin.page.getByRole('heading', { name: 'Admin console' })).toBeVisible()
  })
})
