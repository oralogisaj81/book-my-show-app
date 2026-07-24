import { useState } from 'react'
import type { FormEvent } from 'react'
import { motion } from 'framer-motion'
import { Clapperboard } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Tabs } from '@/components/ui/Tabs'
import { ApiError } from '@/data/api'

type Mode = 'signin' | 'signup'

export function AuthGate() {
  const login = useAuthStore((state) => state.login)
  const signup = useAuthStore((state) => state.signup)

  const [mode, setMode] = useState<Mode>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (mode === 'signup') {
      if (!name.trim()) {
        setError('Please enter your name.')
        return
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters.')
        return
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.')
        return
      }
    }

    setIsSubmitting(true)
    try {
      if (mode === 'signin') {
        await login(email.trim().toLowerCase(), password)
      } else {
        await signup(name.trim(), email.trim().toLowerCase(), password)
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
    setPassword('')
    setConfirmPassword('')
  }

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink-950/90 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-sm rounded-2xl border border-ink-600 bg-ink-850 p-6 shadow-card"
      >
        <div className="mb-4 flex justify-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-glow">
            <Clapperboard className="h-6 w-6" />
          </span>
        </div>
        <h2 className="text-center text-xl font-bold text-mist-100">Welcome to CineHall</h2>
        <p className="mt-1 text-center text-sm text-mist-400">
          {mode === 'signin'
            ? 'Sign in to book tickets and manage your account.'
            : 'Create an account to start booking.'}
        </p>

        <div className="mt-5 flex justify-center">
          <Tabs
            tabs={[
              { value: 'signin', label: 'Sign in' },
              { value: 'signup', label: 'Sign up' },
            ]}
            value={mode}
            onChange={switchMode}
          />
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          {mode === 'signup' && (
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
              className="h-11 w-full rounded-xl border border-ink-600 bg-ink-800/60 px-4 text-sm text-mist-100 outline-none placeholder:text-mist-500 focus:border-brand-400"
            />
          )}
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            autoFocus={mode === 'signin'}
            className="h-11 w-full rounded-xl border border-ink-600 bg-ink-800/60 px-4 text-sm text-mist-100 outline-none placeholder:text-mist-500 focus:border-brand-400"
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={mode === 'signup' ? 'Password (min. 8 characters)' : 'Password'}
            className="h-11 w-full rounded-xl border border-ink-600 bg-ink-800/60 px-4 text-sm text-mist-100 outline-none placeholder:text-mist-500 focus:border-brand-400"
          />
          {mode === 'signup' && (
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Confirm password"
              className="h-11 w-full rounded-xl border border-ink-600 bg-ink-800/60 px-4 text-sm text-mist-100 outline-none placeholder:text-mist-500 focus:border-brand-400"
            />
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </Button>
        </form>
      </motion.div>
    </motion.div>
  )
}
