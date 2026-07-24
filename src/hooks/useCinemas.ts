import { useQuery } from '@tanstack/react-query'
import { api } from '@/data/apiClient'

export function useCinemas(cityId?: string) {
  return useQuery({ queryKey: ['cinemas', cityId], queryFn: () => api.getCinemas(cityId) })
}

export function useCinema(cinemaId: string | undefined) {
  return useQuery({
    queryKey: ['cinema', cinemaId],
    queryFn: () => api.getCinema(cinemaId!),
    enabled: !!cinemaId,
  })
}

export function useScreen(screenId: string | undefined) {
  return useQuery({
    queryKey: ['screen', screenId],
    queryFn: () => api.getScreen(screenId!),
    enabled: !!screenId,
  })
}
