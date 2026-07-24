// Category 4: Injection — SQLi- and XSS-shaped payloads (OWASP A03:2021).
// This app's only free-text input reachable via the API is the signup
// `name` field (email is regex-validated, password isn't rendered anywhere,
// and there's no search/query-param endpoint — server/routes/movies.ts,
// cities.ts, cinemas.ts are all fixed-shape lookups). Two things checked:
// the backend doesn't error in a way that leaks internals, AND the stored
// name round-trips through GET /api/auth/me as inert text rather than
// executable markup once rendered (this repo's src/ has no
// dangerouslySetInnerHTML anywhere — checked statically — so React's
// default escaping should cover the render side).
import { parseArgs, finding, writeFindings } from '../lib/findings.js';
import { evidenceFrom, HttpClient } from '../lib/http.js';

const { baseUrl, out } = parseArgs(process.argv.slice(2));
const findings = [];

const SQLI_PAYLOADS = [`' OR '1'='1`, `'; DROP TABLE users; --`];
const XSS_PAYLOADS = [`<script>alert(1)</script>`, `"><img src=x onerror=alert(1)>`];

function looksLikeLeakedInternals(text) {
  return /at Object\.|node_modules\/|PostgresError|error: syntax error|TypeError:|ReferenceError:|pg\.Pool|drizzle-orm/i.test(text ?? '');
}

// Drizzle (server/db/schema.ts) uses parameterized queries throughout —
// classic SQLi is not expected to succeed here, but the check is still
// worth running since it also exercises the error-handling path (category 8
// covers that more directly).
for (const payload of [...SQLI_PAYLOADS, ...XSS_PAYLOADS]) {
  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const client = new HttpClient(baseUrl);
  const res = await client.post('/api/auth/signup', {
    name: payload,
    email: `injection_${suffix}@example.invalid`,
    password: 'SecTest123!',
  });

  if (res.status >= 500 || looksLikeLeakedInternals(res.bodyText)) {
    findings.push(finding({
      title: 'Signup name field errors or leaks internals on injection-shaped input',
      severity: 'High',
      owasp: 'A03:2021 – Injection',
      location: 'POST /api/auth/signup (name)',
      description: `Payload ${JSON.stringify(payload)} produced a ${res.status} with ${looksLikeLeakedInternals(res.bodyText) ? 'internal module/driver names or a query fragment' : 'a server error'} in the response.`,
      evidence: evidenceFrom(res, { note: `Payload: ${payload}` }),
      fix: 'Ensure this input only ever reaches the database through a Drizzle query-builder call (parameterized by construction) and that server/app.ts\'s setErrorHandler never echoes a raw error.message for a non-ApiError exception (see tests/08-error-handling.js for the related finding).',
    }));
  }
}

// -- Stored XSS surface: signup name, round-tripped through /auth/me ------
const xssPayload = XSS_PAYLOADS[0];
const xssSuffix = `${Date.now()}_xss`;
const shopper = new HttpClient(baseUrl);
const signupRes = await shopper.post('/api/auth/signup', {
  name: xssPayload,
  email: `xss_${xssSuffix}@example.invalid`,
  password: 'SecTest123!',
});

if (signupRes.status === 200) {
  const meRes = await shopper.get('/api/auth/me');
  const storedName = meRes.bodyJson?.name ?? '';

  if (storedName.includes('<script') || storedName.includes('onerror=')) {
    findings.push(finding({
      title: 'Signup name field stores and returns raw HTML/script-shaped input unescaped',
      severity: 'Medium',
      owasp: 'A03:2021 – Injection (Stored XSS surface)',
      location: 'POST /api/auth/signup (name), GET /api/auth/me',
      description: 'The API stores and returns the raw payload unsanitized. This repo\'s src/ has no dangerouslySetInnerHTML (checked statically), and React escapes text content by default, so this is not yet a confirmed exploit — it is a live surface that becomes one the moment any current or future component renders a user\'s name via dangerouslySetInnerHTML or similar (the name is rendered in several places: src/components/layout/ProfileMenu.tsx, src/pages/AccountPage.tsx, ticket components).',
      evidence: evidenceFrom(meRes, { note: `Signup with name = ${JSON.stringify(xssPayload)}, then GET /api/auth/me:` }),
      fix: 'Confirm every place a user\'s name is rendered uses React\'s default text interpolation, not dangerouslySetInnerHTML. Optionally sanitize/strip HTML server-side on write (server/routes/auth.ts) as defense-in-depth.',
    }));
  }
}

writeFindings(findings, out);
console.log(`04-injection: ${findings.length} finding(s)`);
