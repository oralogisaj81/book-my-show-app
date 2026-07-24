// Category 8: Error handling / information disclosure (OWASP A05:2021 / A09:2021).
// Trigger a handful of 4xx/5xx paths and check that responses don't leak
// stack traces or internal error detail. server/app.ts's setErrorHandler
// has two branches: ApiError instances get a clean {code, message} body;
// anything else falls through to `const message = ... err.message` at
// full 500 — that fallback branch is exactly what this file is built to
// reach, since it echoes whatever the underlying JS runtime error says
// verbatim instead of a generic message.
import { parseArgs, finding, writeFindings } from '../lib/findings.js';
import { evidenceFrom, HttpClient } from '../lib/http.js';

const { baseUrl, out } = parseArgs(process.argv.slice(2));
const findings = [];
const client = new HttpClient(baseUrl);

function leaksInternals(text) {
  return /TypeError:|ReferenceError:|SyntaxError:|Cannot read propert|at Object\.|at async |node_modules\/|PostgresError|drizzle-orm/i.test(text ?? '');
}

const probes = [
  {
    name: 'Malformed JSON body',
    run: () => client.request('POST', '/api/auth/signup', { rawBody: '{"email": }', headers: { 'Content-Type': 'application/json' } }),
  },
  {
    name: 'Wrong Content-Type on a JSON endpoint',
    run: () => client.request('POST', '/api/auth/login', { rawBody: 'email=a@b.com&password=x', headers: { 'Content-Type': 'text/plain' } }),
  },
  {
    name: 'JSON null as the entire body (valid JSON, degenerate shape)',
    run: () => client.request('POST', '/api/auth/signup', { rawBody: 'null', headers: { 'Content-Type': 'application/json' } }),
  },
  {
    name: 'Missing required fields',
    run: () => client.post('/api/auth/signup', { email: 'missing-fields@example.invalid' }),
  },
  {
    name: 'Non-existent resource id (well-formed but unknown)',
    run: () => client.get('/api/movies/00000000-0000-0000-0000-000000000000'),
  },
];

for (const probe of probes) {
  const res = await probe.run();
  if (leaksInternals(res.bodyText)) {
    findings.push(finding({
      title: `${probe.name} leaks internal error detail`,
      severity: res.status >= 500 ? 'Medium' : 'Low',
      owasp: 'A05:2021 – Security Misconfiguration',
      location: probe.name,
      description: 'The response body for this path contains what looks like a raw JS runtime error message (TypeError/ReferenceError/etc.) rather than a clean, generic error body. server/app.ts\'s setErrorHandler only maps ApiError instances to a clean {code, message} — anything else (e.g. a TypeError from destructuring a non-object request.body) falls through to a branch that echoes err.message verbatim at a flat 500.',
      evidence: evidenceFrom(res, { note: probe.name }),
      fix: 'In server/app.ts\'s setErrorHandler, don\'t send err.message for non-ApiError exceptions — always send a fixed generic message (e.g. "Something went wrong.") for that branch, matching what it already does when err.message isn\'t a string. Optionally also harden the specific route (server/routes/auth.ts) to validate request.body is a non-null object before destructuring off it.',
    }));
  } else if (res.status >= 500) {
    findings.push(finding({
      title: `${probe.name} produces a 500 instead of a handled 4xx`,
      severity: 'Low',
      owasp: 'A05:2021 – Security Misconfiguration',
      location: probe.name,
      description: 'The response body itself is clean (no leaked internals), but a 500 for user-triggerable malformed/degenerate input suggests the exception isn\'t explicitly handled — worth a dedicated 4xx mapping for clarity even though nothing is currently leaking.',
      evidence: evidenceFrom(res, { note: probe.name }),
      fix: 'Add input validation (e.g. reject a non-object request.body) ahead of the route handler so this maps to a clean ApiError(\'VALIDATION_ERROR\', ...) / 400 instead of falling through to the generic 500 branch.',
    }));
  }
}

writeFindings(findings, out);
console.log(`08-error-handling: ${findings.length} finding(s)`);
