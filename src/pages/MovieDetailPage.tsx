import { useParams } from 'react-router-dom'
import { Clock, Star } from 'lucide-react'
import { useMovie } from '@/hooks/useMovies'
import { useCityStore } from '@/store/cityStore'
import { useShowsForMovie } from '@/hooks/useShows'
import { useCinemas } from '@/hooks/useCinemas'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { ShowtimePicker } from '@/components/booking/ShowtimePicker'
import { formatDuration } from '@shared/lib/format'

export default function MovieDetailPage() {
  const { movieId } = useParams<{ movieId: string }>()
  const { activeCityId } = useCityStore()
  const { data: movie, isLoading } = useMovie(movieId)
  const { data: shows = [] } = useShowsForMovie(movieId, activeCityId)
  const { data: cinemas = [] } = useCinemas(activeCityId)

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    )
  }

  if (!movie) {
    return <div className="mx-auto max-w-7xl px-4 py-16 text-center text-mist-400">Movie not found.</div>
  }

  return (
    <div>
      <div className="relative h-[45vh] min-h-[320px] w-full overflow-hidden">
        <img src={movie.backdropUrl} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/70 to-ink-950/30" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="-mt-32 flex flex-col gap-6 sm:flex-row sm:items-end">
          <img
            src={movie.posterUrl}
            alt={movie.title}
            className="h-56 w-40 flex-shrink-0 rounded-2xl object-cover shadow-card ring-4 ring-ink-950 sm:h-64 sm:w-44"
          />
          <div className="flex-1 pb-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="gold">
                <Star className="h-3 w-3 fill-gold-400" />
                {movie.rating.toFixed(1)}
              </Badge>
              <Badge>{movie.certification}</Badge>
              {movie.status === 'upcoming' && <Badge tone="teal">Coming soon</Badge>}
            </div>
            <h1 className="mt-2 text-3xl font-bold text-mist-100 sm:text-4xl">{movie.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-mist-400">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {formatDuration(movie.durationMinutes)}
              </span>
              <span>{movie.genres.join(', ')}</span>
              <span>{movie.languages.join(', ')}</span>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-lg font-semibold text-mist-100">About the movie</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-mist-300">{movie.synopsis}</p>
          <p className="mt-4 text-xs text-mist-500">Directed by {movie.director}</p>

          <h2 className="mt-8 text-lg font-semibold text-mist-100">Cast</h2>
          <div className="mt-3 flex gap-4 overflow-x-auto pb-2">
            {movie.cast.map((member) => (
              <div key={member.name} className="w-28 flex-shrink-0 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-ink-700 text-sm font-semibold text-mist-300">
                  {member.name
                    .split(' ')
                    .map((part) => part[0])
                    .slice(0, 2)
                    .join('')}
                </div>
                <p className="mt-2 truncate text-xs font-medium text-mist-200">{member.name}</p>
                <p className="truncate text-[11px] text-mist-500">{member.role}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 border-t border-ink-700 pb-16 pt-8">
          <h2 className="mb-4 text-lg font-semibold text-mist-100">Showtimes</h2>
          {movie.status === 'upcoming' ? (
            <p className="text-sm text-mist-400">Booking opens closer to release.</p>
          ) : (
            <ShowtimePicker shows={shows} cinemas={cinemas} />
          )}
        </div>
      </div>
    </div>
  )
}
