import { useQuery } from '@tanstack/react-query'
import { api } from '@/data/apiClient'

export function useMovies() {
  return useQuery({ queryKey: ['movies'], queryFn: () => api.getMovies() })
}

export function useMovie(movieId: string | undefined) {
  return useQuery({
    queryKey: ['movie', movieId],
    queryFn: () => api.getMovie(movieId!),
    enabled: !!movieId,
  })
}

export function useMoviesForCity(cityId: string | undefined) {
  return useQuery({
    queryKey: ['movies', 'city', cityId],
    queryFn: () => api.getMoviesForCity(cityId!),
    enabled: !!cityId,
  })
}
