import { useQuery } from '@tanstack/react-query'
import { api } from '@/data/apiClient'

export function useShowsForMovie(movieId: string | undefined, cityId: string | undefined) {
  return useQuery({
    queryKey: ['shows', 'movie', movieId, cityId],
    queryFn: () => api.getShowsForMovie(movieId!, cityId!),
    enabled: !!movieId && !!cityId,
  })
}

export function useShow(showId: string | undefined) {
  return useQuery({
    queryKey: ['show', showId],
    queryFn: () => api.getShow(showId!),
    enabled: !!showId,
  })
}
