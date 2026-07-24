export type MovieStatus = 'now-showing' | 'upcoming'

export interface City {
  id: string
  name: string
  state: string
}

export interface CastMember {
  name: string
  role: string
}

export interface Movie {
  id: string
  title: string
  synopsis: string
  genres: string[]
  languages: string[]
  durationMinutes: number
  certification: string
  rating: number
  releaseDate: string
  status: MovieStatus
  posterUrl: string
  backdropUrl: string
  director: string
  cast: CastMember[]
}

export type SeatTierId = string

export interface SeatTier {
  id: SeatTierId
  name: string
  price: number
  color: string
  rowStart: number
  rowEnd: number
}

export interface ScreenLayout {
  rows: number
  cols: number
  aisleAfterCols: number[]
  aisleAfterRows: number[]
  tiers: SeatTier[]
  skipSeats: string[]
}

export interface Screen {
  id: string
  cinemaId: string
  name: string
  layout: ScreenLayout
  features: string[]
}

export interface Cinema {
  id: string
  cityId: string
  name: string
  address: string
  screenIds: string[]
}

export interface Show {
  id: string
  movieId: string
  cinemaId: string
  screenId: string
  startTime: string
  language: string
  format: string
  priceOverrides: Record<SeatTierId, number>
}

export type SeatStatus = 'available' | 'held' | 'booked'

export interface SeatState {
  seatId: string
  row: number
  col: number
  tierId: SeatTierId
  status: SeatStatus
}

export interface SeatHold {
  id: string
  showId: string
  seatIds: string[]
  holderId: string
  createdAt: string
  expiresAt: string
}

export type BookingStatus = 'confirmed' | 'cancelled'

export interface TierBreakdownEntry {
  tierId: string
  tierName: string
  count: number
  pricePerSeat: number
}

export interface Booking {
  id: string
  userId: string
  showId: string
  seatIds: string[]
  tierBreakdown: TierBreakdownEntry[]
  subtotal: number
  convenienceFee: number
  total: number
  status: BookingStatus
  qrPayload: string
  createdAt: string
  cancelledAt?: string
}

export interface UserProfile {
  id: string
  name: string
  email: string
  isAdmin: boolean
  createdAt: string
}

export interface AnalyticsSummary {
  totalRevenue: number
  totalBookings: number
  totalSeatsSold: number
  averageOccupancy: number
  revenueByDay: { date: string; revenue: number }[]
  occupancyByCinema: { cinemaId: string; cinemaName: string; occupancy: number }[]
  topMovies: { movieId: string; title: string; revenue: number; ticketsSold: number }[]
}
