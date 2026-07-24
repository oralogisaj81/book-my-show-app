// Category 5: CSRF posture (OWASP A01:2021). This app has no CSRF token
// mechanism at all — CLAUDE.md documents the session cookie as
// sameSite: 'lax' (server/routes/auth.ts) and there is no @fastify/cors (or
// any CORS) registration anywhere in server/app.ts. The implicit mitigation
// is same-origin-only deployment + SameSite, never stated outright as a
// deliberate CSRF decision the way the reference app's SecurityConfig.java
// comment is — so this file's job is to verify that assumption holds, not
// to flag the absence of tokens on its own.
import fs from 'node:fs';
import { parseArgs, finding, writeFindings } from '../lib/findings.js';
import { evidenceFrom } from '../lib/http.js';
import { hydrateIdentity } from '../lib/auth.js';

const { baseUrl, out } = parseArgs(process.argv.slice(2));
const findings = [];

const pool = JSON.parse(fs.readFileSync(new URL('../.state/identities.json', import.meta.url), 'utf8'));
const owner = hydrateIdentity(baseUrl, pool.owner);
const evilOrigin = 'https://evil.example';

const corsProbe = await owner.client.get('/api/bookings/me', { headers: { Origin: evilOrigin } });
const acao = corsProbe.headers['access-control-allow-origin'];
const acac = corsProbe.headers['access-control-allow-credentials'];

if (acao && (acao === evilOrigin || acao === '*') && acac === 'true') {
  findings.push(finding({
    title: 'CORS policy allows a third-party origin to make credentialed requests',
    severity: 'Critical',
    owasp: 'A01:2021 – Broken Access Control (CSRF/CORS bypass)',
    location: 'Access-Control-Allow-Origin / Access-Control-Allow-Credentials headers',
    description: `The server reflects or wildcards Access-Control-Allow-Origin (${acao}) while also setting Access-Control-Allow-Credentials: true, letting any origin read authenticated responses using the victim's session cookie — a complete bypass of the same-origin assumption this app's lack of CSRF tokens depends on.`,
    evidence: evidenceFrom(corsProbe, { note: `GET /api/bookings/me with Origin: ${evilOrigin}` }),
    fix: 'Remove the CORS configuration entirely if this app truly has no second origin (a single-artifact same-origin deployment, per CLAUDE.md, doesn\'t need CORS headers at all), or restrict Access-Control-Allow-Origin to an explicit allowlist and never combine a reflected/wildcard origin with Allow-Credentials: true.',
  }));
} else if (acao) {
  findings.push(finding({
    title: 'Unexpected CORS headers present on a same-origin-only API',
    severity: 'Info',
    owasp: 'A01:2021 – Broken Access Control',
    location: 'Access-Control-Allow-Origin header',
    description: `A CORS header (Access-Control-Allow-Origin: ${acao}) was present even though this app's single-artifact deployment (CLAUDE.md) assumes same-origin-only. Not immediately exploitable (no Allow-Credentials: true observed), but worth confirming it's intentional.`,
    evidence: evidenceFrom(corsProbe, { note: `GET /api/bookings/me with Origin: ${evilOrigin}` }),
    fix: 'Confirm whether a CORS config is actually needed; if not, remove it so the same-origin assumption is unambiguous rather than merely still-safe-today.',
  }));
} else {
  findings.push(finding({
    title: 'CSRF-via-same-origin assumption verified: no CORS opening found',
    severity: 'Info',
    owasp: 'A01:2021 – Broken Access Control',
    location: 'server/app.ts (no CORS plugin registered)',
    description: 'No Access-Control-Allow-Origin header was returned for a cross-origin request, consistent with this app\'s single-artifact, same-origin-only deployment (CLAUDE.md). Recorded so this assumption is known-checked as of this run, not silently assumed. This app has no CSRF tokens at all, so this check — plus SameSite=lax (verified in tests/03-auth-session.js) — is the entire CSRF defense; re-run after any change that introduces a second origin or a CORS config.',
    evidence: evidenceFrom(corsProbe, { note: `GET /api/bookings/me with Origin: ${evilOrigin}` }),
    fix: 'N/A — re-run this check any time a second frontend origin, a public API consumer, or a CORS config is introduced.',
  }));
}

// SameSite is checked in 03-auth-session.js (it's a cookie-attribute check,
// grouped there with the rest of the cookie flags) — this file only owns
// the CORS/origin half of the CSRF story.

writeFindings(findings, out);
console.log(`05-csrf: ${findings.length} finding(s)`);
