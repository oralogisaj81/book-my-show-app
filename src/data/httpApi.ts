import type { BookingApi, ConfirmBookingInput } from './api'
import { toUndefinedOn404, qs, request } from './httpClient'
import type { Booking, Cinema, Movie, Screen, SeatHold, Show } from '@shared/types/domain'

export const httpApi: BookingApi = {
  getCities: () => request('/cities'),

  getMovies: () => request('/movies'),
  getMovie: (movieId) => request<Movie>(`/movies/${movieId}`).catch(toUndefinedOn404<Movie>('MOVIE_NOT_FOUND')),
  getMoviesForCity: (cityId) => request(`/movies/city/${cityId}`),

  getCinemas: (cityId) => request(`/cinemas${qs({ cityId })}`),
  getCinema: (cinemaId) =>
    request<Cinema>(`/cinemas/${cinemaId}`).catch(toUndefinedOn404<Cinema>('CINEMA_NOT_FOUND')),
  getScreen: (screenId) =>
    request<Screen>(`/screens/${screenId}`).catch(toUndefinedOn404<Screen>('SCREEN_NOT_FOUND')),

  getShowsForMovie: (movieId, cityId) => request(`/shows/movie/${movieId}${qs({ cityId })}`),
  getShow: (showId) => request<Show>(`/shows/${showId}`).catch(toUndefinedOn404<Show>('SHOW_NOT_FOUND')),

  getSeatMap: (showId) => request(`/shows/${showId}/seatmap`),
  holdSeats: (showId, seatIds, holderId) =>
    request(`/shows/${showId}/hold`, { method: 'POST', body: JSON.stringify({ seatIds, holderId }) }),
  releaseHold: (holdId) => request(`/holds/${holdId}/release`, { method: 'POST' }),
  getHold: (holdId) => request<SeatHold>(`/holds/${holdId}`).catch(toUndefinedOn404<SeatHold>('HOLD_NOT_FOUND')),

  confirmBooking: (input: ConfirmBookingInput) =>
    request('/bookings/confirm', { method: 'POST', body: JSON.stringify(input) }),
  cancelBooking: (bookingId) => request(`/bookings/${bookingId}/cancel`, { method: 'POST' }),
  getMyBookings: () => request('/bookings/me'),
  getBooking: (bookingId) =>
    request<Booking>(`/bookings/${bookingId}`).catch(toUndefinedOn404<Booking>('BOOKING_NOT_FOUND')),

  // Admin
  getAllCinemas: () => request('/admin/cinemas'),
  getAllScreens: () => request('/admin/screens'),
  upsertCinema: (cinema) => request('/admin/cinemas', { method: 'PUT', body: JSON.stringify(cinema) }),
  deleteCinema: (cinemaId) => request(`/admin/cinemas/${cinemaId}`, { method: 'DELETE' }),
  upsertScreen: (screen) => request('/admin/screens', { method: 'PUT', body: JSON.stringify(screen) }),
  deleteScreen: (screenId) => request(`/admin/screens/${screenId}`, { method: 'DELETE' }),

  getAllShows: () => request('/admin/shows'),
  upsertShow: (show) => request('/admin/shows', { method: 'PUT', body: JSON.stringify(show) }),
  deleteShow: (showId) => request(`/admin/shows/${showId}`, { method: 'DELETE' }),

  getAnalytics: () => request('/admin/analytics'),
}
