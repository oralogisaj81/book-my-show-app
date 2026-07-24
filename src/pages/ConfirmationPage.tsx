import { useParams, Link } from 'react-router-dom'
import { CheckCircle2, Printer } from 'lucide-react'
import { useBooking } from '@/hooks/useBookings'
import { useShow } from '@/hooks/useShows'
import { useMovie } from '@/hooks/useMovies'
import { useCinema, useScreen } from '@/hooks/useCinemas'
import { QrTicket } from '@/components/ticket/QrTicket'
import { Button, buttonClasses } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'

export default function ConfirmationPage() {
  const { bookingId } = useParams<{ bookingId: string }>()
  const { data: booking, isLoading: bookingLoading } = useBooking(bookingId)
  const { data: show } = useShow(booking?.showId)
  const { data: movie } = useMovie(show?.movieId)
  const { data: cinema } = useCinema(show?.cinemaId)
  const { data: screen } = useScreen(show?.screenId)

  if (bookingLoading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    )
  }

  if (!booking || !show || !movie || !cinema || !screen) {
    return <div className="mx-auto max-w-lg px-4 py-16 text-center text-mist-400">Booking not found.</div>
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
      <div className="mb-6 flex flex-col items-center text-center">
        <CheckCircle2 className="h-12 w-12 text-teal-400" />
        <h1 className="mt-3 text-2xl font-bold text-mist-100">Booking confirmed!</h1>
        <p className="mt-1 text-sm text-mist-400">Your tickets are ready. Show the QR code at the venue.</p>
      </div>

      <QrTicket booking={booking} movie={movie} cinema={cinema} screen={screen} show={show} />

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button variant="outline" className="flex-1" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Print ticket
        </Button>
        <Link to="/account" className={buttonClasses('primary', 'md', 'flex-1')}>
          View my bookings
        </Link>
      </div>
    </div>
  )
}
