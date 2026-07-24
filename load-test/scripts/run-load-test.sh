#!/usr/bin/env bash
# Orchestrates a full NFR-calibrated load test run: k6-installed check, a
# non-localhost safety guard, a mandatory smoke test, the full load-test.js
# run, then the NFR-compliance report. See SKILL.md build order steps 8-10.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SUITE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

: "${BASE_URL:=http://localhost:4000}"
export BASE_URL

# Optional label appended to the timestamped report directory, e.g.
# REPORT_LABEL=baseline or REPORT_LABEL=post-fix, so a before/after pair of
# runs stays easy to tell apart in load-test/reports/.
REPORT_LABEL="${REPORT_LABEL:-}"

if ! command -v k6 >/dev/null 2>&1; then
  echo "k6 is not installed. Install it first: brew install k6 (macOS) or see https://k6.io/docs/get-started/installation/" >&2
  exit 1
fi

if [[ "$BASE_URL" != *localhost* && "$BASE_URL" != *127.0.0.1* && "${ALLOW_REMOTE:-}" != "1" ]]; then
  echo "BASE_URL ($BASE_URL) is not localhost. This script won't run against a non-local" >&2
  echo "target unless you've already confirmed it's a non-prod load-test target (SKILL.md" >&2
  echo "section 3) and set ALLOW_REMOTE=1 explicitly. This is a lightweight guard against" >&2
  echo "an accidental copy-paste, not a substitute for that confirmation." >&2
  exit 1
fi

echo "== Target: $BASE_URL =="

echo ""
echo "== Step 1/3: smoke test (1 VU, 5 iterations) =="
(cd "$SUITE_DIR" && k6 run smoke.js)

TIMESTAMP="$(date +%Y%m%dT%H%M%S)"
if [[ -n "$REPORT_LABEL" ]]; then
  REPORT_DIR="reports/${TIMESTAMP}-${REPORT_LABEL}"
else
  REPORT_DIR="reports/$TIMESTAMP"
fi
mkdir -p "$SUITE_DIR/$REPORT_DIR"
export REPORT_DIR

echo ""
echo "== Step 2/3: full NFR-calibrated load test =="
echo "Reports will be written to $SUITE_DIR/$REPORT_DIR/"
set +e
(cd "$SUITE_DIR" && k6 run --out "json=$REPORT_DIR/results.ndjson" load-test.js)
K6_EXIT=$?
set -e

echo ""
echo "== Step 3/3: generating NFR compliance report =="
node "$SCRIPT_DIR/generate-nfr-report.cjs" \
  "$SUITE_DIR/$REPORT_DIR/summary.json" \
  "$SUITE_DIR/nfr-config.json" \
  > "$SUITE_DIR/$REPORT_DIR/nfr-compliance.md"

echo ""
echo "Done. Read this first:  $SUITE_DIR/$REPORT_DIR/nfr-compliance.md"
echo "Full detail:            $SUITE_DIR/$REPORT_DIR/report.html"
echo "Raw time series:        $SUITE_DIR/$REPORT_DIR/results.ndjson"

exit $K6_EXIT
