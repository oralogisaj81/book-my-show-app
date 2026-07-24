import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';

// REPORT_DIR is set by run-load-test.sh / run-stock-contention.sh to a
// timestamped directory so runs never overwrite each other's reports. Falls
// back to reports/latest for an ad hoc manual `k6 run` outside those
// wrapper scripts.
const REPORT_DIR = __ENV.REPORT_DIR || 'reports/latest';

// Shared by every scenario file's handleSummary export — see
// reference/report-generation.md for why summary.json/report.html/stdout
// are produced here, while nfr-compliance.md is generated as a separate
// step afterward (it needs the human-readable NFR config, which isn't part
// of k6's own summary data).
export function buildSummary(data) {
  return {
    [`${REPORT_DIR}/summary.json`]: JSON.stringify(data, null, 2),
    [`${REPORT_DIR}/report.html`]: htmlReport(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
