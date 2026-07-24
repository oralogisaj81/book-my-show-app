import { Search, X } from 'lucide-react'
import { cn } from '@/lib/cn'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

export function SearchBar({ value, onChange, className }: SearchBarProps) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mist-500" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search by movie title..."
        className="h-11 w-full rounded-full border border-ink-600 bg-ink-800/60 pl-9 pr-9 text-sm text-mist-100 outline-none placeholder:text-mist-500 focus:border-brand-400"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-mist-500 hover:text-mist-300"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
