import { request } from '@playwright/test'
import { test, expect } from '../fixtures/auth.js'
import {
  BACKEND_URL,
  confirmBooking,
  findBookableShow,
  firstAvailableSeatId,
  getSeatMap,
  registerUser,
  uniqueEmail,
} from '../fixtures/api-helpers.js'
import { AccountPage } from '../pages/AccountPage.js'
import { ConfirmationPage } from '../pages/ConfirmationPage.js'

async function bookOneSeat(api, profile, show) {
  const seatMap = await getSeatMap(api, show.id)
  const seatId = firstAvailableSeatId(seatMap)
  const holdRes = await api.post(`/api/shows/${show.id}/hold`, { data: { seatIds: [seatId], holderId: profile.id } })
  const { hold } = await holdRes.json()
  return { booking: await confirmBooking(api, hold.id), seatId }
}

test.describe('"my bookings" / receipt views', () => {
  test('before any booking, the active tab shows the empty state', async ({ browser }) => {
    // Deliberately a brand-new identity of its own, not the suite's shared
    // worker-scoped `user` (see fixtures/auth.js) — that identity is reused
    // across every other spec in this worker and, by the time this file
    // runs, already has real bookings from booking.spec.js's happy-path
    // test. "Before any booking" can only be proven on an account that has
    // genuinely never booked anything.
    const api = await request.newContext({ baseURL: BACKEND_URL })
    const email = uniqueEmail('empty-state')
    await registerUser(api, { name: 'Empty State Tester', email, password: 'TestPass123!' })
    const storageState = await api.storageState()
    const context = await browser.newContext({ storageState })
    const page = await context.newPage()

    const account = new AccountPage(page)
    await account.goto()
    // A generous margin over the default 5s: this is this account's very
    // first API call, and a Neon serverless connection that's gone idle can
    // take longer than 5s to re-establish on a cold first query.
    await expect(account.emptyState).toBeVisible({ timeout: 15_000 })

    await context.close()
    await api.dispose()
  })

  test('a confirmed booking appears under "My bookings" with the upcoming label', async ({ user }) => {
    const { movie, show } = await findBookableShow(user.api)
    const { seatId } = await bookOneSeat(user.api, user.profile, show)

    const account = new AccountPage(user.page)
    await account.goto()
    const card = account.cardForBooking(movie.title, seatId)
    await expect(card).toBeVisible()
    await expect(card.getByText('Upcoming')).toBeVisible()
  })

  test('cancelling a booking moves it from "My bookings" to "Cancelled", and frees the seat', async ({ user }) => {
    const { movie, show } = await findBookableShow(user.api)
    const { seatId } = await bookOneSeat(user.api, user.profile, show)

    const account = new AccountPage(user.page)
    await account.goto()
    const card = account.cardForBooking(movie.title, seatId)
    await expect(card).toBeVisible()

    const cancelResponse = await account.cancelBooking(card)
    expect(cancelResponse.status()).toBe(200)
    await expect(card).not.toBeVisible()

    await account.cancelledTab.click()
    const cancelledCard = account.cardForBooking(movie.title, seatId)
    await expect(cancelledCard).toBeVisible()
    await expect(cancelledCard.getByText('Cancelled', { exact: true })).toBeVisible()
    await expect(cancelledCard.getByRole('button', { name: /^Cancel$/ })).toHaveCount(0)

    const seatMapAfter = await getSeatMap(user.api, show.id)
    expect(seatMapAfter.find((s) => s.seatId === seatId)?.status).toBe('available')
  })

  test('a booking cannot be viewed via direct URL by a user who does not own it', async ({ user, browser }) => {
    const { show } = await findBookableShow(user.api)
    const { booking } = await bookOneSeat(user.api, user.profile, show)

    const context = await browser.newContext()
    const outsiderPage = await context.newPage()
    // Register a second, unrelated account directly through the UI's own
    // gate (cheap here since it's the thing being set up, not the thing
    // under test) so this second identity is a real signed-in session.
    await outsiderPage.goto('/booking/' + booking.id)
    const gateHeading = outsiderPage.getByRole('heading', { name: 'Welcome to CineHall' })
    await gateHeading.waitFor({ state: 'visible' })
    await outsiderPage.getByRole('button', { name: 'Sign up', exact: true }).click()
    await outsiderPage.getByPlaceholder('Your name').fill('Outsider Viewer')
    await outsiderPage.getByPlaceholder('Email').fill(`outsider-${Date.now()}@e2e.cinehall.internal`)
    await outsiderPage.getByPlaceholder(/^Password/).fill('TestPass123!')
    await outsiderPage.getByPlaceholder('Confirm password').fill('TestPass123!')
    await outsiderPage.locator('form button[type="submit"]').click()
    await gateHeading.waitFor({ state: 'hidden' })

    await outsiderPage.goto('/booking/' + booking.id)
    const confirmation = new ConfirmationPage(outsiderPage)
    await expect(confirmation.notFoundMessage).toBeVisible()
    await context.close()
  })
})
