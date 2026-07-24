import { eq } from 'drizzle-orm'
import type { AnalyticsSummary } from '../../shared/types/domain'
import { enumerateSeats } from '../../shared/lib/seatGrid'
import { localDateKey } from '../../shared/lib/format'
import { db } from '../db/client'
import { bookings, cinemas, movies, screens, shows } from '../db/schema'

export async function getAnalytics(): Promise<AnalyticsSummary> {
  const [allBookings, allShows, allCinemas, allScreens, allMovies] = await Promise.all([
    db.select().from(bookings).where(eq(bookings.status, 'confirmed')),
    db.select().from(shows),
    db.select().from(cinemas),
    db.select().from(screens),
    db.select().from(movies),
  ])

  const showById = new Map(allShows.map((s) => [s.id, s]))
  const screenById = new Map(allScreens.map((s) => [s.id, s]))
  const movieById = new Map(allMovies.map((m) => [m.id, m]))

  const totalRevenue = allBookings.reduce((sum, b) => sum + b.total, 0)
  const totalBookings = allBookings.length
  const totalSeatsSold = allBookings.reduce((sum, b) => sum + b.seatIds.length, 0)

  const revenueByDayMap = new Map<string, number>()
  for (const b of allBookings) {
    const day = localDateKey(b.createdAt)
    revenueByDayMap.set(day, (revenueByDayMap.get(day) ?? 0) + b.total)
  }
  const revenueByDay = Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (13 - i))
    const key = localDateKey(d)
    return { date: key, revenue: revenueByDayMap.get(key) ?? 0 }
  })

  const soldByCinema = new Map<string, number>()
  const capacityByCinema = new Map<string, number>()
  for (const b of allBookings) {
    const show = showById.get(b.showId)
    if (!show) continue
    soldByCinema.set(show.cinemaId, (soldByCinema.get(show.cinemaId) ?? 0) + b.seatIds.length)
  }
  for (const show of allShows) {
    const screen = screenById.get(show.screenId)
    if (!screen) continue
    const capacity = enumerateSeats(screen.layout).length
    capacityByCinema.set(show.cinemaId, (capacityByCinema.get(show.cinemaId) ?? 0) + capacity)
  }
  const occupancyByCinema = allCinemas
    .map((cinema) => {
      const sold = soldByCinema.get(cinema.id) ?? 0
      const capacity = capacityByCinema.get(cinema.id) ?? 0
      return { cinemaId: cinema.id, cinemaName: cinema.name, occupancy: capacity > 0 ? sold / capacity : 0 }
    })
    .sort((a, b) => b.occupancy - a.occupancy)

  const revenueByMovie = new Map<string, { revenue: number; ticketsSold: number }>()
  for (const b of allBookings) {
    const show = showById.get(b.showId)
    if (!show) continue
    const existing = revenueByMovie.get(show.movieId) ?? { revenue: 0, ticketsSold: 0 }
    existing.revenue += b.total
    existing.ticketsSold += b.seatIds.length
    revenueByMovie.set(show.movieId, existing)
  }
  const topMovies = Array.from(revenueByMovie.entries())
    .map(([movieId, v]) => ({ movieId, title: movieById.get(movieId)?.title ?? 'Unknown', ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6)

  const totalCapacity = Array.from(capacityByCinema.values()).reduce((sum, c) => sum + c, 0)
  const averageOccupancy = totalCapacity > 0 ? totalSeatsSold / totalCapacity : 0

  return { totalRevenue, totalBookings, totalSeatsSold, averageOccupancy, revenueByDay, occupancyByCinema, topMovies }
}
