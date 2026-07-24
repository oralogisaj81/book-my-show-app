import { request } from '@playwright/test'
import { test, expect } from '../fixtures/auth.js'
import {
  BACKEND_URL,
  computeExpectedTotal,
  findBookableShow,
  firstAvailableSeatId,
  firstAvailableSeatIds,
  getSeatMap,
  holdSeatsRaw,
  registerUser,
  uniqueEmail,
} from '../fixtures/api-helpers.js'
import { SeatSelectionPage } from '../pages/SeatSelectionPage.js'
import { CheckoutPage } from '../pages/CheckoutPage.js'
import { ConfirmationPage } from '../pages/ConfirmationPage.js'

test.describe('the core action: hold seats -> confirm booking', () => {
  test('happy path: select seats, hold, pay, and land on a confirmation ticket for exactly those seats', async ({
    user,
  }) => {
    const { show, screen } = await findBookableShow(user.api)
    const seatMap = await getSeatMap(user.api, show.id)
    const seatIds = firstAvailableSeatIds(seatMap, 2)
    const expected = computeExpectedTotal(seatMap, screen, show, seatIds)

    const seatPage = new SeatSelectionPage(user.page)
    await seatPage.goto(show.id)
    for (const seatId of seatIds) await seatPage.selectSeat(seatId)

    const holdResponse = await seatPage.proceed()
    expect(holdResponse.status()).toBe(200)
    await expect(user.page).toHaveURL(`/book/${show.id}/checkout`)

    const checkout = new CheckoutPage(user.page)
    // Derived from data already in hand (seat map + layout), not re-read off
    // the page after a state-changing action — avoids the stale-poll-style
    // trap of trusting a second UI read for a value we already computed.
    await expect(checkout.payButton).toContainText(new RegExp(expected.total.toLocaleString('en-IN')))

    await checkout.fillPaymentDetails()
    const confirmResponse = await checkout.pay()
    expect(confirmResponse.status()).toBe(200)
    const booking = await confirmResponse.json()

    await expect(user.page).toHaveURL(`/booking/${booking.id}`)
    const confirmation = new ConfirmationPage(user.page)
    await expect(confirmation.heading).toBeVisible()
    expect(booking.total).toBe(expected.total)
    expect([...booking.seatIds].sort()).toEqual([...seatIds].sort())

    // Side effect verified via the API, not just "no error was shown": the
    // booked seats now read as booked for every future viewer of this show.
    const seatMapAfter = await getSeatMap(user.api, show.id)
    for (const seatId of seatIds) {
      expect(seatMapAfter.find((s) => s.seatId === seatId)?.status).toBe('booked')
    }
  })

  test('the proceed button is disabled until at least one seat is selected', async ({ user }) => {
    const { show } = await findBookableShow(user.api)
    const seatPage = new SeatSelectionPage(user.page)
    await seatPage.goto(show.id)
    await expect(seatPage.proceedButton).toBeDisabled()
  })

  test('server rejects an empty seat selection independently of the client', async ({ user }) => {
    const { show } = await findBookableShow(user.api)
    const { status, body } = await holdSeatsRaw(user.api, show.id, [], user.profile.id)
    expect(status).toBe(400)
    expect(body.code).toBe('NO_SEATS_SELECTED')
  })

  test('confirming an already-consumed hold a second time is rejected, not silently re-accepted', async ({
    user,
  }) => {
    const { show } = await findBookableShow(user.api)
    const seatMap = await getSeatMap(user.api, show.id)
    const seatId = firstAvailableSeatId(seatMap)

    const holdRes = await user.api.post(`/api/shows/${show.id}/hold`, {
      data: { seatIds: [seatId], holderId: user.profile.id },
    })
    const { hold } = await holdRes.json()

    const first = await user.api.post('/api/bookings/confirm', { data: { holdId: hold.id } })
    expect(first.status()).toBe(200)

    const second = await user.api.post('/api/bookings/confirm', { data: { holdId: hold.id } })
    expect(second.status()).toBe(410)
    const body = await second.json()
    expect(body.code).toBe('HOLD_EXPIRED')
  })

  test('concurrency invariant: two users racing for the same seat — exactly one wins', async ({ user }) => {
    const { show } = await findBookableShow(user.api)
    const seatMap = await getSeatMap(user.api, show.id)
    const seatId = firstAvailableSeatId(seatMap)

    const otherApi = await request.newContext({ baseURL: BACKEND_URL })
    const otherEmail = uniqueEmail('racer')
    const otherProfile = await registerUser(otherApi, {
      name: 'Racer Two',
      email: otherEmail,
      password: 'TestPass123!',
    })

    try {
      const [resA, resB] = await Promise.all([
        user.api.post(`/api/shows/${show.id}/hold`, { data: { seatIds: [seatId], holderId: user.profile.id } }),
        otherApi.post(`/api/shows/${show.id}/hold`, { data: { seatIds: [seatId], holderId: otherProfile.id } }),
      ])

      const statuses = [resA.status(), resB.status()].sort()
      // Never both succeed, never both fail — the pg_advisory_xact_lock
      // serializes these two hold attempts for this show, so exactly one
      // sees the seat as available and the other sees the just-created hold.
      expect(statuses).toEqual([200, 409])

      const winnerRes = resA.status() === 200 ? resA : resB
      const winnerBody = await winnerRes.json()

      const seatMapAfter = await getSeatMap(user.api, show.id)
      const finalSeat = seatMapAfter.find((s) => s.seatId === seatId)
      expect(finalSeat.status).toBe('held')
      expect(winnerBody.hold.seatIds).toContain(seatId)
    } finally {
      await otherApi.dispose()
    }
  })
})
