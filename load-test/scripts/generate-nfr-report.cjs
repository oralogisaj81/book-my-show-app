#!/usr/bin/env node
// Turns a k6 summary.json (the same object handed to handleSummary) plus the
// project's nfr-config.json into nfr-compliance.md — a report organized by
// "did we meet the requirement" rather than by raw metric name. See
// reference/report-generation.md for why this exists as a separate step
// instead of being folded into handle-summary.js.
//
// Deliberately a .cjs file, not .js: the target app's package.json may or
// may not set "type": "module" (this app's does), which changes whether a
// plain .js file is loaded as CommonJS or ESM — verified the hard way when
// this crashed with "require is not defined in ES module scope" on first
// real run against ecommerce-app-using-skill. .cjs is always CommonJS
// regardless of the surrounding package.json, so this script (and the
// `require` below) works unmodified against any target app.
//
// Usage: node generate-nfr-report.cjs <summary.json> <nfr-config.json> > nfr-compliance.md

const fs = require('fs');

const [, , summaryPath, nfrPath] = process.argv;
if (!summaryPath || !nfrPath) {
  console.error('Usage: node generate-nfr-report.cjs <summary.json> <nfr-config.json>');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
const nfr = JSON.parse(fs.readFileSync(nfrPath, 'utf8'));
const metrics = data.metrics || {};

function metric(key) {
  return metrics[key];
}

function fmtMs(v) {
  return v === undefined || v === null ? 'n/a' : `${Math.round(v)}ms`;
}

function fmtPct(v) {
  return v === undefined || v === null ? 'n/a' : `${(v * 100).toFixed(2)}%`;
}

function thresholdOk(m, expr) {
  if (!m || !m.thresholds || !m.thresholds[expr]) return undefined;
  return m.thresholds[expr].ok;
}

function passFail(ok) {
  if (ok === undefined) return '⚠️ NOT EVALUATED';
  return ok ? '✅ PASS' : '❌ FAIL';
}

const lines = [];
const now = new Date().toISOString();

lines.push(`# NFR compliance report`);
lines.push('');
lines.push(`Generated: ${now}`);
lines.push(`App: ${nfr.app || '(unnamed)'}`);
lines.push('');
lines.push('Read this file first. `report.html` has full charts/detail; `results.ndjson`');
lines.push('has the raw time series if you need to see *when* during the run something');
lines.push('started failing (see reference/report-generation.md in the skill for the');
lines.push('troubleshooting flow).');
lines.push('');

// --- Throughput ---
lines.push('## Throughput');
lines.push('');
const httpReqs = metric('http_reqs');
const achievedRate = httpReqs ? httpReqs.values.rate : undefined;
lines.push(`- Current-state target: **${nfr.throughput.currentTps} req/s**`);
lines.push(`- Projected-future target: **${nfr.throughput.projectedTps} req/s**`);
lines.push(
  `- Achieved (average across the *entire* run, including ramps — not stage-isolated): ` +
  `**${achievedRate ? achievedRate.toFixed(1) : 'n/a'} req/s**`
);
lines.push(
  '- For a stage-specific rate (current-hold vs. projected-hold), filter `results.ndjson` ' +
  'by timestamp against the stage windows in `nfr-config.json`\'s `throughput` durations — ' +
  'the summary object k6 hands to `handleSummary` does not carry a per-stage breakdown.'
);
lines.push('');

// --- Concurrency ---
lines.push('## Concurrent users');
lines.push('');
const vusMax = metric('vus_max');
lines.push(`- Peak concurrent users target: **${nfr.concurrency.peakConcurrentUsers}**`);
lines.push(`- Peak VUs actually reached: **${vusMax ? vusMax.values.value : 'n/a'}**`);
lines.push(
  '- A shortfall here (reached VUs < target) usually means `maxVUs`/`preAllocatedVUs` in ' +
  'load-test.js was undersized for the achieved iteration duration, or `dropped_iterations` ' +
  'occurred — check the console output from the run for a `dropped_iterations` count.'
);
lines.push('');

// --- Per-flow latency + error rate ---
lines.push('## Per-flow latency and error rate');
lines.push('');
lines.push('| Flow | p95 target | p95 actual | p95 | p99 target | p99 actual | p99 | Error rate |');
lines.push('|---|---|---|---|---|---|---|---|');

for (const [flow, latency] of Object.entries(nfr.latency || {})) {
  const durKey = `http_req_duration{name:${flow}}`;
  const failKey = `http_req_failed{name:${flow}}`;
  const durMetric = metric(durKey);
  const failMetric = metric(failKey);

  const p95Actual = durMetric ? durMetric.values['p(95)'] : undefined;
  const p99Actual = durMetric ? durMetric.values['p(99)'] : undefined;
  const p95Ok = thresholdOk(durMetric, `p(95)<${latency.p95}`);
  const p99Ok = thresholdOk(durMetric, `p(99)<${latency.p99}`);
  const errRate = failMetric ? failMetric.values.rate : undefined;

  lines.push(
    `| ${flow} | ${latency.p95}ms | ${fmtMs(p95Actual)} | ${passFail(p95Ok)} | ` +
    `${latency.p99}ms | ${fmtMs(p99Actual)} | ${passFail(p99Ok)} | ${fmtPct(errRate)} |`
  );
}
lines.push('');

// --- Overall error rate + checks ---
lines.push('## Overall error rate and checks');
lines.push('');
const overallFail = metric('http_req_failed');
const checks = metric('checks');
lines.push(`- Acceptable error rate: **${(nfr.errorRateThreshold * 100).toFixed(2)}%**`);
lines.push(
  `- Overall \`http_req_failed\` rate: **${fmtPct(overallFail ? overallFail.values.rate : undefined)}** ` +
  `— ${passFail(thresholdOk(overallFail, `rate<${nfr.errorRateThreshold}`))}`
);
lines.push(
  `- Overall check pass rate: **${fmtPct(checks ? checks.values.rate : undefined)}** ` +
  `— ${passFail(thresholdOk(checks, 'rate>0.99'))}`
);
lines.push('');
lines.push(
  '_Note: `http_req_failed` only catches HTTP-level failures (5xx, timeouts, connection ' +
  'resets). A business-logic rejection returned as a 2xx/4xx with a JSON error body — e.g. ' +
  'this app\'s `409 SEATS_UNAVAILABLE` — is deliberately not counted as a failure here if the ' +
  'scenario\'s own `check()` treats it as an expected outcome. See ' +
  'reference/k6-scripting-conventions.md._'
);
lines.push('');

// --- Troubleshooting hints ---
const anyFail = Object.values(metrics).some(
  (m) => m && m.thresholds && Object.values(m.thresholds).some((t) => t.ok === false)
);

lines.push('## If something failed');
lines.push('');
if (!anyFail) {
  lines.push('All evaluated thresholds passed. No action needed.');
} else {
  lines.push('At least one threshold above failed. Narrow down the cause:');
  lines.push('');
  lines.push('- **Failed only at/after the projected-load stage, not the current one**: likely a real ' +
    'capacity finding — this is the useful signal the test exists to surface. Check `results.ndjson` ' +
    'for when latency started degrading relative to the stage transition.');
  lines.push('- **Failed from the very start, uniformly**: more likely a scripting/environment issue ' +
    '(wrong BASE_URL, broken auth flow, API shape mismatch) than a capacity problem — re-run `smoke.js` ' +
    'to isolate this before trusting the full-run numbers.');
  lines.push('- **Failed only during the long soak hold, not the ramp**: resource exhaustion over time ' +
    '(connection leak, unbounded cache, memory growth) rather than a raw throughput ceiling.');
  lines.push('- **Local-run caveat**: if this ran against a local dev machine rather than production-sized ' +
    'infra, check obvious local-only limiters first (DB connection pool size, JVM heap) before reporting ' +
    'the numbers as a verified production capacity finding — see reference/k6-scripting-conventions.md.');
}
lines.push('');

if (nfr.assumptions && nfr.assumptions.length) {
  lines.push('## Assumptions baked into this run\'s NFR config');
  lines.push('');
  for (const a of nfr.assumptions) lines.push(`- ${a}`);
  lines.push('');
}

process.stdout.write(lines.join('\n'));
