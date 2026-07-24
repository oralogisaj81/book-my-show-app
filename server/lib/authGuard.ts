import type { FastifyReply, FastifyRequest } from 'fastify'
import { ApiError } from '../../shared/lib/apiError'
import { findById } from '../services/users'
import { SESSION_COOKIE_NAME, verifySession } from './session'

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string
  }
}

export async function requireAuth(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const session = verifySession(request.cookies[SESSION_COOKIE_NAME])
  if (!session) {
    throw new ApiError('UNAUTHENTICATED', 'You must be signed in to do that.')
  }
  request.userId = session.userId
}

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  await requireAuth(request, reply)
  const user = await findById(request.userId!)
  if (!user?.isAdmin) {
    throw new ApiError('FORBIDDEN', 'Admin access required.')
  }
}
