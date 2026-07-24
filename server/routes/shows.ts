import type { FastifyInstance } from 'fastify'
import { and, asc, eq, inArray } from 'drizzle-orm'
import { ApiError } from '../../shared/lib/apiError'
import { db } from '../db/client'
import { cinemas, shows } from '../db/schema'
import { requireAuth } from '../lib/authGuard'
import { computeSeatMap } from '../services/seatMap'
import { holdSeats } from '../services/seatLock'

export async function showsRoutes(app: FastifyInstance) {
  app.get<{ Params: { movieId: string }; Querystring: { cityId: string } }>(
    '/shows/movie/:movieId',
    async (request) => {
      const { movieId } = request.params
      const { cityId } = request.query
      const cinemaRows = await db.select({ id: cinemas.id }).from(cinemas).where(eq(cinemas.cityId, cityId))
      const cinemaIds = cinemaRows.map((c) => c.id)
      if (cinemaIds.length === 0) return []

      return db
        .select()
        .from(shows)
        .where(and(inArray(shows.cinemaId, cinemaIds), eq(shows.movieId, movieId)))
        .orderBy(asc(shows.startTime))
    },
  )

  app.get<{ Params: { id: string } }>('/shows/:id', async (request) => {
    const [show] = await db.select().from(shows).where(eq(shows.id, request.params.id)).limit(1)
    if (!show) throw new ApiError('SHOW_NOT_FOUND', 'This show could not be found.')
    return show
  })

  app.get<{ Params: { id: string } }>('/shows/:id/seatmap', async (request) => {
    return computeSeatMap(request.params.id)
  })

  app.post<{ Params: { id: string }; Body: { seatIds: string[]; holderId?: string } }>(
    '/shows/:id/hold',
    { preHandler: requireAuth },
    async (request) => {
      // holderId is derived from the session, never trusted from the request body — matching
      // the pattern already used for confirmBooking/cancelBooking/bookings/me (CLAUDE.md).
      // The body may still carry a holderId field for compatibility with existing callers; it
      // is intentionally ignored.
      return holdSeats(request.params.id, request.body.seatIds, request.userId!)
    },
  )
}
