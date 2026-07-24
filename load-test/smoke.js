import { BASE_URL } from './config.js';
import { loadCatalog } from './lib/data.js';
import { bookingJourney } from './scenarios/booking-journey.js';

// Deliberately tiny and fixed (1 VU, 5 iterations) — not driven by the NFR
// config, unlike load-test.js. Its only job is proving the scripts are
// wired up correctly (signup works, catalog lookup works, seat hold +
// booking confirm succeed) before spending minutes on a full NFR-calibrated
// run. Run this first, every time. No thresholds: a smoke run isn't trying
// to prove performance, just correctness — let it fail loudly on any
// non-2xx via the checks already inside bookingJourney/browse.
//
// Rolls are forced (not random) so every branch — browse-only, view-
// bookings, hold+confirm — gets exercised at least once regardless of RNG
// luck. Leaving this to Math.random() with only 5 iterations has a
// meaningful chance of never touching the booking branch at all, which
// would defeat the point of a smoke test.
export const options = {
  vus: 1,
  iterations: 5,
};

const FORCED_ROLLS = [0.1, 0.5, 0.75, 0.95, 0.99];

export function setup() {
  return { catalog: loadCatalog(BASE_URL) };
}

export default function (data) {
  bookingJourney(data, FORCED_ROLLS[__ITER % FORCED_ROLLS.length]);
}
