#!/usr/bin/env bash
# Runs the dedicated seat-hold contention scenario as its own invocation (own
# thresholds, own report) — see scenarios/seat-hold-contention.js for why
# this is kept separate from the main load-test.js traffic mix.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SUITE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

: "${BASE_URL:=http://localhost:4000}"
export BASE_URL

REPORT_LABEL="${REPORT_LABEL:-}"

if ! command -v k6 >/dev/null 2>&1; then
  echo "k6 is not installed. Install it first: brew install k6 (macOS) or see https://k6.io/docs/get-started/installation/" >&2
  exit 1
fi

if [[ "$BASE_URL" != *localhost* && "$BASE_URL" != *127.0.0.1* && "${ALLOW_REMOTE:-}" != "1" ]]; then
  echo "BASE_URL ($BASE_URL) is not localhost. Set ALLOW_REMOTE=1 once you've confirmed" >&2
  echo "(SKILL.md section 3) this is a genuine non-prod load-test target." >&2
  exit 1
fi

TIMESTAMP="$(date +%Y%m%dT%H%M%S)"
if [[ -n "$REPORT_LABEL" ]]; then
  REPORT_DIR="reports/${TIMESTAMP}-seat-hold-contention-${REPORT_LABEL}"
else
  REPORT_DIR="reports/${TIMESTAMP}-seat-hold-contention"
fi
mkdir -p "$SUITE_DIR/$REPORT_DIR"
export REPORT_DIR

echo "== Target: $BASE_URL =="
echo "== Running seat-hold contention scenario =="
(cd "$SUITE_DIR" && k6 run scenarios/seat-hold-contention.js)

echo ""
echo "Report:  $SUITE_DIR/$REPORT_DIR/report.html"
echo ""
echo "This scenario's PASS/FAIL only tells you the requests came back in the right *shape*"
echo "(200 held, or a SEATS_UNAVAILABLE 409, never a 5xx). The actual invariant — no seat is"
echo "ever double-booked — has to be checked against the app's own data: confirm that exactly"
echo "one hold/booking exists for the contended seat afterward, not more."
