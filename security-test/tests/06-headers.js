// Category 6: Security headers (OWASP A05:2021). Actually curl the running
// app and read real response headers — server/app.ts registers no
// helmet-equivalent and sets no security headers anywhere, so this category
// is expected to find real gaps on a first run. Checks both a JSON API
// response and the served frontend HTML — this suite is meant to run
// against the production build (`npm run build && npm start`, per
// CLAUDE.md's single-artifact architecture), since the dev server (`npm run
// dev`) doesn't serve dist/ at all (server/app.ts only registers the static
// handler if dist/ exists) and GET / against the bare API-only dev process
// would just be a generic 404, not the real "served frontend" case.
import { parseArgs, finding, writeFindings } from '../lib/findings.js';
import { HttpClient } from '../lib/http.js';

const { baseUrl, out } = parseArgs(process.argv.slice(2));
const findings = [];
const client = new HttpClient(baseUrl);
const isHttps = baseUrl.startsWith('https://');

const EXPECTED = [
  { header: 'x-content-type-options', label: 'X-Content-Type-Options', severity: 'Low', note: 'Prevents MIME-sniffing.' },
  { header: 'x-frame-options', altHeader: 'content-security-policy', altMatch: /frame-ancestors/i, label: 'X-Frame-Options or CSP frame-ancestors', severity: 'Medium', note: 'Prevents clickjacking via iframe embedding.' },
  { header: 'referrer-policy', label: 'Referrer-Policy', severity: 'Low', note: 'Limits referrer leakage to third parties.' },
  { header: 'content-security-policy', label: 'Content-Security-Policy', severity: 'Medium', note: 'Primary defense-in-depth layer against XSS/data-injection.' },
];

async function checkTarget(path, description) {
  const res = await client.get(path);
  for (const check of EXPECTED) {
    const present = res.headers[check.header] || (check.altHeader && check.altMatch?.test(res.headers[check.altHeader] ?? ''));
    if (!present) {
      findings.push(finding({
        title: `Missing ${check.label} on ${description}`,
        severity: check.severity,
        owasp: 'A05:2021 – Security Misconfiguration',
        location: `${path} response headers`,
        description: `${check.label} was not present. ${check.note}`,
        evidence: `GET ${baseUrl}${path}\nResponse headers: ${JSON.stringify(res.headers, null, 2)}`,
        fix: `Add ${check.label} via a global Fastify onSend hook in server/app.ts (applies to both API and static-asset responses, since both are served by the same createApp() instance) — no need for an extra dependency like @fastify/helmet for a handful of static header values.`,
      }));
    }
  }
  if (isHttps && !res.headers['strict-transport-security']) {
    findings.push(finding({
      title: `Missing Strict-Transport-Security on ${description}`,
      severity: 'Medium',
      owasp: 'A05:2021 – Security Misconfiguration',
      location: `${path} response headers`,
      description: 'The target is TLS-terminated but does not send HSTS, leaving room for protocol-downgrade attacks on future visits.',
      evidence: `GET ${baseUrl}${path}\nResponse headers: ${JSON.stringify(res.headers, null, 2)}`,
      fix: 'Set Strict-Transport-Security: max-age=31536000; includeSubDomains from the same onSend hook — harmless to send over plain HTTP too (browsers only honor it on secure origins), so it doesn\'t need an isHttps condition in the app code itself.',
    }));
  } else if (!isHttps) {
    findings.push(finding({
      title: `Strict-Transport-Security not verifiable on ${description} (plain HTTP target)`,
      severity: 'Info',
      owasp: 'A05:2021 – Security Misconfiguration',
      location: `${path} response headers`,
      description: 'This run targeted a local http:// instance. HSTS is meaningless over plain HTTP from a browser\'s perspective — re-check against the real Render (TLS-terminated) deployment.',
      evidence: `GET ${baseUrl}${path}\nResponse headers: ${JSON.stringify(res.headers, null, 2)}`,
      fix: 'N/A locally — verify HSTS is present on the deployed Render instance.',
    }));
  }
}

await checkTarget('/api/cities', 'a JSON API response');
await checkTarget('/', 'the served frontend HTML');

writeFindings(findings, out);
console.log(`06-headers: ${findings.length} finding(s)`);
