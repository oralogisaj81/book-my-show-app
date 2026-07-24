import { Link } from 'react-router-dom'
import { Calendar, MapPin, Ticket as TicketIcon } from 'lucide-react'
import type { Booking, Cinema, Movie, Show } from '@shared/types/domain'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatCurrency, formatShowDate, formatShowTime } from '@shared/lib/format'

interface TicketCardProps {
  booking: Booking
  movie: Movie
  cinema: Cinema
  show: Show
  onCancel?: () => void
  isCancelling?: boolean
}

export function TicketCard({ booking, movie, cinema, show, onCancel, isCancelling }: TicketCardProps) {
  const isPast = new Date(show.startTime).getTime() < Date.now()
  const isCancelled = booking.status === 'cancelled'

  return (
    <div className="flex gap-4 rounded-2xl border border-ink-700 bg-ink-850/40 p-4">
      <img src={movie.posterUrl} alt={movie.title} className="h-24 w-16 flex-shrink-0 rounded-lg object-cover" />
      <div className="flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-mist-100">{movie.title}</h3>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-mist-400">
              <MapPin className="h-3 w-3" />
              {cinema.name}
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-mist-400">
              <Calendar className="h-3 w-3" />
              {formatShowDate(show.startTime)}, {formatShowTime(show.startTime)}
            </p>
          </div>
          {isCancelled ? (
            <Badge tone="neutral">Cancelled</Badge>
          ) : isPast ? (
            <Badge tone="neutral">Completed</Badge>
          ) : (
            <Badge tone="teal">Upcoming</Badge>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-mist-500">
            Seats {[...booking.seatIds].sort().join(', ')} · {formatCurrency(booking.total)}
          </p>
          <div className="flex items-center gap-2">
            <Link
              to={`/booking/${booking.id}`}
              className="inline-flex items-center gap-1 text-xs font-medium text-brand-400 hover:text-brand-300"
            >
              <TicketIcon className="h-3.5 w-3.5" />
              View ticket
            </Link>
            {!isCancelled && !isPast && onCancel && (
              <Button variant="danger" size="sm" onClick={onCancel} disabled={isCancelling}>
                {isCancelling ? 'Cancelling…' : 'Cancel'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
