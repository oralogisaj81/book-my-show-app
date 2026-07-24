import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/data/apiClient'
import type { ConfirmBookingInput } from '@/data/api'

export function useHoldSeats() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ showId, seatIds, holderId }: { showId: string; seatIds: string[]; holderId: string }) =>
      api.holdSeats(showId, seatIds, holderId),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['seatMap', variables.showId] })
    },
  })
}

export function useReleaseHold() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (holdId: string) => api.releaseHold(holdId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seatMap'] })
    },
  })
}

export function useConfirmBooking() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ConfirmBookingInput) => api.confirmBooking(input),
    onSuccess: (booking) => {
      queryClient.invalidateQueries({ queryKey: ['seatMap', booking.showId] })
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
    },
  })
}
