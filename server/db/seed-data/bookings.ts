import type { Booking, Screen, Show } from '../../../shared/types/domain'
import { SHOWS } from './shows'
import { SCREENS } from './venues'
import { createSeededRandom } from './seededRandom'
import { buildTicketQrPayload } from '../../../shared/lib/qr'
import { computeTierBreakdown, enumerateSeats, sumTierBreakdown } from '../../../shared/lib/seatGrid'

/** Synthetic prior demand so the app never looks like an empty theater on first load. */
export const SEED_DEMAND_USER_ID = 'seed-demand'
const CONVENIENCE_FEE_RATE = 0.05

function buildBookingForShow(show: Show, screen: Screen, seatIds: string[], createdAt: Date, index: number): Booking {
  const tierBreakdown = computeTierBreakdown(seatIds, screen.layout, show.priceOverrides)
  const subtotal = sumTierBreakdown(tierBreakdown)
  const convenienceFee = Math.round(subtotal * CONVENIENCE_FEE_RATE)
  const id = `seedbkg_${show.id}_${index}`
  return {
    id,
    userId: SEED_DEMAND_USER_ID,
    showId: show.id,
    seatIds,
    tierBreakdown,
    subtotal,
    convenienceFee,
    total: subtotal + convenienceFee,
    status: 'confirmed',
    qrPayload: buildTicketQrPayload(id, show.id, seatIds),
    createdAt: createdAt.toISOString(),
  }
}

export function generateSeedBookings(): Booking[] {
  const rng = createSeededRandom('demand-v1')
  const bookings: Booking[] = []
  const screenById = new Map(SCREENS.map((screen) => [screen.id, screen]))

  for (const show of SHOWS) {
    const screen = screenById.get(show.screenId)
    if (!screen) continue

    const demand = rng()
    if (demand < 0.4) continue

    const seatMetaAll = enumerateSeats(screen.layout)
    const takenSeats = new Set<string>()
    const bookingCount = demand > 0.85 ? 3 : demand > 0.6 ? 2 : 1

    for (let i = 0; i < bookingCount; i++) {
      const seatCount = 1 + Math.floor(rng() * 4)
      const available = seatMetaAll.filter((seat) => !takenSeats.has(seat.seatId))
      if (available.length === 0) break

      const seatIds: string[] = []
      for (let k = 0; k < seatCount && available.length > 0; k++) {
        const pickIndex = Math.floor(rng() * available.length)
        const [seat] = available.splice(pickIndex, 1)
        seatIds.push(seat.seatId)
        takenSeats.add(seat.seatId)
      }

      const daysAgo = Math.floor(rng() * 14)
      const createdAt = new Date()
      createdAt.setDate(createdAt.getDate() - daysAgo)
      createdAt.setHours(9 + Math.floor(rng() * 12), Math.floor(rng() * 60), 0, 0)

      bookings.push(buildBookingForShow(show, screen, seatIds, createdAt, i))
    }
  }

  return bookings
}
