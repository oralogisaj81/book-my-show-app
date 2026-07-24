import type { UserProfile } from '@shared/types/domain'
import { ApiError } from './api'
import { request } from './httpClient'

/** Kept separate from BookingApi/httpApi — auth is cross-cutting, not a booking-domain method. */
export const authApi = {
  signup: (name: string, email: string, password: string) =>
    request<UserProfile>('/auth/signup', { method: 'POST', body: JSON.stringify({ name, email, password }) }),

  login: (email: string, password: string) =>
    request<UserProfile>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  logout: () => request<void>('/auth/logout', { method: 'POST' }),

  getSession: () =>
    request<UserProfile>('/auth/me').catch((error: unknown) => {
      if (error instanceof ApiError && error.code === 'UNAUTHENTICATED') return undefined
      throw error
    }),
}
