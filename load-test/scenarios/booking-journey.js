import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL } from '../config.js';
import { ensureSession } from '../lib/auth.js';
import { pickRandom } from '../lib/data.js';
import { browse } from './browse.js';

// Weighted mix approximating a real moviegoer's traffic shape: mostly
// anonymous browsing, a smaller slice that signs in to check booking
// history, and the smallest slice that actually holds seats and books.
// These weights (70/20/10) are a reasonable default, not a measured fact —
// replace with real analytics once this app has traffic.
//
// `forceRoll` lets a caller pin the branch taken instead of leaving it to
// Math.random() — smoke.js uses this to deterministically exercise all
// three branches every run, since relying on randomness with only a
// handful of iterations risks never touching the booking branch at all.
// Full load-test.js runs leave this undefined so the traffic shape stays
// randomly weighted as intended.
export function bookingJourney(data, forceRoll) {
  const roll = forceRoll !== undefined ? forceRoll : Math.random();
  const browsed = browse(data.catalog);

  if (roll < 0.7) {
    return; // pure browsing session, most common case
  }

  const session = ensureSession(BASE_URL);
  if (!session.registered) return; // don't compound a signup failure into a booking failure

  if (roll < 0.9) {
    const res = http.get(`${BASE_URL}/api/bookings/me`, { tags: { name: 'view_bookings' } });
    check(res, { 'view bookings 200': (r) => r.status === 200 });
    return;
  }

  // remaining ~10%: hold a seat and confirm the booking
  if (!browsed.shows.length) return; // nothing playing for this city/movie combo right now — not a failure

  const show = pickRandom(browsed.shows);
  const seatmapRes = http.get(`${BASE_URL}/api/shows/${show.id}/seatmap`, { tags: { name: 'get_seatmap' } });
  const seatmapOk = check(seatmapRes, { 'seatmap 200': (r) => r.status === 200 });
  if (!seatmapOk) return;

  const openSeats = seatmapRes.json().filter((s) => s.status === 'available');
  if (!openSeats.length) return; // this show is sold out — correct outcome, not a failure

  const seat = pickRandom(openSeats);
  const holdRes = http.post(
    `${BASE_URL}/api/shows/${show.id}/hold`,
    JSON.stringify({ seatIds: [seat.seatId], holderId: session.userId }),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'hold_seats' } }
  );
  // A 409 here is a real, if rare, possibility under heavy mixed load hitting
  // the same show/seat another VU just grabbed — not just the dedicated
  // contention scenario's concern. Both outcomes are "correct."
  const holdOk = check(holdRes, {
    'hold succeeded or correctly rejected as taken': (r) => r.status === 200 || r.status === 409,
  });
  if (!holdOk || holdRes.status !== 200) return;

  sleep(0.5); // brief pause modeling the checkout review screen

  const holdId = holdRes.json('hold').id;
  const confirmRes = http.post(
    `${BASE_URL}/api/bookings/confirm`,
    JSON.stringify({ holdId }),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'confirm_booking' } }
  );
  check(confirmRes, { 'booking confirmed': (r) => r.status === 200 });

  sleep(1);
}
