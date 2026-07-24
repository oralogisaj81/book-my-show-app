import { useQuery } from '@tanstack/react-query'
import { api } from '@/data/apiClient'

export function useSeatMap(showId: string | undefined) {
  return useQuery({
    queryKey: ['seatMap', showId],
    queryFn: () => api.getSeatMap(showId!),
    enabled: !!showId,
    refetchInterval: 15000,
  })
}
