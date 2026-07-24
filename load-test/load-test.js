import { BASE_URL, NFR, thresholdsFromNfr, SUMMARY_TREND_STATS } from './config.js';
import { loadCatalog } from './lib/data.js';
import { bookingJourney } from './scenarios/booking-journey.js';
import { buildSummary } from './report/handle-summary.js';

// Two scenarios run concurrently on purpose, not by oversight: traffic_mix
// drives toward the stated TPS (current, then projected) using an
// arrival-rate executor so throughput is the controlled variable and
// latency/errors are the observed signal. concurrent_sessions separately
// drives toward the peak-concurrent-users NFR with a long hold at peak,
// which is where connection-pool exhaustion and slow memory growth actually
// show up. Running both at once models realistic combined production load —
// every threshold below is keyed by request tag, not by which scenario
// generated the request, so this isn't double-counting.
export const options = {
  scenarios: {
    traffic_mix: {
      executor: 'ramping-arrival-rate',
      startRate: 0,
      timeUnit: '1s',
      preAllocatedVUs: NFR.throughput.preAllocatedVUs,
      maxVUs: NFR.throughput.maxVUs,
      exec: 'runBookingJourney',
      stages: [
        { target: NFR.throughput.currentTps, duration: NFR.throughput.rampToCurrentDuration },
        { target: NFR.throughput.currentTps, duration: NFR.throughput.holdCurrentDuration },
        { target: NFR.throughput.projectedTps, duration: NFR.throughput.rampToProjectedDuration },
        { target: NFR.throughput.projectedTps, duration: NFR.throughput.holdProjectedDuration },
        { target: 0, duration: NFR.throughput.rampDownDuration },
      ],
    },
    concurrent_sessions: {
      executor: 'ramping-vus',
      startVUs: 0,
      exec: 'runBookingJourney',
      stages: [
        { target: NFR.concurrency.peakConcurrentUsers, duration: NFR.concurrency.rampDuration },
        { target: NFR.concurrency.peakConcurrentUsers, duration: NFR.concurrency.soakDuration },
        { target: 0, duration: NFR.concurrency.rampDownDuration },
      ],
    },
  },
  thresholds: thresholdsFromNfr(),
  summaryTrendStats: SUMMARY_TREND_STATS,
};

export function setup() {
  const catalog = loadCatalog(BASE_URL);
  return { catalog };
}

export function runBookingJourney(data) {
  bookingJourney(data);
}

export function handleSummary(data) {
  return buildSummary(data);
}
