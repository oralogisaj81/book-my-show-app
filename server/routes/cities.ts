import type { FastifyInstance } from 'fastify'
import { db } from '../db/client'
import { cities } from '../db/schema'

export async function citiesRoutes(app: FastifyInstance) {
  app.get('/cities', async () => {
    return db.select().from(cities)
  })
}
