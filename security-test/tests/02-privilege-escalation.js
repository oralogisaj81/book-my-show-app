// Category 2: Privilege escalation / mass assignment (OWASP A01:2021 / A04:2021).
// Two independent checks: (a) can a normal signup request set isAdmin/role,
// (b) do the /api/admin/** routes actually reject non-admin callers at the
// API layer (server/lib/authGuard.ts's requireAdmin, applied via
// app.addHook('preHandler', requireAdmin) inside the admin plugin —
// CLAUDE.md notes this only affects routes registered on that plugin
// instance, which is exactly the kind of wiring worth verifying live rather
// than trusting from a read).
import fs from 'node:fs';
import { parseArgs, finding, writeFindings } from '../lib/findings.js';
import { evidenceFrom, HttpClient } from '../lib/http.js';
import { hydrateIdentity } from '../lib/auth.js';

const { baseUrl, out } = parseArgs(process.argv.slice(2));
const findings = [];

const pool = JSON.parse(fs.readFileSync(new URL('../.state/identities.json', import.meta.url), 'utf8'));
const owner = hydrateIdentity(baseUrl, pool.owner); // non-admin identity, reused rather than spending a fresh signup
const admin = hydrateIdentity(baseUrl, pool.admin);

// -- (a) Mass assignment via signup ---------------------------------------
const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const anon = new HttpClient(baseUrl);
const massAssignRes = await anon.post('/api/auth/signup', {
  name: 'Mass Assignment Test',
  email: `mass-assign_${suffix}@example.invalid`,
  password: 'SecTest123!',
  isAdmin: true,
  role: 'admin',
});

const grantedAdmin = massAssignRes.bodyJson?.isAdmin === true;
if (grantedAdmin) {
  findings.push(finding({
    title: 'Signup endpoint accepts a client-supplied isAdmin field',
    severity: 'Critical',
    owasp: 'A04:2021 – Insecure Design (mass assignment)',
    location: 'POST /api/auth/signup',
    description: 'The signup handler binds a client-supplied isAdmin field, letting any anonymous signup grant itself admin privileges.',
    evidence: evidenceFrom(massAssignRes, { note: 'Signup with an extra isAdmin field:' }),
    fix: 'Ensure createUser() (server/services/users.ts) only ever accepts the exact whitelisted fields it already does (id/name/email/passwordHash/passwordSalt) and nothing sourced from request.body\'s isAdmin/role.',
  }));
} else {
  findings.push(finding({
    title: 'Verified: signup endpoint ignores client-supplied isAdmin/role fields',
    severity: 'Info',
    owasp: 'A04:2021 – Insecure Design (mass assignment)',
    location: 'POST /api/auth/signup',
    description: 'server/routes/auth.ts reads name/email/password off request.body individually (no object-spread binding) and server/services/users.ts\'s createUser() only inserts an explicit whitelist of fields — a client-supplied isAdmin/role in the signup body had no effect, confirmed live.',
    evidence: evidenceFrom(massAssignRes, { note: 'Signup with an extra isAdmin field:' }),
    fix: 'N/A — re-check if createUser()\'s input type or the signup handler is ever changed to bind request.body more broadly (e.g. object-spread or a schema that isn\'t an explicit allowlist).',
  }));
}

// -- (b) Admin-route gating -------------------------------------------------
const adminRoutes = [
  { method: 'get', path: '/api/admin/analytics' },
  { method: 'get', path: '/api/admin/cinemas' },
  { method: 'get', path: '/api/admin/screens' },
  { method: 'get', path: '/api/admin/shows' },
];

for (const route of adminRoutes) {
  const asAnon = await anon[route.method](route.path);
  const asNonAdmin = await owner.client[route.method](route.path);

  if (asAnon.status < 400 || asAnon.status >= 500) {
    findings.push(finding({
      title: `Admin endpoint reachable without authentication: ${route.method.toUpperCase()} ${route.path}`,
      severity: 'Critical',
      owasp: 'A01:2021 – Broken Access Control',
      location: `${route.method.toUpperCase()} ${route.path}`,
      description: 'An unauthenticated caller received a non-4xx-reject response from an admin-only route.',
      evidence: evidenceFrom(asAnon, { note: 'Anonymous request:' }),
      fix: 'Confirm the route is actually registered inside the adminRoutes plugin in server/routes/admin.ts, where app.addHook(\'preHandler\', requireAdmin) is applied — a route registered outside that plugin instance silently loses the hook (Fastify plugin encapsulation).',
    }));
  }

  if (asNonAdmin.status < 400 || asNonAdmin.status >= 500) {
    findings.push(finding({
      title: `Admin endpoint reachable by a non-admin authenticated user: ${route.method.toUpperCase()} ${route.path}`,
      severity: 'Critical',
      owasp: 'A01:2021 – Broken Access Control',
      location: `${route.method.toUpperCase()} ${route.path}`,
      description: 'A signed-in but non-privileged user received a non-4xx-reject response from an admin-only route.',
      evidence: evidenceFrom(asNonAdmin, { note: 'Non-admin authenticated request:' }),
      fix: 'Confirm the account used to test really has isAdmin=false, and that requireAdmin (server/lib/authGuard.ts) runs before the handler executes for this route.',
    }));
  }
}

// Sanity check the admin identity actually works, so a pass above means
// something (a broken admin session would make every "asAnon"/"asNonAdmin"
// check look meaningless without this).
const asAdmin = await admin.client.get('/api/admin/analytics');
if (asAdmin.status !== 200) {
  console.error(`WARNING: promoted admin identity could not reach GET /api/admin/analytics (${asAdmin.status}) — verify the admin promotion (lib/setup.js) before trusting this file's other results.`);
}

writeFindings(findings, out);
console.log(`02-privilege-escalation: ${findings.length} finding(s)`);
