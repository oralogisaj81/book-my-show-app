import { useQuery } from '@tanstack/react-query'
import { api } from '@/data/apiClient'

export function useCities() {
  return useQuery({ queryKey: ['cities'], queryFn: () => api.getCities() })
}
