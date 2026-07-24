import fs from 'node:fs'
import path from 'node:path'
import Fastify from 'fastify'
import fastifyCookie from '@fastify/cookie'
import fastifyRateLimit from '@fastify/rate-limit'
import fastifyStatic from '@fastify/static'
import { ApiError } from '../shared/lib/apiError'
import { statusForErrorCode } from './lib/httpError'
import { authRoutes } from './routes/auth'
import { citiesRoutes } from './routes/cities'
import { moviesRoutes } from './routes/movies'
import { cinemasRoutes } from './routes/cinemas'
import { showsRoutes } from './routes/shows'
import { holdsRoutes } from './routes/holds'
import { bookingsRoutes } from './routes/bookings'
import { adminRoutes } from './routes/admin'

export function createApp() {
  const app = Fastify({ logger: true })

  app.register(fastifyCookie)
  // Generous global default; /api/auth/login and /signup override this with a much tighter
  // limit at the route level (see routes/auth.ts) since those are the actual brute-force targets.
  app.register(fastifyRateLimit, { max: 300, timeWindow: '1 minute' })

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ApiError) {
      return reply.status(statusForErrorCode(error.code)).send({ code: error.code, message: error.message })
    }
    // Framework-thrown errors (rate-limit's 429, Fastify's own body-parser
    // errors) carry their own correct statusCode — falling through to a flat
    // 500 masked a real "rate limited" as a generic server error.
    const status = typeof error.statusCode === 'number' ? error.statusCode : 500
    app.log.error(error)
    return reply.status(status).send({ code: 'INTERNAL_ERROR', message: error.message ?? 'Something went wrong.' })
  })

  app.register(
    async (api) => {
      await api.register(authRoutes)
      await api.register(citiesRoutes)
      await api.register(moviesRoutes)
      await api.register(cinemasRoutes)
      await api.register(showsRoutes)
      await api.register(holdsRoutes)
      await api.register(bookingsRoutes)
      await api.register(adminRoutes)
    },
    { prefix: '/api' },
  )

  // Serve the built frontend (npm run build) in production. In dev, Vite serves it on its own
  // port and proxies /api here instead, so dist/ usually won't exist yet — that's fine, skip.
  const distDir = path.resolve(process.cwd(), 'dist')
  if (fs.existsSync(distDir)) {
    app.register(fastifyStatic, { root: distDir })
    app.setNotFoundHandler((request, reply) => {
      if (request.raw.url?.startsWith('/api')) {
        return reply.status(404).send({ code: 'NOT_FOUND', message: 'Not found.' })
      }
      return reply.sendFile('index.html')
    })
  }

  return app
}
