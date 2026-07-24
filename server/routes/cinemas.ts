import type { FastifyInstance } from 'fastify'
import { eq } from 'drizzle-orm'
import { ApiError } from '../../shared/lib/apiError'
import { db } from '../db/client'
import { cinemas, screens } from '../db/schema'
import { attachScreenIds } from '../lib/mappers'

export async function cinemasRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { cityId?: string } }>('/cinemas', async (request) => {
    const cinemaRows = request.query.cityId
      ? await db.select().from(cinemas).where(eq(cinemas.cityId, request.query.cityId))
      : await db.select().from(cinemas)
    const screenRows = await db.select({ id: screens.id, cinemaId: screens.cinemaId }).from(screens)
    return attachScreenIds(cinemaRows, screenRows)
  })

  app.get<{ Params: { id: string } }>('/cinemas/:id', async (request) => {
    const [cinema] = await db.select().from(cinemas).where(eq(cinemas.id, request.params.id)).limit(1)
    if (!cinema) throw new ApiError('CINEMA_NOT_FOUND', 'Cinema not found.')
    const screenRows = await db
      .select({ id: screens.id, cinemaId: screens.cinemaId })
      .from(screens)
      .where(eq(screens.cinemaId, cinema.id))
    return attachScreenIds([cinema], screenRows)[0]
  })

  app.get<{ Params: { id: string } }>('/screens/:id', async (request) => {
    const [screen] = await db.select().from(screens).where(eq(screens.id, request.params.id)).limit(1)
    if (!screen) throw new ApiError('SCREEN_NOT_FOUND', 'Screen not found.')
    return screen
  })
}
