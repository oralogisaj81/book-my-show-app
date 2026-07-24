#!/usr/bin/env bash
# Orchestrates a full security test run: localhost-only safety guard, a
# reachability check, a shared-identity setup step (see lib/setup.js — keeps
# the whole suite under /api/auth/signup's 10-req/15min rate limit), every
# tests/*.js category in turn, then the report generator.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SUITE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

: "${BASE_URL:=http://localhost:4000}"
export BASE_URL

if [[ "$BASE_URL" != *localhost* && "$BASE_URL" != *127.0.0.1* && "${ALLOW_REMOTE:-}" != "1" ]]; then
  echo "BASE_URL ($BASE_URL) is not localhost. This script won't run against a non-local" >&2
  echo "target unless you've already confirmed with the user it's a non-production instance" >&2
  echo "and set ALLOW_REMOTE=1 explicitly. This is a lightweight guard against an accidental" >&2
  echo "copy-paste, not a substitute for that confirmation." >&2
  exit 1
fi

if ! curl -sf -o /dev/null --max-time 5 "$BASE_URL/api/cities" 2>/dev/null; then
  echo "Could not reach $BASE_URL/api/cities. Start the target backend first — e.g." >&2
  echo "  npm run build && DATABASE_URL=... SESSION_SECRET=... NODE_ENV=production PORT=4000 npm start" >&2
  echo "against a disposable database (this repo's .env.test branch, not the dev .env) that" >&2
  echo "has been seeded via 'npm run db:seed'." >&2
  exit 1
fi

echo "== Target: $BASE_URL =="

TIMESTAMP="$(date +%Y%m%dT%H%M%S)"
REPORT_DIR="reports/$TIMESTAMP"
RAW_DIR="$REPORT_DIR/raw"
mkdir -p "$SUITE_DIR/$RAW_DIR" "$SUITE_DIR/.state"

IDENTITIES_FILE="$SUITE_DIR/.state/identities.json"
echo ""
echo "== Setup: creating shared identity pool =="
if ! (cd "$SUITE_DIR/.." && node "$SUITE_DIR/lib/setup.js" --base-url "$BASE_URL" --out "$IDENTITIES_FILE"); then
  echo "Setup failed — cannot proceed without a shared identity pool (see lib/setup.js)." >&2
  exit 1
fi

FAILED=0
for TEST_FILE in "$SUITE_DIR"/tests/*.js; do
  NAME="$(basename "$TEST_FILE" .js)"
  echo ""
  echo "== Running $NAME =="
  if ! (cd "$SUITE_DIR/.." && node "$TEST_FILE" --base-url "$BASE_URL" --out "$SUITE_DIR/$RAW_DIR/$NAME.json"); then
    echo "  $NAME exited non-zero — see output above. Its findings file (if it managed to write one) is still included in the report." >&2
    FAILED=1
  fi
done

echo ""
echo "== Generating report =="
node "$SUITE_DIR/report/generate-report.js" "$SUITE_DIR/$RAW_DIR" "$SUITE_DIR/$REPORT_DIR/report.md"

echo ""
echo "Done. Report (Markdown): $SUITE_DIR/$REPORT_DIR/report.md"
echo "Report (HTML):           $SUITE_DIR/$REPORT_DIR/report.html"
exit $FAILED
