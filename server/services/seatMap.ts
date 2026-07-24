import { and, eq, gt, sql } from 'drizzle-orm'
import type { SeatState } from '../../shared/types/domain'
import { enumerateSeats } from '../../shared/lib/seatGrid'
import { db, type DbExecutor } from '../db/client'
import { bookings, screens, seatHolds, shows } from '../db/schema'

export async function computeSeatMap(showId: string, executor: DbExecutor = db): Promise<SeatState[]> {
  const [show] = await executor.select().from(shows).where(eq(shows.id, showId)).limit(1)
  if (!show) return []
  const [screen] = await executor.select().from(screens).where(eq(screens.id, show.screenId)).limit(1)
  if (!screen) return []

  const seatMeta = enumerateSeats(screen.layout)

  const confirmedBookings = await executor
    .select({ seatIds: bookings.seatIds })
    .from(bookings)
    .where(and(eq(bookings.showId, showId), eq(bookings.status, 'confirmed')))
  const bookedSeatIds = new Set(confirmedBookings.flatMap((b) => b.seatIds))

  const activeHolds = await executor
    .select({ seatIds: seatHolds.seatIds })
    .from(seatHolds)
    .where(and(eq(seatHolds.showId, showId), gt(seatHolds.expiresAt, sql`now()`)))
  const heldSeatIds = new Set(activeHolds.flatMap((h) => h.seatIds))

  return seatMeta.map((seat) => ({
    seatId: seat.seatId,
    row: seat.row,
    col: seat.col,
    tierId: seat.tierId,
    status: bookedSeatIds.has(seat.seatId) ? 'booked' : heldSeatIds.has(seat.seatId) ? 'held' : 'available',
  }))
}
