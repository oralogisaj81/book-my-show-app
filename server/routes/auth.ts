import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { ApiError } from '../../shared/lib/apiError'
import { generateId } from '../../shared/lib/id'
import { requireAuth } from '../lib/authGuard'
import { hashPassword, verifyPassword } from '../lib/password'
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS, signSession } from '../lib/session'
import { createUser, findByEmail, findById, toPublicUser } from '../services/users'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8

// Keyed by IP+email (not IP alone) so this throttles repeated attempts against ONE account
// from one source — the actual brute-force shape — rather than capping the total number of
// distinct legitimate signups/logins that can happen behind a shared IP (office NAT, campus
// network, mobile carrier CGNAT). Found via load testing: with IP-only keying, ~125
// concurrent load-test VUs sharing one source IP exhausted the whole budget after the first
// 10 signups, regardless of how many were different accounts — the same would happen to any
// group of real users signing up/logging in from behind one shared IP within a 15-minute
// window. `hook: 'preHandler'` (rather than fastify-rate-limit's default `onRequest`) is
// required so `request.body` is parsed by the time the key generator reads `email` from it.
const AUTH_RATE_LIMIT = {
  config: {
    rateLimit: {
      max: 10,
      timeWindow: '15 minutes',
      hook: 'preHandler' as const,
      keyGenerator: (request: FastifyRequest) => {
        const email = typeof (request.body as { email?: unknown })?.email === 'string'
          ? (request.body as { email: string }).email.trim().toLowerCase()
          : ''
        return `${request.ip}:${email}`
      },
    },
  },
}

function setSessionCookie(reply: FastifyReply, userId: string): void {
  const { value } = signSession(userId)
  reply.setCookie(SESSION_COOKIE_NAME, value, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MAX_AGE_SECONDS,
  })
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === '23505'
}

// Fastify's JSON body parser accepts any valid JSON value, not just objects (a bare `null`,
// number, or string is still valid JSON) — without this, destructuring a field off a non-object
// body throws an uncaught TypeError instead of a clean 400. request.body's declared type
// (via each route's Body generic) is a compile-time-only annotation, not a runtime guarantee,
// so this check is a plain boolean rather than a type-narrowing assertion.
function requireBodyObject(body: unknown): void {
  if (typeof body !== 'object' || body === null) {
    throw new ApiError('VALIDATION_ERROR', 'Request body must be a JSON object.')
  }
}

export async function authRoutes(app: FastifyInstance) {
  app.post<{ Body: { name: string; email: string; password: string } }>(
    '/auth/signup',
    AUTH_RATE_LIMIT,
    async (request, reply) => {
      requireBodyObject(request.body)
      const name = request.body.name?.trim()
      const email = request.body.email?.trim().toLowerCase()
      const { password } = request.body

      if (!name) throw new ApiError('VALIDATION_ERROR', 'Please enter your name.')
      // Defense-in-depth: the frontend already renders this via React's default text
      // interpolation (never dangerouslySetInnerHTML), but rejecting markup-shaped input here
      // means a name field can never become a stored-XSS vector even if that changes later.
      if (/[<>]/.test(name)) {
        throw new ApiError('VALIDATION_ERROR', 'Name cannot contain < or > characters.')
      }
      if (!email || !EMAIL_REGEX.test(email)) {
        throw new ApiError('VALIDATION_ERROR', 'Please enter a valid email address.')
      }
      if (!password || password.length < MIN_PASSWORD_LENGTH) {
        throw new ApiError('VALIDATION_ERROR', `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      }

      if (await findByEmail(email)) {
        throw new ApiError('EMAIL_TAKEN', 'An account with this email already exists.')
      }

      const { hash, salt } = await hashPassword(password)
      let user
      try {
        user = await createUser({ id: generateId('user'), name, email, passwordHash: hash, passwordSalt: salt })
      } catch (error) {
        // Backstop for a race between the check above and the insert (two concurrent signups, same email).
        if (isUniqueViolation(error)) throw new ApiError('EMAIL_TAKEN', 'An account with this email already exists.')
        throw error
      }

      setSessionCookie(reply, user.id)
      return toPublicUser(user)
    },
  )

  app.post<{ Body: { email: string; password: string } }>('/auth/login', AUTH_RATE_LIMIT, async (request, reply) => {
    requireBodyObject(request.body)
    const email = request.body.email?.trim().toLowerCase()
    const { password } = request.body
    // Same message whether the email doesn't exist or the password is wrong — no enumeration signal.
    const invalidCredentials = new ApiError('INVALID_CREDENTIALS', 'Invalid email or password.')

    if (!email || !password) throw invalidCredentials

    const user = await findByEmail(email)
    if (!user || !user.passwordHash || !user.passwordSalt) throw invalidCredentials

    const valid = await verifyPassword(password, user.passwordHash, user.passwordSalt)
    if (!valid) throw invalidCredentials

    setSessionCookie(reply, user.id)
    return toPublicUser(user)
  })

  app.post('/auth/logout', async (_request, reply) => {
    reply.clearCookie(SESSION_COOKIE_NAME, { path: '/' })
    return reply.status(204).send()
  })

  app.get('/auth/me', { preHandler: requireAuth }, async (request) => {
    const user = await findById(request.userId!)
    if (!user) throw new ApiError('UNAUTHENTICATED', 'You must be signed in to do that.')
    return toPublicUser(user)
  })
}
