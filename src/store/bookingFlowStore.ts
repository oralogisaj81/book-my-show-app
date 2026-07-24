import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface BookingFlowState {
  showId: string | null
  holdId: string | null
  expiresAt: string | null
  seatIds: string[]
  startHold: (showId: string, holdId: string, expiresAt: string, seatIds: string[]) => void
  clear: () => void
}

export const useBookingFlowStore = create<BookingFlowState>()(
  persist(
    (set) => ({
      showId: null,
      holdId: null,
      expiresAt: null,
      seatIds: [],
      startHold: (showId, holdId, expiresAt, seatIds) => set({ showId, holdId, expiresAt, seatIds }),
      clear: () => set({ showId: null, holdId: null, expiresAt: null, seatIds: [] }),
    }),
    { name: 'cinehall:booking-flow' },
  ),
)
