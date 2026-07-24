import type { FastifyInstance } from 'fastify'
import { eq, inArray, or } from 'drizzle-orm'
import { ApiError } from '../../shared/lib/apiError'
import { db } from '../db/client'
import { cinemas, movies, shows } from '../db/schema'

export async function moviesRoutes(app: FastifyInstance) {
  app.get('/movies', async () => {
    return db.select().from(movies)
  })

  app.get<{ Params: { id: string } }>('/movies/:id', async (request) => {
    const [movie] = await db.select().from(movies).where(eq(movies.id, request.params.id)).limit(1)
    if (!movie) throw new ApiError('MOVIE_NOT_FOUND', 'Movie not found.')
    return movie
  })

  app.get<{ Params: { cityId: string } }>('/movies/city/:cityId', async (request) => {
    const { cityId } = request.params
    const cinemaRows = await db.select({ id: cinemas.id }).from(cinemas).where(eq(cinemas.cityId, cityId))
    const cinemaIds = cinemaRows.map((c) => c.id)

    if (cinemaIds.length === 0) {
      return db.select().from(movies).where(eq(movies.status, 'upcoming'))
    }

    const showRows = await db.select({ movieId: shows.movieId }).from(shows).where(inArray(shows.cinemaId, cinemaIds))
    const movieIdsWithShows = [...new Set(showRows.map((s) => s.movieId))]

    if (movieIdsWithShows.length === 0) {
      return db.select().from(movies).where(eq(movies.status, 'upcoming'))
    }

    return db
      .select()
      .from(movies)
      .where(or(eq(movies.status, 'upcoming'), inArray(movies.id, movieIdsWithShows)))
  })
}
