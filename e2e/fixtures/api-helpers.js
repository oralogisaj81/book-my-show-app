// Direct backend HTTP calls (no UI) for test *setup* — registering users,
// finding a bookable show, holding/releasing seats — so specs don't spend
// time driving the UI for anything that isn't the actual behavior under
// test. Every call throws on a non-2xx response so a broken setup step
// fails loudly at the point of failure instead of surfacing later as a
// confusing assertion mismatch.

export const BACKEND_URL = 'http://localhost:4000'

async function unwrap(res, label) {
  if (!res.ok()) throw new Error(`${label} failed: ${res.status()} ${await res.text()}`)
  if (res.status() === 204) return undefined
  return res.json()
}

export function uniqueEmail(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@e2e.cinehall.internal`
}

export async function registerUser(request, { name, email, password }) {
  return unwrap(
    await request.post('/api/auth/signup', { data: { name, email, password } }),
    `registerUser(${email})`,
  )
}

export async function loginAs(request, { email, password }) {
  return unwrap(await request.post('/api/auth/login', { data: { email, password } }), `loginAs(${email})`)
}

export async function getCities(request) {
  return unwrap(await request.get('/api/cities'), 'getCities')
}

export async function getMoviesForCity(request, cityId) {
  return unwrap(await request.get(`/api/movies/city/${cityId}`), `getMoviesForCity(${cityId})`)
}

export async function getShowsForMovie(request, movieId, cityId) {
  return unwrap(
    await request.get(`/api/shows/movie/${movieId}?cityId=${cityId}`),
    `getShowsForMovie(${movieId}, ${cityId})`,
  )
}

export async function getScreen(request, screenId) {
  return unwrap(await request.get(`/api/screens/${screenId}`), `getScreen(${screenId})`)
}

export async function getSeatMap(request, showId) {
  return unwrap(await request.get(`/api/shows/${showId}/seatmap`), `getSeatMap(${showId})`)
}

export async function holdSeats(request, showId, seatIds, holderId) {
  return unwrap(
    await request.post(`/api/shows/${showId}/hold`, { data: { seatIds, holderId } }),
    `holdSeats(${showId})`,
  )
}

export async function releaseHold(request, holdId) {
  return unwrap(await request.post(`/api/holds/${holdId}/release`), `releaseHold(${holdId})`)
}

export async function confirmBooking(request, holdId) {
  return unwrap(await request.post('/api/bookings/confirm', { data: { holdId } }), `confirmBooking(${holdId})`)
}

// Not `unwrap` — callers that expect this to fail (validation/concurrency tests)
// need the raw response (status + body), not a thrown error on non-2xx.
export async function holdSeatsRaw(request, showId, seatIds, holderId) {
  const res = await request.post(`/api/shows/${showId}/hold`, { data: { seatIds, holderId } })
  return { status: res.status(), body: await res.json().catch(() => null) }
}

// Finds a "now showing" movie in the given city with at least one future show
// comfortably ahead (default 30 min out — the app has no lifecycle job, but
// this margin keeps the show from starting mid-test on a slow CI run) and
// returns the movie, show, and its screen layout ready for seat selection.
export async function findBookableShow(request, { cityId = 'mumbai', minMinutesOut = 30 } = {}) {
  const movies = (await getMoviesForCity(request, cityId)).filter((m) => m.status === 'now-showing')
  const cutoff = Date.now() + minMinutesOut * 60_000

  for (const movie of movies) {
    const shows = await getShowsForMovie(request, movie.id, cityId)
    const show = shows.find((s) => new Date(s.startTime).getTime() > cutoff)
    if (show) {
      const screen = await getScreen(request, show.screenId)
      return { movie, show, screen }
    }
  }
  throw new Error(`findBookableShow: no bookable show found in city "${cityId}"`)
}

export function firstAvailableSeatId(seatMap) {
  const seat = seatMap.find((s) => s.status === 'available')
  if (!seat) throw new Error('firstAvailableSeatId: no available seat in seat map')
  return seat.seatId
}

export function firstAvailableSeatIds(seatMap, count) {
  const seats = seatMap.filter((s) => s.status === 'available').slice(0, count)
  if (seats.length < count) throw new Error(`firstAvailableSeatIds: only ${seats.length} available, needed ${count}`)
  return seats.map((s) => s.seatId)
}

// Mirrors shared/lib/seatGrid's computeTierBreakdown + sumTierBreakdown + the
// 5% convenience fee applied in both server/services/booking.ts and
// src/pages/CheckoutPage.tsx — using the seat map's own tierId per seat
// rather than re-deriving row/col -> tier from the layout, so this can't
// drift from the server's actual pricing decision for these exact seats.
const CONVENIENCE_FEE_RATE = 0.05

export function computeExpectedTotal(seatMap, screen, show, seatIds) {
  const byId = new Map(seatMap.map((s) => [s.seatId, s]))
  const subtotal = seatIds.reduce((sum, seatId) => {
    const tierId = byId.get(seatId)?.tierId
    const price = show.priceOverrides[tierId] ?? screen.layout.tiers.find((t) => t.id === tierId)?.price ?? 0
    return sum + price
  }, 0)
  const convenienceFee = Math.round(subtotal * CONVENIENCE_FEE_RATE)
  return { subtotal, convenienceFee, total: subtotal + convenienceFee }
}
