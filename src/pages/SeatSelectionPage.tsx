import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useShow } from '@/hooks/useShows'
import { useMovie } from '@/hooks/useMovies'
import { useCinema, useScreen } from '@/hooks/useCinemas'
import { useSeatMap } from '@/hooks/useSeatMap'
import { useHoldSeats, useReleaseHold } from '@/hooks/useBookingMutations'
import { useAuthStore } from '@/store/authStore'
import { useBookingFlowStore } from '@/store/bookingFlowStore'
import { SeatMap } from '@/components/booking/SeatMap'
import { SeatLegend } from '@/components/booking/SeatLegend'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCurrency, formatShowDate, formatShowTime } from '@shared/lib/format'
import { priceForTier } from '@shared/lib/seatGrid'

const MAX_SEATS = 10

export default function SeatSelectionPage() {
  const { showId } = useParams<{ showId: string }>()
  const navigate = useNavigate()
  const profile = useAuthStore((state) => state.profile)
  const flowShowId = useBookingFlowStore((state) => state.showId)
  const flowHoldId = useBookingFlowStore((state) => state.holdId)
  const clearFlow = useBookingFlowStore((state) => state.clear)
  const releaseHold = useReleaseHold()
  const holdMutation = useHoldSeats()

  const { data: show, isLoading: showLoading } = useShow(showId)
  const { data: movie } = useMovie(show?.movieId)
  const { data: cinema } = useCinema(show?.cinemaId)
  const { data: screen } = useScreen(show?.screenId)
  const { data: seats = [], isLoading: seatsLoading } = useSeatMap(showId)

  const [selectedSeatIds, setSelectedSeatIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  // Abandon any leftover hold from a previous visit to this show's seat map.
  useEffect(() => {
    if (flowShowId === showId && flowHoldId) {
      releaseHold.mutate(flowHoldId)
      clearFlow()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showId])

  const seatById = useMemo(() => new Map(seats.map((seat) => [seat.seatId, seat])), [seats])

  function toggleSeat(seatId: string) {
    const seat = seatById.get(seatId)
    if (!seat || seat.status !== 'available') return
    setError(null)
    setSelectedSeatIds((prev) => {
      const next = new Set(prev)
      if (next.has(seatId)) {
        next.delete(seatId)
      } else {
        if (next.size >= MAX_SEATS) return prev
        next.add(seatId)
      }
      return next
    })
  }

  const totalPrice = useMemo(() => {
    if (!screen || !show) return 0
    let total = 0
    for (const seatId of selectedSeatIds) {
      const seat = seatById.get(seatId)
      if (!seat) continue
      total += priceForTier(seat.tierId, screen.layout, show.priceOverrides)
    }
    return total
  }, [selectedSeatIds, seatById, screen, show])

  async function handleProceed() {
    if (!showId || !profile || selectedSeatIds.size === 0) return
    setError(null)
    try {
      const result = await holdMutation.mutateAsync({
        showId,
        seatIds: Array.from(selectedSeatIds),
        holderId: profile.id,
      })
      useBookingFlowStore
        .getState()
        .startHold(showId, result.hold.id, result.hold.expiresAt, Array.from(selectedSeatIds))
      navigate(`/book/${showId}/checkout`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not hold these seats. Please try again.')
      setSelectedSeatIds(new Set())
    }
  }

  if (showLoading || seatsLoading || !show || !screen) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-32 pt-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-mist-100">{movie?.title}</h1>
        <p className="mt-1 text-sm text-mist-400">
          {cinema?.name} · {formatShowDate(show.startTime)}, {formatShowTime(show.startTime)} · {show.format}
          {screen.features.length > 0 && ` · ${screen.features.join(', ')}`}
        </p>
      </div>

      <SeatMap
        layout={screen.layout}
        seats={seats}
        selectedSeatIds={selectedSeatIds}
        onToggleSeat={toggleSeat}
        disabled={holdMutation.isPending}
      />

      <div className="mt-10">
        <SeatLegend tiers={screen.layout.tiers} />
      </div>

      {error && <p className="mt-4 text-center text-sm text-red-400">{error}</p>}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-700 bg-ink-900/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs text-mist-500">
              {selectedSeatIds.size} seat{selectedSeatIds.size === 1 ? '' : 's'} selected
            </p>
            <p className="text-lg font-bold text-mist-100">{formatCurrency(totalPrice)}</p>
          </div>
          <Button size="lg" disabled={selectedSeatIds.size === 0 || holdMutation.isPending} onClick={handleProceed}>
            {holdMutation.isPending ? 'Holding seats…' : 'Proceed to pay'}
          </Button>
        </div>
      </div>
    </div>
  )
}
