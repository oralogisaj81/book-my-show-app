import { eq } from 'drizzle-orm'
import type { Booking } from '../../shared/types/domain'
import { ApiError } from '../../shared/lib/apiError'
import { generateId } from '../../shared/lib/id'
import { buildTicketQrPayload } from '../../shared/lib/qr'
import { computeTierBreakdown, sumTierBreakdown } from '../../shared/lib/seatGrid'
import { db } from '../db/client'
import { bookings, screens, shows } from '../db/schema'
import { consumeHold } from './seatLock'

const CONVENIENCE_FEE_RATE = 0.05

/** The DB row has cancelledAt as `null`; the domain type declares it optional (`undefined`). */
export function toDomainBooking(row: typeof bookings.$inferSelect): Booking {
  return { ...row, cancelledAt: row.cancelledAt ?? undefined }
}

export async function confirmBooking(holdId: string, userId: string): Promise<Booking> {
  return db.transaction(async (tx) => {
    const hold = await consumeHold(tx, holdId)
    if (!hold) {
      throw new ApiError('HOLD_EXPIRED', 'Your seat hold has expired. Please select your seats again.')
    }
    const [show] = await tx.select().from(shows).where(eq(shows.id, hold.showId)).limit(1)
    if (!show) throw new ApiError('SHOW_NOT_FOUND', 'This show could not be found.')
    const [screen] = await tx.select().from(screens).where(eq(screens.id, show.screenId)).limit(1)
    if (!screen) throw new ApiError('SCREEN_NOT_FOUND', 'This screen could not be found.')

    const tierBreakdown = computeTierBreakdown(hold.seatIds, screen.layout, show.priceOverrides)
    const subtotal = sumTierBreakdown(tierBreakdown)
    const convenienceFee = Math.round(subtotal * CONVENIENCE_FEE_RATE)
    const id = generateId('bkg')
    const booking: Booking = {
      id,
      userId,
      showId: hold.showId,
      seatIds: hold.seatIds,
      tierBreakdown,
      subtotal,
      convenienceFee,
      total: subtotal + convenienceFee,
      status: 'confirmed',
      qrPayload: buildTicketQrPayload(id, hold.showId, hold.seatIds),
      createdAt: new Date().toISOString(),
    }
    await tx.insert(bookings).values(booking)
    return booking
  })
}

export async function cancelBooking(bookingId: string, userId: string): Promise<Booking> {
  return db.transaction(async (tx) => {
    const [booking] = await tx.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1)
    if (!booking) throw new ApiError('BOOKING_NOT_FOUND', 'Booking not found.')
    if (booking.userId !== userId) throw new ApiError('FORBIDDEN', 'You do not have access to this booking.')
    if (booking.status === 'cancelled') return toDomainBooking(booking)
    const [updated] = await tx
      .update(bookings)
      .set({ status: 'cancelled', cancelledAt: new Date().toISOString() })
      .where(eq(bookings.id, bookingId))
      .returning()
    return toDomainBooking(updated)
  })
}
