// Category 3: Auth/session hardening (OWASP A07:2021).
// Cookie flags, real invalidation on logout, signup-duplicate-email
// enumeration, and a light brute-force-throttle probe against the app's own
// documented 10-req/15min-per-IP+email limiter (server/routes/auth.ts).
import fs from 'node:fs';
import { parseArgs, finding, writeFindings } from '../lib/findings.js';
import { evidenceFrom, HttpClient } from '../lib/http.js';
import { hydrateIdentity } from '../lib/auth.js';

const { baseUrl, out } = parseArgs(process.argv.slice(2));
const findings = [];

const pool = JSON.parse(fs.readFileSync(new URL('../.state/identities.json', import.meta.url), 'utf8'));
// attacker is used (not owner) so the logout-invalidation check below can
// freely burn this identity's session without affecting any other test file
// that still expects to reuse owner's/admin's live cookie later.
const attacker = hydrateIdentity(baseUrl, pool.attacker);

// -- Cookie flags ----------------------------------------------------------
const isLocalHttp = baseUrl.startsWith('http://');

// The pool file only stores parsed cookies (name=value), not the raw
// Set-Cookie header, so flags are re-checked here with a fresh signup —
// this is the one call in this file that can't be avoided by reuse, since
// it's specifically the Set-Cookie header under test.
const flagCheckSuffix = `${Date.now()}_flags`;
const flagCheckClient = new HttpClient(baseUrl);
await flagCheckClient.post('/api/auth/signup', {
  name: 'Cookie Flag Check',
  email: `cookie-flags_${flagCheckSuffix}@example.invalid`,
  password: 'SecTest123!',
});
const setCookieHeader = flagCheckClient.lastSetCookieRaw ?? '';
const hasHttpOnly = /;\s*HttpOnly/i.test(setCookieHeader);
const hasSecure = /;\s*Secure/i.test(setCookieHeader);
const sameSiteMatch = setCookieHeader.match(/;\s*SameSite=(\w+)/i);

if (!hasHttpOnly) {
  findings.push(finding({
    title: 'Session cookie missing HttpOnly',
    severity: 'High',
    owasp: 'A07:2021 – Identification and Authentication Failures',
    location: 'Set-Cookie header on POST /api/auth/signup or /login',
    description: 'The session cookie can be read by client-side JavaScript, which turns any XSS into full session theft.',
    evidence: `Set-Cookie: ${setCookieHeader}`,
    fix: 'server/routes/auth.ts\'s setSessionCookie() already sets httpOnly: true — if this fires, something has since changed that call.',
  }));
}
if (!hasSecure && !isLocalHttp) {
  findings.push(finding({
    title: 'Session cookie missing Secure over HTTPS',
    severity: 'High',
    owasp: 'A07:2021 – Identification and Authentication Failures',
    location: 'Set-Cookie header on POST /api/auth/signup or /login',
    description: 'The target is TLS-terminated but the session cookie can still be sent over a plaintext connection.',
    evidence: `Set-Cookie: ${setCookieHeader}`,
    fix: 'server/routes/auth.ts\'s setSessionCookie() sets secure: process.env.NODE_ENV === \'production\' — confirm NODE_ENV=production is actually set in this deployment.',
  }));
} else if (!hasSecure && isLocalHttp) {
  findings.push(finding({
    title: 'Session cookie Secure flag not verifiable over local HTTP',
    severity: 'Info',
    owasp: 'A07:2021 – Identification and Authentication Failures',
    location: 'Set-Cookie header on POST /api/auth/signup or /login',
    description: 'This run targeted a local http:// instance, where secure: process.env.NODE_ENV === \'production\' (server/lib/... setSessionCookie) is expected to be false. Re-check against the real deployed instance before treating this as resolved either way.',
    evidence: `Set-Cookie: ${setCookieHeader}`,
    fix: 'N/A locally — confirm NODE_ENV=production on the deployed (Render) instance so Secure is actually set there.',
  }));
}
if (!sameSiteMatch || sameSiteMatch[1].toLowerCase() !== 'lax') {
  findings.push(finding({
    title: 'Session cookie SameSite is not Lax as documented',
    severity: 'Medium',
    owasp: 'A01:2021 – Broken Access Control (CSRF-adjacent)',
    location: 'Set-Cookie header on POST /api/auth/signup or /login',
    description: 'This app has no CSRF token mechanism and no CORS config — its implicit CSRF mitigation depends on SameSite cookie behavior (see tests/05-csrf.js). Its absence or a value other than Lax/Strict invalidates that assumption.',
    evidence: `Set-Cookie: ${setCookieHeader}`,
    fix: 'server/routes/auth.ts\'s setSessionCookie() sets sameSite: \'lax\' explicitly — if this fires, something has since changed that call.',
  }));
}

// -- Logout does not (cannot) invalidate the token server-side ------------
// This app deliberately has no server-side session store — CLAUDE.md:
// "a hand-rolled HMAC-SHA256-signed httpOnly session cookie ... instead of
// ... a DB-backed session table." /api/auth/logout (server/routes/auth.ts)
// only calls reply.clearCookie(); verifySession() (server/lib/session.ts)
// has no revocation check, only an expiry check. The consequence — a
// captured token stays valid for its full remaining lifetime even after
// the user "logs out" — isn't itself discussed in CLAUDE.md, so per this
// suite's false-positive rules this gets verified live and reported with a
// real severity rather than dropped as an accepted tradeoff.
const cookiesBeforeLogout = new Map(attacker.client.cookies);
await attacker.client.post('/api/auth/logout', undefined);
const replay = new HttpClient(baseUrl);
replay.cookies = cookiesBeforeLogout;
const replayRes = await replay.get('/api/auth/me');

if (replayRes.status === 200) {
  findings.push(finding({
    title: 'Logout cannot invalidate a session token before its natural 30-day expiry',
    severity: 'Medium',
    owasp: 'A07:2021 – Identification and Authentication Failures',
    location: 'POST /api/auth/logout, server/lib/session.ts verifySession()',
    description: 'This app\'s stateless HMAC-signed session cookie (a deliberate choice per CLAUDE.md, to avoid a DB-backed session table) has no server-side revocation mechanism — verifySession() only checks the signature and expiresAt. /api/auth/logout only clears the cookie client-side; a token captured before logout (XSS, a synced/shared browser profile, a proxy log) remains fully valid for the rest of its 30-day SESSION_DURATION_MS window even after the user "logs out".',
    evidence: evidenceFrom(replayRes, { note: 'GET /api/auth/me replaying the pre-logout session cookie, after calling /api/auth/logout:' }),
    fix: 'If real logout-time revocation is wanted, add a minimal server-side check (e.g. a small denylist table of invalidated token signatures, or a per-user "session epoch"/tokenVersion column checked in verifySession() and bumped on logout) — this is the smallest change that preserves the existing stateless-cookie design for the common case while closing the post-logout replay window. Otherwise, document this as an accepted tradeoff and consider shortening SESSION_DURATION_MS.',
  }));
}

// -- Duplicate-signup enumeration (Info by design, see reference guide) ---
const dupSuffix = `${Date.now()}_dup`;
const dupEmail = `dup_${dupSuffix}@example.invalid`;
const anon = new HttpClient(baseUrl);
await anon.post('/api/auth/signup', { name: 'Dup Test', email: dupEmail, password: 'SecTest123!' });
const dupRes = await anon.post('/api/auth/signup', { name: 'Dup Test 2', email: dupEmail, password: 'SecTest123!' });

if (dupRes.status === 409 || /already exists/i.test(dupRes.bodyText)) {
  findings.push(finding({
    title: 'Signup response reveals whether an email is already registered',
    severity: 'Info',
    owasp: 'A01:2021 – Broken Access Control (account enumeration)',
    location: 'POST /api/auth/signup',
    description: 'A distinct EMAIL_TAKEN/409 on duplicate signup lets a caller enumerate registered emails. This is a common, often-deliberate UX tradeoff — note this app\'s login endpoint explicitly avoids the same signal (CLAUDE.md: "Login failures always return the same generic ... message ... no user-enumeration signal"), but that documented protection doesn\'t extend to signup. Recorded so the decision is visible, not because it\'s treated as a vulnerability on its own.',
    evidence: evidenceFrom(dupRes, { note: 'Second signup with the same email:' }),
    fix: 'No fix required unless enumeration resistance is an explicit goal for signup specifically; if it is, this would need to change to a generic response, unlike the login path which already handles this correctly.',
  }));
}

// -- Light brute-force probe against the documented 10/15min limiter ------
// 11 attempts — enough to cross the real limiter's threshold (10) without
// being a flood, and against `owner`'s email (not a fresh account) so this
// doubles as a live check that the documented limiter actually engages.
const bruteEmail = pool.owner.email;
const bruteClient = new HttpClient(baseUrl);
const attempts = [];
for (let i = 0; i < 11; i++) {
  attempts.push(await bruteClient.post('/api/auth/login', { email: bruteEmail, password: `wrong-password-${i}` }));
}
const throttledAt = attempts.findIndex((a) => a.status === 429);

if (throttledAt === -1) {
  findings.push(finding({
    title: 'No rate limiting observed on login after 11 rapid failed attempts against one account',
    severity: 'Medium',
    owasp: 'A07:2021 – Identification and Authentication Failures',
    location: 'POST /api/auth/login',
    description: `11 rapid wrong-password attempts against one account (server/routes/auth.ts documents a 10-req/15min-per-IP+email limiter on this route) all returned ${attempts[0]?.status} with no 429 observed — the documented limiter did not engage as expected.`,
    evidence: attempts.map((a, i) => evidenceFrom(a, { note: `Attempt ${i + 1}:` })).join('\n\n'),
    fix: 'Confirm AUTH_RATE_LIMIT\'s keyGenerator in server/routes/auth.ts is actually being invoked for /api/auth/login (not just /signup) and that @fastify/rate-limit is registered before the route — this documented behavior should have triggered a 429 by the 11th attempt.',
  }));
} else {
  findings.push(finding({
    title: `Verified: login rate limiting engages after ${throttledAt + 1} rapid failed attempts`,
    severity: 'Info',
    owasp: 'A07:2021 – Identification and Authentication Failures',
    location: 'POST /api/auth/login',
    description: `A 429 appeared at attempt ${throttledAt + 1} of 11, consistent with server/routes/auth.ts's documented max: 10 / 15 minutes, keyed by IP+email.`,
    evidence: evidenceFrom(attempts[throttledAt], { note: `Attempt ${throttledAt + 1} (first 429):` }),
    fix: 'N/A — documented behavior verified live.',
  }));
}

writeFindings(findings, out);
console.log(`03-auth-session: ${findings.length} finding(s)`);
