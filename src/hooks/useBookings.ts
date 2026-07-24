import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/data/apiClient'

export function useMyBookings() {
  return useQuery({
    queryKey: ['bookings', 'me'],
    queryFn: () => api.getMyBookings(),
  })
}

export function useBooking(bookingId: string | undefined) {
  return useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => api.getBooking(bookingId!),
    enabled: !!bookingId,
  })
}

export function useCancelBooking() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (bookingId: string) => api.cancelBooking(bookingId),
    onSuccess: (booking) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['booking', booking.id] })
      queryClient.invalidateQueries({ queryKey: ['seatMap', booking.showId] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
    },
  })
}
