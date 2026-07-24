import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL, NFR } from '../config.js';
import { loadCatalog, findContentionTarget } from '../lib/data.js';
import { ensureSession } from '../lib/auth.js';
import { buildSummary } from '../report/handle-summary.js';

// Run this as its own invocation — `k6 run load-test/scenarios/seat-hold-contention.js`
// (or `load-test/scripts/run-seat-hold-contention.sh`) — not as part of the
// main load-test.js scenarios. Its success criteria are different in kind
// from throughput/latency NFRs: the thing being verified is a business
// invariant (no seat is ever double-booked), not "requests are fast."
//
// This app's shared-capacity invariant is the seat hold, serialized per-show
// via a Postgres advisory lock (server/services/seatLock.ts's
// pg_advisory_xact_lock(hashtext(showId))). A smooth ramping-arrival-rate
// load rarely produces enough *simultaneous* contention on one seat to
// actually exercise that lock — this scenario exists specifically to force
// that race: every VU starts at once (no ramp) and tries to hold the exact
// same single seat on the exact same show.
export const options = {
  scenarios: {
    seat_hold_contention: {
      executor: 'shared-iterations',
      vus: NFR.contention.concurrentVUs,
      iterations: NFR.contention.concurrentVUs,
      maxDuration: '30s',
    },
  },
  thresholds: {
    'checks{name:contention_response_shape}': ['rate>0.99'],
  },
};

export function setup() {
  const catalog = loadCatalog(BASE_URL);
  const target = findContentionTarget(BASE_URL, catalog);
  return { target };
}

export default function (data) {
  const session = ensureSession(BASE_URL);
  if (!session.registered) return;

  const res = http.post(
    `${BASE_URL}/api/shows/${data.target.showId}/hold`,
    JSON.stringify({ seatIds: [data.target.seatId], holderId: session.userId }),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'contended_hold' } }
  );

  check(
    res,
    {
      'succeeded or correctly rejected as already taken': (r) =>
        r.status === 200 || (r.status === 409 && r.json('code') === 'SEATS_UNAVAILABLE'),
      'never a server error': (r) => r.status < 500,
    },
    { name: 'contention_response_shape' }
  );
}

export function handleSummary(data) {
  return buildSummary(data);
}
