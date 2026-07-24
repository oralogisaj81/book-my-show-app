// Shared config for every scenario file. Never hardcode BASE_URL or any NFR
// number directly in a scenario — BASE_URL varies per environment, and the
// NFR numbers come from nfr-config.json (filled in from the NFR interview).
export const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';

export const NFR = JSON.parse(open('./nfr-config.json'));

// k6's default summaryTrendStats is ['avg','min','med','max','p(90)','p(95)']
// — p(99) is NOT included by default, even though a p(99) threshold is still
// evaluated correctly. Without this, nfr-compliance.md's p99 "actual" column
// reads "n/a" while p99 PASS/FAIL still shows correctly. Every options export
// below should spread this in.
export const SUMMARY_TREND_STATS = ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'];

// Builds per-flow, tagged thresholds from the NFR config rather than one
// blended global threshold — a single global http_req_duration threshold
// across mixed traffic would hide the slow, low-volume flow (seat hold +
// booking confirm) inside the fast, high-volume one (browsing).
export function thresholdsFromNfr() {
  const thresholds = {
    http_req_failed: [`rate<${NFR.errorRateThreshold}`],
    checks: ['rate>0.99'],
  };

  for (const [flow, latency] of Object.entries(NFR.latency)) {
    thresholds[`http_req_duration{name:${flow}}`] = [
      `p(95)<${latency.p95}`,
      `p(99)<${latency.p99}`,
    ];
    thresholds[`http_req_failed{name:${flow}}`] = [`rate<${NFR.errorRateThreshold}`];
  }

  return thresholds;
}
