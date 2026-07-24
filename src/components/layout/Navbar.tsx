import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Clapperboard, LayoutDashboard, Search } from 'lucide-react'
import { CitySwitcher } from './CitySwitcher'
import { ProfileMenu } from './ProfileMenu'
import { cn } from '@/lib/cn'

export function Navbar() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    navigate(query.trim() ? `/?q=${encodeURIComponent(query.trim())}` : '/')
  }

  return (
    <header className="glass sticky top-0 z-40 border-b border-ink-800">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-glow">
            <Clapperboard className="h-5 w-5" />
          </span>
          <span className="text-lg font-bold tracking-tight text-mist-100">CineHall</span>
        </Link>

        <CitySwitcher />

        <form onSubmit={handleSearchSubmit} className="relative ml-2 hidden max-w-md flex-1 md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mist-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search movies..."
            className="h-10 w-full rounded-full border border-ink-600 bg-ink-800/60 pl-9 pr-4 text-sm text-mist-100 outline-none transition-colors placeholder:text-mist-500 focus:border-brand-400"
          />
        </form>

        <div className="ml-auto flex items-center gap-2">
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              cn(
                'hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-mist-400 transition-colors hover:bg-ink-800 hover:text-mist-100 sm:flex',
                isActive && 'bg-ink-800 text-mist-100',
              )
            }
          >
            <LayoutDashboard className="h-4 w-4" />
            Admin
          </NavLink>
          <ProfileMenu />
        </div>
      </div>
    </header>
  )
}
