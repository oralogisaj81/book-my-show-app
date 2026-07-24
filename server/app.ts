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
  // Applies to every route by default (fastify-rate-limit's `global: true`), so this is a
  // blanket abuse ceiling, not a per-endpoint budget — /api/auth/login and /signup override
  // it with a much tighter, account-aware limit at the route level (see routes/auth.ts) since
  // those are the actual brute-force targets. 300/min (5 req/s) was found via load testing
  // (load-test/reports/) to be far below this app's own stated throughput NFR: the projected
  // 15 journeys/sec traffic-mix scenario alone needs ~50 req/s, and load-test/nfr-config.json's
  // peakConcurrentUsers=50 soak scenario adds a comparable amount of *concurrent* background
  // request volume on top of that (50 continuously-browsing sessions, not idle) — the combined
  // peak was measured around 125 req/s, well above a first-pass fix of 6000/min (100 req/s)
  // that only accounted for the throughput scenario in isolation. Raised again with ~2x
  // headroom over the measured combined peak; revisit alongside nfr-config.json if that changes.
  app.register(fastifyRateLimit, { max: 15000, timeWindow: '1 minute' })

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ApiError) {
      return reply.status(statusForErrorCode(error.code)).send({ code: error.code, message: error.message })
    }
    // Framework-thrown errors (rate-limit's 429, Fastify's own body-parser
    // errors) carry their own correct statusCode — falling through to a flat
    // 500 masked a real "rate limited" as a generic server error.
    const err = error as { statusCode?: unknown; message?: unknown }
    const status = typeof err.statusCode === 'number' ? err.statusCode : 500
    app.log.error(error)
    const message = typeof err.message === 'string' ? err.message : 'Something went wrong.'
    return reply.status(status).send({ code: 'INTERNAL_ERROR', message })
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
