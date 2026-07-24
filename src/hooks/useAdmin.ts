import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/data/apiClient'
import type { Cinema, Screen, Show } from '@shared/types/domain'

export function useAllCinemas() {
  return useQuery({ queryKey: ['cinemas'], queryFn: () => api.getAllCinemas() })
}

export function useAllScreens() {
  return useQuery({ queryKey: ['screens'], queryFn: () => api.getAllScreens() })
}

export function useAllShows() {
  return useQuery({ queryKey: ['shows'], queryFn: () => api.getAllShows() })
}

export function useAnalytics() {
  return useQuery({ queryKey: ['analytics'], queryFn: () => api.getAnalytics() })
}

export function useUpsertCinema() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (cinema: Cinema) => api.upsertCinema(cinema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cinemas'] })
    },
  })
}

export function useDeleteCinema() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (cinemaId: string) => api.deleteCinema(cinemaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cinemas'] })
      queryClient.invalidateQueries({ queryKey: ['screens'] })
      queryClient.invalidateQueries({ queryKey: ['shows'] })
      queryClient.invalidateQueries({ queryKey: ['show'] })
    },
  })
}

export function useUpsertScreen() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (screen: Screen) => api.upsertScreen(screen),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['screens'] })
      queryClient.invalidateQueries({ queryKey: ['cinemas'] })
    },
  })
}

export function useDeleteScreen() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (screenId: string) => api.deleteScreen(screenId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['screens'] })
      queryClient.invalidateQueries({ queryKey: ['cinemas'] })
      queryClient.invalidateQueries({ queryKey: ['shows'] })
      queryClient.invalidateQueries({ queryKey: ['show'] })
    },
  })
}

export function useUpsertShow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (show: Show) => api.upsertShow(show),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shows'] })
      queryClient.invalidateQueries({ queryKey: ['show'] })
    },
  })
}

export function useDeleteShow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (showId: string) => api.deleteShow(showId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shows'] })
      queryClient.invalidateQueries({ queryKey: ['show'] })
    },
  })
}
