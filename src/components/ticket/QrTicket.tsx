import { QRCodeSVG } from 'qrcode.react'
import type { Booking, Cinema, Movie, Screen, Show } from '@shared/types/domain'
import { formatCurrency, formatShowDate, formatShowTime } from '@shared/lib/format'

interface QrTicketProps {
  booking: Booking
  movie: Movie
  cinema: Cinema
  screen: Screen
  show: Show
}

export function QrTicket({ booking, movie, cinema, screen, show }: QrTicketProps) {
  return (
    <div className="overflow-hidden rounded-3xl border border-ink-700 bg-ink-850 shadow-card">
      <div className="relative h-40 w-full overflow-hidden">
        <img src={movie.backdropUrl} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-850 via-ink-850/40 to-transparent" />
      </div>

      <div className="relative -mt-10 px-6">
        <div className="flex items-end gap-4">
          <img
            src={movie.posterUrl}
            alt={movie.title}
            className="h-28 w-20 rounded-xl object-cover shadow-card ring-4 ring-ink-850"
          />
          <div className="pb-1">
            <h2 className="text-lg font-bold text-mist-100">{movie.title}</h2>
            <p className="text-xs text-mist-400">
              {show.format} · {screen.name}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 px-6 py-5 text-sm">
        <div>
          <p className="text-xs text-mist-500">Cinema</p>
          <p className="mt-0.5 font-medium text-mist-200">{cinema.name}</p>
        </div>
        <div>
          <p className="text-xs text-mist-500">Date &amp; time</p>
          <p className="mt-0.5 font-medium text-mist-200">
            {formatShowDate(show.startTime)}, {formatShowTime(show.startTime)}
          </p>
        </div>
        <div>
          <p className="text-xs text-mist-500">Seats</p>
          <p className="mt-0.5 font-medium text-mist-200">{[...booking.seatIds].sort().join(', ')}</p>
        </div>
        <div>
          <p className="text-xs text-mist-500">Amount paid</p>
          <p className="mt-0.5 font-medium text-mist-200">{formatCurrency(booking.total)}</p>
        </div>
      </div>

      <div className="relative mx-6 mb-6 flex items-center justify-center rounded-2xl border border-dashed border-ink-600 bg-ink-900/60 py-6">
        <div className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-ink-950" />
        <div className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-ink-950" />
        <div className="rounded-xl bg-white p-3">
          <QRCodeSVG value={booking.qrPayload} size={140} />
        </div>
      </div>
      <div className="px-6 pb-6 text-center">
        <p className="text-[11px] uppercase tracking-widest text-mist-500">Booking ID</p>
        <p className="font-mono text-xs text-mist-400">{booking.id}</p>
      </div>
    </div>
  )
}
