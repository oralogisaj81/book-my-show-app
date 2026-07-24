import type { FastifyInstance } from 'fastify'
import { desc, eq } from 'drizzle-orm'
import { ApiError } from '../../shared/lib/apiError'
import { db } from '../db/client'
import { bookings } from '../db/schema'
import { requireAuth } from '../lib/authGuard'
import { cancelBooking, confirmBooking, toDomainBooking } from '../services/booking'

export async function bookingsRoutes(app: FastifyInstance) {
  app.post<{ Body: { holdId: string } }>('/bookings/confirm', { preHandler: requireAuth }, async (request) => {
    return confirmBooking(request.body.holdId, request.userId!)
  })

  app.post<{ Params: { id: string } }>('/bookings/:id/cancel', { preHandler: requireAuth }, async (request) => {
    return cancelBooking(request.params.id, request.userId!)
  })

  app.get('/bookings/me', { preHandler: requireAuth }, async (request) => {
    const rows = await db
      .select()
      .from(bookings)
      .where(eq(bookings.userId, request.userId!))
      .orderBy(desc(bookings.createdAt))
    return rows.map(toDomainBooking)
  })

  app.get<{ Params: { id: string } }>('/bookings/:id', { preHandler: requireAuth }, async (request) => {
    const [row] = await db.select().from(bookings).where(eq(bookings.id, request.params.id)).limit(1)
    if (!row) throw new ApiError('BOOKING_NOT_FOUND', 'Booking not found.')
    if (row.userId !== request.userId) throw new ApiError('FORBIDDEN', 'You do not have access to this booking.')
    return toDomainBooking(row)
  })
}
