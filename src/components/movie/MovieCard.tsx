import type { SyntheticEvent } from 'react'
import { Link } from 'react-router-dom'
import { Star } from 'lucide-react'
import type { Movie } from '@shared/types/domain'
import { formatDuration } from '@shared/lib/format'

interface MovieCardProps {
  movie: Movie
}

function handlePosterError(event: SyntheticEvent<HTMLImageElement>) {
  event.currentTarget.style.display = 'none'
  event.currentTarget.nextElementSibling?.classList.remove('hidden')
}

export function MovieCard({ movie }: MovieCardProps) {
  return (
    <Link to={`/movies/${movie.id}`} className="group block">
      <div className="relative aspect-[2/3] overflow-hidden rounded-2xl bg-ink-800 shadow-card">
        <img
          src={movie.posterUrl}
          alt={movie.title}
          loading="lazy"
          onError={handlePosterError}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 hidden flex-col items-center justify-center gap-2 bg-gradient-to-br from-ink-700 to-ink-900 p-4 text-center">
          <span className="text-sm font-semibold text-mist-200">{movie.title}</span>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-ink-950/80 px-2 py-0.5 text-xs font-semibold text-gold-400 backdrop-blur-sm">
          <Star className="h-3 w-3 fill-gold-400" />
          {movie.rating.toFixed(1)}
        </div>
        <div className="absolute inset-x-0 bottom-0 translate-y-2 p-3 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <p className="text-xs text-mist-300">
            {formatDuration(movie.durationMinutes)} · {movie.certification}
          </p>
        </div>
      </div>
      <div className="mt-2.5 px-0.5">
        <h3 className="truncate text-sm font-semibold text-mist-100 group-hover:text-brand-300">{movie.title}</h3>
        <p className="mt-0.5 truncate text-xs text-mist-500">{movie.genres.slice(0, 2).join(', ')}</p>
      </div>
    </Link>
  )
}
