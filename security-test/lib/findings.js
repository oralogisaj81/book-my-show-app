// Every test file collects Finding objects into an array and writes them to
// --out as JSON at the end. The report generator (report/generate-report.js)
// merges every category's file into the final report.md. No finding may
// skip `evidence` — a hunch without a reproduction is a note, not a finding.
import fs from 'node:fs';
import path from 'node:path';

const VALID_SEVERITIES = ['Critical', 'High', 'Medium', 'Low', 'Info'];

export function finding({ title, severity, owasp, location, description, evidence, fix, status = 'Open' }) {
  if (!evidence) {
    throw new Error(`finding "${title}" is missing evidence — a hunch without a reproduction isn't a finding`);
  }
  if (!VALID_SEVERITIES.includes(severity)) {
    throw new Error(`finding "${title}" has invalid severity "${severity}" — must be one of ${VALID_SEVERITIES.join(', ')}`);
  }
  return { title, severity, owasp, location, description, evidence, fix, status };
}

// Shows enough of a secret to locate it (first few / last couple chars)
// without printing the value that would make the report itself a leak.
export function redactSecret(value, { keepPrefix = 4, keepSuffix = 2 } = {}) {
  if (!value || value.length <= keepPrefix + keepSuffix) return '[redacted]';
  return `${value.slice(0, keepPrefix)}…[redacted]…${value.slice(-keepSuffix)}`;
}

export function writeFindings(findings, outPath) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(findings, null, 2));
}

export function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--out') out.out = argv[++i];
    if (argv[i] === '--base-url') out.baseUrl = argv[++i];
  }
  out.baseUrl = out.baseUrl || process.env.BASE_URL || 'http://localhost:4000';
  if (!out.out) throw new Error('missing --out <path>');
  return out;
}
