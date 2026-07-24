import type { AnalyticsSummary, Booking, Cinema, City, Movie, Screen, SeatHold, SeatState, Show } from '@shared/types/domain'
export { ApiError } from '@shared/lib/apiError'

export interface HoldSeatsResult {
  hold: SeatHold
  seats: SeatState[]
}

export interface ConfirmBookingInput {
  holdId: string
}

/**
 * Data-access boundary for the whole app. `httpApi.ts` implements it against the Fastify
 * backend; every hook goes through `src/data/apiClient.ts`, never this interface's
 * implementations directly, so swapping the implementation never touches a component.
 *
 * Authentication (login/signup/logout/session) is a separate, cross-cutting concern —
 * see `src/data/authApi.ts` — not part of this booking-domain interface.
 */
export interface BookingApi {
  getCities(): Promise<City[]>

  getMovies(): Promise<Movie[]>
  getMovie(movieId: string): Promise<Movie | undefined>
  getMoviesForCity(cityId: string): Promise<Movie[]>

  getCinemas(cityId?: string): Promise<Cinema[]>
  getCinema(cinemaId: string): Promise<Cinema | undefined>
  getScreen(screenId: string): Promise<Screen | undefined>

  getShowsForMovie(movieId: string, cityId: string): Promise<Show[]>
  getShow(showId: string): Promise<Show | undefined>

  getSeatMap(showId: string): Promise<SeatState[]>
  holdSeats(showId: string, seatIds: string[], holderId: string): Promise<HoldSeatsResult>
  releaseHold(holdId: string): Promise<void>
  getHold(holdId: string): Promise<SeatHold | undefined>

  confirmBooking(input: ConfirmBookingInput): Promise<Booking>
  cancelBooking(bookingId: string): Promise<Booking>
  getMyBookings(): Promise<Booking[]>
  getBooking(bookingId: string): Promise<Booking | undefined>

  // Admin
  getAllCinemas(): Promise<Cinema[]>
  getAllScreens(): Promise<Screen[]>
  upsertCinema(cinema: Cinema): Promise<Cinema>
  deleteCinema(cinemaId: string): Promise<void>
  upsertScreen(screen: Screen): Promise<Screen>
  deleteScreen(screenId: string): Promise<void>

  getAllShows(): Promise<Show[]>
  upsertShow(show: Show): Promise<Show>
  deleteShow(showId: string): Promise<void>

  getAnalytics(): Promise<AnalyticsSummary>
}
