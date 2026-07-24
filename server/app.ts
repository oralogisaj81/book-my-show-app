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

  // Applied globally (not inside the /api-prefixed plugin) so it covers both API responses and
  // the static frontend served below — same-artifact deployment means both come from this one
  // Fastify instance. CSP's script/style/font/img allowlist matches this app's actual external
  // resources: Google Fonts (index.html's <link> tags) and TMDB poster/backdrop images
  // (server/db/seed-data/movies.ts). connect-src is 'self' only — the frontend never calls a
  // cross-origin API. HSTS is sent unconditionally; browsers only honor it on secure origins,
  // so it's inert (not wrong) over local plain HTTP.
  const CSP = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: https://image.tmdb.org",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')

  app.addHook('onSend', (_request, reply, payload, done) => {
    reply.header('Content-Security-Policy', CSP)
    reply.header('X-Content-Type-Options', 'nosniff')
    reply.header('X-Frame-Options', 'DENY')
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin')
    reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    done(null, payload)
  })

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
    // A genuine 4xx from Fastify or a plugin (body-parser errors, rate-limit's 429) already
    // carries a safe, pre-written message meant for clients. A 500, by contrast, is always an
    // unexpected runtime exception (e.g. a TypeError from malformed input reaching code that
    // assumed a well-shaped body) whose message can leak internal implementation detail —
    // never echo it verbatim.
    const message = status < 500 && typeof err.message === 'string' ? err.message : 'Something went wrong.'
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
