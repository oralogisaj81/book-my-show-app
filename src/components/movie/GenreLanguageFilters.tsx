import { cn } from '@/lib/cn'

interface FilterChipsProps {
  label: string
  options: string[]
  selected: string[]
  onToggle: (value: string) => void
}

function FilterChips({ label, options, selected, onToggle }: FilterChipsProps) {
  if (options.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-mist-500">{label}</span>
      {options.map((option) => {
        const active = selected.includes(option)
        return (
          <button
            key={option}
            onClick={() => onToggle(option)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              active
                ? 'border-brand-500 bg-brand-500/15 text-brand-300'
                : 'border-ink-600 text-mist-400 hover:border-ink-500 hover:text-mist-200',
            )}
          >
            {option}
          </button>
        )
      })}
    </div>
  )
}

interface GenreLanguageFiltersProps {
  genres: string[]
  languages: string[]
  selectedGenres: string[]
  selectedLanguages: string[]
  onToggleGenre: (genre: string) => void
  onToggleLanguage: (language: string) => void
  onClear: () => void
}

export function GenreLanguageFilters({
  genres,
  languages,
  selectedGenres,
  selectedLanguages,
  onToggleGenre,
  onToggleLanguage,
  onClear,
}: GenreLanguageFiltersProps) {
  const hasActiveFilters = selectedGenres.length > 0 || selectedLanguages.length > 0

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-ink-700 bg-ink-850/50 p-4">
      <FilterChips label="Genre" options={genres} selected={selectedGenres} onToggle={onToggleGenre} />
      <FilterChips label="Language" options={languages} selected={selectedLanguages} onToggle={onToggleLanguage} />
      {hasActiveFilters && (
        <button onClick={onClear} className="self-start text-xs font-medium text-brand-400 hover:text-brand-300">
          Clear all filters
        </button>
      )}
    </div>
  )
}
