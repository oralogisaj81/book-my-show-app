import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Clapperboard } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { AuthGate } from '@/components/layout/AuthGate'
import { useAuthStore } from '@/store/authStore'

function App() {
  const status = useAuthStore((state) => state.status)
  const refreshSession = useAuthStore((state) => state.refreshSession)

  // An httpOnly session cookie can't be read from JS, so this round trip to
  // /api/auth/me on first load is the only way the app learns it's signed in.
  useEffect(() => {
    refreshSession()
  }, [refreshSession])

  return (
    <div className="flex min-h-svh flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      {status === 'loading' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink-950">
          <span className="flex h-12 w-12 animate-pulse items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-white">
            <Clapperboard className="h-6 w-6" />
          </span>
        </div>
      )}
      {status === 'unauthenticated' && <AuthGate />}
    </div>
  )
}

export default App
