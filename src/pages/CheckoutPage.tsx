import { useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useShow } from '@/hooks/useShows'
import { useMovie } from '@/hooks/useMovies'
import { useCinema, useScreen } from '@/hooks/useCinemas'
import { useConfirmBooking } from '@/hooks/useBookingMutations'
import { useBookingFlowStore } from '@/store/bookingFlowStore'
import { CheckoutSummary } from '@/components/booking/CheckoutSummary'
import { PaymentForm } from '@/components/booking/PaymentForm'
import { HoldTimer } from '@/components/booking/HoldTimer'
import { Skeleton } from '@/components/ui/Skeleton'
import { computeTierBreakdown, sumTierBreakdown } from '@shared/lib/seatGrid'

const CONVENIENCE_FEE_RATE = 0.05

export default function CheckoutPage() {
  const { showId } = useParams<{ showId: string }>()
  const navigate = useNavigate()
  const flowShowId = useBookingFlowStore((state) => state.showId)
  const holdId = useBookingFlowStore((state) => state.holdId)
  const expiresAt = useBookingFlowStore((state) => state.expiresAt)
  const seatIds = useBookingFlowStore((state) => state.seatIds)
  const clearFlow = useBookingFlowStore((state) => state.clear)
  const confirmBooking = useConfirmBooking()

  const { data: show, isLoading: showLoading } = useShow(showId)
  const { data: movie } = useMovie(show?.movieId)
  const { data: cinema } = useCinema(show?.cinemaId)
  const { data: screen } = useScreen(show?.screenId)

  const hasValidHold = flowShowId === showId && !!holdId && !!expiresAt

  useEffect(() => {
    if (!showLoading && !hasValidHold) {
      navigate(showId ? `/book/${showId}` : '/', { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasValidHold, showLoading])

  const { tierBreakdown, subtotal, convenienceFee, total } = useMemo(() => {
    if (!screen || !show) return { tierBreakdown: [], subtotal: 0, convenienceFee: 0, total: 0 }
    const breakdown = computeTierBreakdown(seatIds, screen.layout, show.priceOverrides)
    const sub = sumTierBreakdown(breakdown)
    const fee = Math.round(sub * CONVENIENCE_FEE_RATE)
    return { tierBreakdown: breakdown, subtotal: sub, convenienceFee: fee, total: sub + fee }
  }, [screen, show, seatIds])

  function handleExpire() {
    clearFlow()
    navigate(showId ? `/book/${showId}` : '/', { replace: true })
  }

  async function handlePay() {
    if (!holdId) return
    try {
      const booking = await confirmBooking.mutateAsync({ holdId })
      // Don't clear the flow store here: doing so flips `hasValidHold` to false on this
      // still-mounted page, which fires the redirect guard below and races the navigate
      // to the confirmation page. The consumed hold is already gone server-side; the next
      // visit to seat selection cleans up the stale flow state on its own.
      navigate(`/booking/${booking.id}`)
    } catch {
      clearFlow()
      navigate(showId ? `/book/${showId}` : '/', { replace: true })
    }
  }

  if (showLoading || !show || !movie || !cinema || !screen || !hasValidHold) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-mist-100">Checkout</h1>
        {expiresAt && <HoldTimer expiresAt={expiresAt} onExpire={handleExpire} />}
      </div>

      <div className="space-y-6">
        <CheckoutSummary
          movie={movie}
          cinema={cinema}
          screen={screen}
          show={show}
          seatIds={seatIds}
          tierBreakdown={tierBreakdown}
          subtotal={subtotal}
          convenienceFee={convenienceFee}
          total={total}
        />
        <PaymentForm amount={total} isSubmitting={confirmBooking.isPending} onSubmit={handlePay} />
      </div>
    </div>
  )
}
