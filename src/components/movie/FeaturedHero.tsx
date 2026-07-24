import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Play, Star } from 'lucide-react'
import type { Movie } from '@shared/types/domain'
import { Badge } from '@/components/ui/Badge'
import { buttonClasses } from '@/components/ui/Button'
import { cn } from '@/lib/cn'

interface FeaturedHeroProps {
  movies: Movie[]
}

export function FeaturedHero({ movies }: FeaturedHeroProps) {
  const [index, setIndex] = useState(0)
  const featured = movies.slice(0, 5)

  useEffect(() => {
    if (featured.length <= 1) return
    const id = setInterval(() => setIndex((current) => (current + 1) % featured.length), 6000)
    return () => clearInterval(id)
  }, [featured.length])

  if (featured.length === 0) return null
  const movie = featured[index % featured.length]

  return (
    <div className="relative h-[60vh] min-h-[420px] w-full overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={movie.id}
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          <img src={movie.backdropUrl} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/60 to-ink-950/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink-950/90 via-ink-950/20 to-transparent" />
        </motion.div>
      </AnimatePresence>

      <div className="relative mx-auto flex h-full max-w-7xl flex-col justify-end px-4 pb-12 sm:px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={movie.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="max-w-xl"
          >
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge tone="gold">
                <Star className="h-3 w-3 fill-gold-400" />
                {movie.rating.toFixed(1)}
              </Badge>
              {movie.genres.slice(0, 3).map((genre) => (
                <Badge key={genre}>{genre}</Badge>
              ))}
            </div>
            <h1 className="text-balance text-4xl font-bold text-mist-100 sm:text-5xl">{movie.title}</h1>
            <p className="mt-3 line-clamp-2 text-sm text-mist-300 sm:text-base">{movie.synopsis}</p>
            <div className="mt-6 flex items-center gap-3">
              <Link to={`/movies/${movie.id}`} className={buttonClasses('primary', 'lg')}>
                <Play className="h-4 w-4 fill-white" />
                Book tickets
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>

        {featured.length > 1 && (
          <div className="mt-8 flex gap-1.5">
            {featured.map((m, i) => (
              <button
                key={m.id}
                onClick={() => setIndex(i)}
                className={cn('h-1.5 rounded-full transition-all', i === index ? 'w-8 bg-brand-500' : 'w-4 bg-ink-600')}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
