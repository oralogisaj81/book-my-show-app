import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMoviesForCity } from '@/hooks/useMovies'
import { useCityStore } from '@/store/cityStore'
import { Tabs } from '@/components/ui/Tabs'
import { SearchBar } from '@/components/movie/SearchBar'
import { GenreLanguageFilters } from '@/components/movie/GenreLanguageFilters'
import { MovieGrid } from '@/components/movie/MovieGrid'
import { FeaturedHero } from '@/components/movie/FeaturedHero'

type StatusTab = 'now-showing' | 'upcoming'

export default function HomePage() {
  const { activeCityId } = useCityStore()
  const { data: movies = [], isLoading } = useMoviesForCity(activeCityId)
  const [searchParams] = useSearchParams()
  const [statusTab, setStatusTab] = useState<StatusTab>('now-showing')
  const [search, setSearch] = useState(searchParams.get('q') ?? '')
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([])

  useEffect(() => {
    const q = searchParams.get('q')
    if (q !== null && q !== search) setSearch(q)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const allGenres = useMemo(() => Array.from(new Set(movies.flatMap((m) => m.genres))).sort(), [movies])
  const allLanguages = useMemo(() => Array.from(new Set(movies.flatMap((m) => m.languages))).sort(), [movies])

  const featuredMovies = useMemo(
    () =>
      [...movies]
        .filter((m) => m.status === 'now-showing')
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 5),
    [movies],
  )

  const filteredMovies = useMemo(() => {
    return movies.filter((movie) => {
      if (movie.status !== statusTab) return false
      if (search && !movie.title.toLowerCase().includes(search.toLowerCase())) return false
      if (selectedGenres.length > 0 && !selectedGenres.some((g) => movie.genres.includes(g))) return false
      if (selectedLanguages.length > 0 && !selectedLanguages.some((l) => movie.languages.includes(l))) return false
      return true
    })
  }, [movies, statusTab, search, selectedGenres, selectedLanguages])

  function toggleGenre(genre: string) {
    setSelectedGenres((prev) => (prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]))
  }

  function toggleLanguage(language: string) {
    setSelectedLanguages((prev) => (prev.includes(language) ? prev.filter((l) => l !== language) : [...prev, language]))
  }

  function clearFilters() {
    setSelectedGenres([])
    setSelectedLanguages([])
  }

  return (
    <div>
      {!isLoading && <FeaturedHero movies={featuredMovies} />}

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Tabs
            tabs={[
              { value: 'now-showing', label: 'Now Showing' },
              { value: 'upcoming', label: 'Upcoming' },
            ]}
            value={statusTab}
            onChange={setStatusTab}
          />
          <SearchBar value={search} onChange={setSearch} className="w-full sm:w-72 md:hidden" />
        </div>

        <div className="mt-6">
          <GenreLanguageFilters
            genres={allGenres}
            languages={allLanguages}
            selectedGenres={selectedGenres}
            selectedLanguages={selectedLanguages}
            onToggleGenre={toggleGenre}
            onToggleLanguage={toggleLanguage}
            onClear={clearFilters}
          />
        </div>

        <div className="mt-8">
          <MovieGrid movies={filteredMovies} isLoading={isLoading} />
        </div>
      </div>
    </div>
  )
}
