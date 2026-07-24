import { test, expect } from '../fixtures/auth.js'
import { findBookableShow, firstAvailableSeatId, getSeatMap } from '../fixtures/api-helpers.js'
import { expireHold } from '../fixtures/db.js'
import { SeatSelectionPage } from '../pages/SeatSelectionPage.js'

// The app has no background scheduler (unlike the reference app's
// @Scheduled lifecycle job) — a hold's only time-driven transition is its
// own expiresAt, read lazily by computeSeatMap (`gt(seatHolds.expiresAt,
// now())`) and by consumeHold at confirm time. HOLD_DURATION_MS is 5
// minutes in server/services/seatLock.ts, far too long to wait on in a
// test, so these force expiry directly in Postgres instead.
test.describe('seat hold expiry', () => {
  test('an expired hold frees the seat back to available for other viewers', async ({ user }) => {
    const { show } = await findBookableShow(user.api)
    const seatMap = await getSeatMap(user.api, show.id)
    const seatId = firstAvailableSeatId(seatMap)

    const holdRes = await user.api.post(`/api/shows/${show.id}/hold`, {
      data: { seatIds: [seatId], holderId: user.profile.id },
    })
    const { hold } = await holdRes.json()

    const heldMap = await getSeatMap(user.api, show.id)
    expect(heldMap.find((s) => s.seatId === seatId)?.status).toBe('held')

    await expireHold(hold.id)

    const freedMap = await getSeatMap(user.api, show.id)
    expect(freedMap.find((s) => s.seatId === seatId)?.status).toBe('available')
  })

  test('confirming an expired hold is rejected with HOLD_EXPIRED, not silently accepted', async ({ user }) => {
    const { show } = await findBookableShow(user.api)
    const seatMap = await getSeatMap(user.api, show.id)
    const seatId = firstAvailableSeatId(seatMap)

    const holdRes = await user.api.post(`/api/shows/${show.id}/hold`, {
      data: { seatIds: [seatId], holderId: user.profile.id },
    })
    const { hold } = await holdRes.json()
    await expireHold(hold.id)

    const confirmRes = await user.api.post('/api/bookings/confirm', { data: { holdId: hold.id } })
    expect(confirmRes.status()).toBe(410)
    const body = await confirmRes.json()
    expect(body.code).toBe('HOLD_EXPIRED')

    // The seat was never actually booked — no booking row, no stuck "held" state.
    const seatMapAfter = await getSeatMap(user.api, show.id)
    expect(seatMapAfter.find((s) => s.seatId === seatId)?.status).toBe('available')
  })

  test('a freed seat is re-selectable through the real seat map UI', async ({ user }) => {
    const { show } = await findBookableShow(user.api)
    const seatMap = await getSeatMap(user.api, show.id)
    const seatId = firstAvailableSeatId(seatMap)

    const holdRes = await user.api.post(`/api/shows/${show.id}/hold`, {
      data: { seatIds: [seatId], holderId: user.profile.id },
    })
    const { hold } = await holdRes.json()
    await expireHold(hold.id)

    const seatPage = new SeatSelectionPage(user.page)
    await seatPage.goto(show.id)
    await seatPage.selectSeat(seatId)
    // A blocked (held/booked) seat button is disabled and never toggles
    // "selected" styling — the click itself is the assertion that it's
    // genuinely interactive again, not merely present in the DOM.
    await expect(seatPage.seat(seatId)).toHaveClass(/bg-brand-500/)
  })
})
