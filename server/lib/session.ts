import { createHmac, timingSafeEqual } from 'node:crypto'

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

export const SESSION_COOKIE_NAME = 'cinehall_session'
export const SESSION_MAX_AGE_SECONDS = SESSION_DURATION_MS / 1000

function getSecret(): string {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error('SESSION_SECRET is not set')
  return secret
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('hex')
}

/** Cookie value is `userId.expiresAt.hmac` — signed, not encrypted (userId isn't secret; tamper-proofing is what matters). */
export function signSession(userId: string): { value: string; expiresAt: number } {
  const expiresAt = Date.now() + SESSION_DURATION_MS
  const payload = `${userId}.${expiresAt}`
  return { value: `${payload}.${sign(payload)}`, expiresAt }
}

export function verifySession(cookieValue: string | undefined): { userId: string } | null {
  if (!cookieValue) return null
  const parts = cookieValue.split('.')
  if (parts.length !== 3) return null
  const [userId, expiresAtStr, signature] = parts
  const expiresAt = Number(expiresAtStr)
  if (!userId || Number.isNaN(expiresAt) || expiresAt < Date.now()) return null

  const expected = Buffer.from(sign(`${userId}.${expiresAtStr}`))
  const provided = Buffer.from(signature)
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null

  return { userId }
}
