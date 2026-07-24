import { useMemo, useState } from 'react'
import type { Booking } from '@shared/types/domain'
import { useAuthStore } from '@/store/authStore'
import { useCancelBooking, useMyBookings } from '@/hooks/useBookings'
import { useShow } from '@/hooks/useShows'
import { useMovie } from '@/hooks/useMovies'
import { useCinema } from '@/hooks/useCinemas'
import { Tabs } from '@/components/ui/Tabs'
import { Skeleton } from '@/components/ui/Skeleton'
import { TicketCard } from '@/components/ticket/TicketCard'

type FilterTab = 'active' | 'cancelled'

function BookingListItem({ booking }: { booking: Booking }) {
  const { data: show } = useShow(booking.showId)
  const { data: movie } = useMovie(show?.movieId)
  const { data: cinema } = useCinema(show?.cinemaId)
  const cancelBooking = useCancelBooking()

  if (!show || !movie || !cinema) {
    return <Skeleton className="h-28 w-full rounded-2xl" />
  }

  const canCancel = booking.status === 'confirmed' && new Date(show.startTime).getTime() > Date.now()

  return (
    <TicketCard
      booking={booking}
      movie={movie}
      cinema={cinema}
      show={show}
      onCancel={canCancel ? () => cancelBooking.mutate(booking.id) : undefined}
      isCancelling={cancelBooking.isPending}
    />
  )
}

export default function AccountPage() {
  const profile = useAuthStore((state) => state.profile)
  const { data: bookings = [], isLoading } = useMyBookings()
  const [tab, setTab] = useState<FilterTab>('active')

  const filtered = useMemo(
    () => bookings.filter((b) => (tab === 'active' ? b.status === 'confirmed' : b.status === 'cancelled')),
    [bookings, tab],
  )

  const initials = profile?.name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      {profile && (
        <div className="mb-8 flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-brand-500 text-lg font-bold text-ink-950">
            {initials}
          </span>
          <div>
            <h1 className="text-xl font-bold text-mist-100">{profile.name}</h1>
            <p className="text-sm text-mist-400">{profile.email}</p>
          </div>
        </div>
      )}

      <Tabs
        tabs={[
          { value: 'active', label: 'My bookings' },
          { value: 'cancelled', label: 'Cancelled' },
        ]}
        value={tab}
        onChange={setTab}
      />

      <div className="mt-6 space-y-4">
        {isLoading && (
          <>
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
          </>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-ink-700 py-16 text-center">
            <p className="text-sm text-mist-400">
              {tab === 'active' ? "You haven't booked any tickets yet." : 'No cancelled bookings.'}
            </p>
          </div>
        )}

        {filtered.map((booking) => (
          <BookingListItem key={booking.id} booking={booking} />
        ))}
      </div>
    </div>
  )
}
