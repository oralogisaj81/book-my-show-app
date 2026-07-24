import type { Cinema, Movie, Screen, Show, TierBreakdownEntry } from '@shared/types/domain'
import { formatCurrency, formatShowDate, formatShowTime } from '@shared/lib/format'

interface CheckoutSummaryProps {
  movie: Movie
  cinema: Cinema
  screen: Screen
  show: Show
  seatIds: string[]
  tierBreakdown: TierBreakdownEntry[]
  subtotal: number
  convenienceFee: number
  total: number
}

export function CheckoutSummary({
  movie,
  cinema,
  screen,
  show,
  seatIds,
  tierBreakdown,
  subtotal,
  convenienceFee,
  total,
}: CheckoutSummaryProps) {
  return (
    <div className="rounded-2xl border border-ink-700 bg-ink-850/40 p-5">
      <div className="flex gap-4">
        <img src={movie.posterUrl} alt={movie.title} className="h-24 w-16 flex-shrink-0 rounded-lg object-cover" />
        <div>
          <h3 className="font-semibold text-mist-100">{movie.title}</h3>
          <p className="mt-1 text-xs text-mist-400">{cinema.name}</p>
          <p className="text-xs text-mist-500">
            {screen.name} · {show.format}
          </p>
          <p className="mt-1 text-xs text-mist-400">
            {formatShowDate(show.startTime)}, {formatShowTime(show.startTime)}
          </p>
        </div>
      </div>

      <div className="mt-4 border-t border-ink-700 pt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-mist-500">Seats</p>
        <p className="mt-1 text-sm text-mist-200">{[...seatIds].sort().join(', ')}</p>
      </div>

      <div className="mt-4 space-y-1.5 border-t border-ink-700 pt-4 text-sm">
        {tierBreakdown.map((tier) => (
          <div key={tier.tierId} className="flex justify-between text-mist-400">
            <span>
              {tier.tierName} × {tier.count}
            </span>
            <span>{formatCurrency(tier.count * tier.pricePerSeat)}</span>
          </div>
        ))}
        <div className="flex justify-between text-mist-400">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between text-mist-400">
          <span>Convenience fee</span>
          <span>{formatCurrency(convenienceFee)}</span>
        </div>
        <div className="flex justify-between border-t border-ink-700 pt-2 text-base font-bold text-mist-100">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  )
}
