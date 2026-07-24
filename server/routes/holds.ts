import type { FastifyInstance } from 'fastify'
import { ApiError } from '../../shared/lib/apiError'
import { requireAuth } from '../lib/authGuard'
import { getHold, releaseHold } from '../services/seatLock'

export async function holdsRoutes(app: FastifyInstance) {
  app.post<{ Params: { id: string } }>('/holds/:id/release', { preHandler: requireAuth }, async (request, reply) => {
    const hold = await getHold(request.params.id)
    if (!hold) throw new ApiError('HOLD_NOT_FOUND', 'Hold not found or expired.')
    if (hold.holderId !== request.userId) throw new ApiError('FORBIDDEN', 'You do not have access to this hold.')
    await releaseHold(request.params.id)
    return reply.status(204).send()
  })

  app.get<{ Params: { id: string } }>('/holds/:id', { preHandler: requireAuth }, async (request) => {
    const hold = await getHold(request.params.id)
    if (!hold) throw new ApiError('HOLD_NOT_FOUND', 'Hold not found or expired.')
    if (hold.holderId !== request.userId) throw new ApiError('FORBIDDEN', 'You do not have access to this hold.')
    return hold
  })
}
