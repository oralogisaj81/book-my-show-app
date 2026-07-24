import { create } from 'zustand'
import type { UserProfile } from '@shared/types/domain'
import { authApi } from '@/data/authApi'

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

interface AuthState {
  profile: UserProfile | null
  status: AuthStatus
  isAdmin: boolean
  /** Called once on app load — an httpOnly cookie can't be read client-side, so this round
   *  trip to /api/auth/me is the only way the app learns whether it's logged in. */
  refreshSession: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  signup: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>()((set) => ({
  profile: null,
  status: 'loading',
  isAdmin: false,

  refreshSession: async () => {
    const profile = await authApi.getSession()
    set({
      profile: profile ?? null,
      isAdmin: profile?.isAdmin ?? false,
      status: profile ? 'authenticated' : 'unauthenticated',
    })
  },

  login: async (email, password) => {
    const profile = await authApi.login(email, password)
    set({ profile, isAdmin: profile.isAdmin, status: 'authenticated' })
  },

  signup: async (name, email, password) => {
    const profile = await authApi.signup(name, email, password)
    set({ profile, isAdmin: profile.isAdmin, status: 'authenticated' })
  },

  logout: async () => {
    await authApi.logout()
    set({ profile: null, isAdmin: false, status: 'unauthenticated' })
  },
}))
