import { HttpClient } from './http.js';

// Walks the real browse flow (cities -> now-showing movies -> shows -> seat
// map) to find one genuinely bookable show, instead of hardcoding seeded
// ids — db:seed's exact catalog (ids, show times) isn't guaranteed stable
// across environments. Mirrors e2e/fixtures/api-helpers.js's
// findBookableShow. Requires `npm run db:seed` to have been run against the
// target database at least once.
export async function pickBookableShow(baseUrl, { cityId = 'mumbai', minMinutesOut = 30 } = {}) {
  const client = new HttpClient(baseUrl);
  const movies = (await client.get(`/api/movies/city/${cityId}`)).bodyJson ?? [];
  const nowShowing = movies.filter((m) => m.status === 'now-showing');
  const cutoff = Date.now() + minMinutesOut * 60_000;

  for (const movie of nowShowing) {
    const shows = (await client.get(`/api/shows/movie/${movie.id}?cityId=${cityId}`)).bodyJson ?? [];
    const show = shows.find((s) => new Date(s.startTime).getTime() > cutoff);
    if (show) return show;
  }
  throw new Error(`pickBookableShow: no bookable show found in city "${cityId}" — has \`npm run db:seed\` been run against this target?`);
}

export async function firstAvailableSeatId(client, showId) {
  const seatMap = (await client.get(`/api/shows/${showId}/seatmap`)).bodyJson ?? [];
  const seat = seatMap.find((s) => s.status === 'available');
  if (!seat) throw new Error(`firstAvailableSeatId: no available seat on show ${showId}`);
  return seat.seatId;
}

// Places a minimal, real booking as the given identity (hold -> confirm) —
// used to create a resource one identity legitimately owns, so a second
// identity's access attempt against it (category 1) is testing a real
// object, not a hypothetical id. `holderId` is deliberately passed as the
// caller's own `userId` here — see tests/01-access-control.js for why the
// hold-creation endpoint accepting a client-supplied holderId at all is
// itself part of what's under test.
export async function placeTestBooking(identity, showId) {
  const seatId = await firstAvailableSeatId(identity.client, showId);
  const holdRes = await identity.client.post(`/api/shows/${showId}/hold`, {
    seatIds: [seatId],
    holderId: identity.userId,
  });
  if (holdRes.status !== 200) {
    throw new Error(`placeTestBooking: hold failed (${holdRes.status}): ${holdRes.bodyText}`);
  }
  const holdId = holdRes.bodyJson.hold.id;

  const confirmRes = await identity.client.post('/api/bookings/confirm', { holdId });
  if (confirmRes.status !== 200) {
    throw new Error(`placeTestBooking: confirm failed (${confirmRes.status}): ${confirmRes.bodyText}`);
  }
  return { booking: confirmRes.bodyJson, holdId, seatId };
}

// Holds a seat without confirming it into a booking — used by the
// access-control tests that specifically target the hold lifecycle
// (GET /api/holds/:id, POST /api/holds/:id/release) rather than a
// finalized booking.
export async function placeTestHold(identity, showId) {
  const seatId = await firstAvailableSeatId(identity.client, showId);
  const holdRes = await identity.client.post(`/api/shows/${showId}/hold`, {
    seatIds: [seatId],
    holderId: identity.userId,
  });
  if (holdRes.status !== 200) {
    throw new Error(`placeTestHold: hold failed (${holdRes.status}): ${holdRes.bodyText}`);
  }
  return { holdId: holdRes.bodyJson.hold.id, seatId, holdResponse: holdRes };
}
