import { Clapperboard } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t border-ink-800 py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 text-center sm:flex-row sm:justify-between sm:text-left sm:px-6">
        <div className="flex items-center gap-2">
          <Clapperboard className="h-5 w-5 text-brand-400" />
          <span className="font-semibold text-mist-200">CineHall</span>
        </div>
        <p className="text-sm text-mist-500">Book movie tickets in seconds. Browse showtimes, pick your seats, and go.</p>
        <p className="text-xs text-mist-500">© {new Date().getFullYear()} CineHall. All rights reserved.</p>
      </div>
    </footer>
  )
}
