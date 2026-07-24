import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface CityState {
  activeCityId: string
  setActiveCityId: (cityId: string) => void
}

export const useCityStore = create<CityState>()(
  persist(
    (set) => ({
      activeCityId: 'mumbai',
      setActiveCityId: (cityId) => set({ activeCityId: cityId }),
    }),
    { name: 'cinehall:city' },
  ),
)
