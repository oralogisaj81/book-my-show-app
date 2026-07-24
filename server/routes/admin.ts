import type { FastifyInstance } from 'fastify'
import { eq } from 'drizzle-orm'
import type { Cinema, Screen, Show } from '../../shared/types/domain'
import { db } from '../db/client'
import { cinemas, screens, shows } from '../db/schema'
import { requireAdmin } from '../lib/authGuard'
import { attachScreenIds } from '../lib/mappers'
import { getAnalytics } from '../services/analytics'

export async function adminRoutes(app: FastifyInstance) {
  // Applies to every route registered on this plugin instance only (Fastify encapsulation).
  app.addHook('preHandler', requireAdmin)

  app.get('/admin/cinemas', async () => {
    const [cinemaRows, screenRows] = await Promise.all([
      db.select().from(cinemas),
      db.select({ id: screens.id, cinemaId: screens.cinemaId }).from(screens),
    ])
    return attachScreenIds(cinemaRows, screenRows)
  })

  app.put<{ Body: Cinema }>('/admin/cinemas', async (request) => {
    const { screenIds: _screenIds, ...cinema } = request.body
    const [row] = await db
      .insert(cinemas)
      .values(cinema)
      .onConflictDoUpdate({
        target: cinemas.id,
        set: { cityId: cinema.cityId, name: cinema.name, address: cinema.address },
      })
      .returning()
    const screenRows = await db
      .select({ id: screens.id, cinemaId: screens.cinemaId })
      .from(screens)
      .where(eq(screens.cinemaId, row.id))
    return attachScreenIds([row], screenRows)[0]
  })

  app.delete<{ Params: { id: string } }>('/admin/cinemas/:id', async (request, reply) => {
    await db.delete(cinemas).where(eq(cinemas.id, request.params.id))
    return reply.status(204).send()
  })

  app.get('/admin/screens', async () => {
    return db.select().from(screens)
  })

  app.put<{ Body: Screen }>('/admin/screens', async (request) => {
    const screen = request.body
    const [row] = await db
      .insert(screens)
      .values(screen)
      .onConflictDoUpdate({
        target: screens.id,
        set: { cinemaId: screen.cinemaId, name: screen.name, layout: screen.layout, features: screen.features },
      })
      .returning()
    return row
  })

  app.delete<{ Params: { id: string } }>('/admin/screens/:id', async (request, reply) => {
    await db.delete(screens).where(eq(screens.id, request.params.id))
    return reply.status(204).send()
  })

  app.get('/admin/shows', async () => {
    return db.select().from(shows)
  })

  app.put<{ Body: Show }>('/admin/shows', async (request) => {
    const show = request.body
    const [row] = await db
      .insert(shows)
      .values(show)
      .onConflictDoUpdate({
        target: shows.id,
        set: {
          movieId: show.movieId,
          cinemaId: show.cinemaId,
          screenId: show.screenId,
          startTime: show.startTime,
          language: show.language,
          format: show.format,
          priceOverrides: show.priceOverrides,
        },
      })
      .returning()
    return row
  })

  app.delete<{ Params: { id: string } }>('/admin/shows/:id', async (request, reply) => {
    await db.delete(shows).where(eq(shows.id, request.params.id))
    return reply.status(204).send()
  })

  app.get('/admin/analytics', async () => {
    return getAnalytics()
  })
}
