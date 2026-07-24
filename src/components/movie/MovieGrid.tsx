import type { Movie } from '@shared/types/domain'
import { MovieCard } from './MovieCard'
import { Skeleton } from '@/components/ui/Skeleton'

interface MovieGridProps {
  movies: Movie[]
  isLoading?: boolean
}

export function MovieGrid({ movies, isLoading }: MovieGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: 12 }).map((_, index) => (
          <div key={index}>
            <Skeleton className="aspect-[2/3] w-full rounded-2xl" />
            <Skeleton className="mt-2.5 h-4 w-3/4" />
            <Skeleton className="mt-1.5 h-3 w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  if (movies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-700 py-20 text-center">
        <p className="text-lg font-medium text-mist-300">No movies found</p>
        <p className="mt-1 text-sm text-mist-500">Try adjusting your search or filters.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {movies.map((movie) => (
        <MovieCard key={movie.id} movie={movie} />
      ))}
    </div>
  )
}
