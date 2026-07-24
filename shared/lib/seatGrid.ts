import type { ScreenLayout, SeatTier, TierBreakdownEntry } from '../types/domain'

export interface EnumeratedSeat {
  seatId: string
  row: number
  col: number
  tierId: string
}

export function rowLabel(row: number): string {
  let n = row
  let label = ''
  do {
    label = String.fromCharCode(65 + (n % 26)) + label
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return label
}

export function tierForRow(layout: ScreenLayout, row: number): SeatTier | undefined {
  return layout.tiers.find((tier) => row >= tier.rowStart && row <= tier.rowEnd)
}

export function enumerateSeats(layout: ScreenLayout): EnumeratedSeat[] {
  const seats: EnumeratedSeat[] = []
  for (let row = 0; row < layout.rows; row++) {
    const tier = tierForRow(layout, row)
    if (!tier) continue
    for (let col = 0; col < layout.cols; col++) {
      const seatId = `${rowLabel(row)}${col + 1}`
      if (layout.skipSeats.includes(seatId)) continue
      seats.push({ seatId, row, col, tierId: tier.id })
    }
  }
  return seats
}

export function priceForTier(tierId: string, layout: ScreenLayout, priceOverrides: Record<string, number>): number {
  const override = priceOverrides[tierId]
  if (override != null) return override
  const tier = layout.tiers.find((t) => t.id === tierId)
  return tier?.price ?? 0
}

/** Groups the given seats by tier for order-summary / receipt display, honoring per-show price overrides. */
export function computeTierBreakdown(
  seatIds: string[],
  layout: ScreenLayout,
  priceOverrides: Record<string, number>,
): TierBreakdownEntry[] {
  const seatMeta = enumerateSeats(layout).filter((seat) => seatIds.includes(seat.seatId))
  const grouped = new Map<string, { tierName: string; count: number; pricePerSeat: number }>()
  for (const seat of seatMeta) {
    const tier = layout.tiers.find((t) => t.id === seat.tierId)
    if (!tier) continue
    const price = priceForTier(seat.tierId, layout, priceOverrides)
    const existing = grouped.get(seat.tierId)
    if (existing) existing.count += 1
    else grouped.set(seat.tierId, { tierName: tier.name, count: 1, pricePerSeat: price })
  }
  return Array.from(grouped.entries()).map(([tierId, v]) => ({
    tierId,
    tierName: v.tierName,
    count: v.count,
    pricePerSeat: v.pricePerSeat,
  }))
}

export function sumTierBreakdown(breakdown: TierBreakdownEntry[]): number {
  return breakdown.reduce((sum, entry) => sum + entry.count * entry.pricePerSeat, 0)
}
