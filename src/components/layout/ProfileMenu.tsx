import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, LogOut, Ticket } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/cn'

export function ProfileMenu() {
  const [open, setOpen] = useState(false)
  const { profile, logout } = useAuthStore()

  if (!profile) return null

  const initials = profile.name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-ink-600 bg-ink-800/60 py-1 pl-1 pr-2.5 hover:border-ink-500"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-brand-500 text-xs font-bold text-ink-950">
          {initials}
        </span>
        <span className="hidden text-sm font-medium text-mist-100 sm:inline">{profile.name.split(' ')[0]}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 text-mist-500 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-52 rounded-xl border border-ink-600 bg-ink-850 p-1.5 shadow-card">
            <div className="px-3 py-2">
              <p className="text-sm font-medium text-mist-100">{profile.name}</p>
              <p className="text-xs text-mist-500">{profile.email}</p>
            </div>
            <div className="my-1 h-px bg-ink-700" />
            <Link
              to="/account"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-mist-200 hover:bg-ink-700"
            >
              <Ticket className="h-4 w-4" />
              My bookings
            </Link>
            <button
              onClick={() => {
                logout()
                setOpen(false)
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-mist-400 hover:bg-ink-700 hover:text-mist-100"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  )
}
