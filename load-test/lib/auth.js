import http from 'k6/http';
import { check } from 'k6';

const SESSION_COOKIE_NAME = 'cinehall_session';

// One unique account per VU (identity isolation — a shared/seeded account
// racing across many concurrent VUs produces session contention that has
// nothing to do with what the test is measuring), signed up once.
//
// Unlike the generic template, this app's session cookie is long-lived (30
// days — see server/lib/session.ts's SESSION_DURATION_MS) and POST
// /api/auth/signup itself establishes a session (no separate login step
// needed). A *real* user signs up once and stays logged in; re-authenticating
// every iteration would be modeling k6's per-iteration cookie-jar reset, not
// real user behavior. So: sign up once per VU, capture the session cookie
// value from the response, and manually re-seed it into that iteration's
// (freshly-reset) cookie jar on every later iteration via jar.set() — this
// is a plain in-memory assignment, not an HTTP request, so it doesn't cost
// anything and doesn't touch the signup rate limiter after the first call.
const sessions = {};

export function ensureSession(baseUrl) {
  const existing = sessions[__VU];
  const jar = http.cookieJar();

  if (existing) {
    if (existing.sessionCookie) {
      jar.set(baseUrl, SESSION_COOKIE_NAME, existing.sessionCookie);
    }
    return existing;
  }

  const email = `loadtest_vu${__VU}_${Date.now()}@example.com`;
  const password = 'LoadTest123!';
  const res = http.post(
    `${baseUrl}/api/auth/signup`,
    JSON.stringify({ name: `Load Test VU ${__VU}`, email, password }),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'auth_signup' } }
  );
  const registered = check(res, { 'signup succeeded': (r) => r.status === 200 });
  const cookies = res.cookies[SESSION_COOKIE_NAME];
  const sessionCookie = registered && cookies && cookies.length ? cookies[0].value : undefined;
  const userId = registered ? res.json('id') : undefined;

  sessions[__VU] = { email, password, registered: registered && !!sessionCookie, sessionCookie, userId };
  if (sessions[__VU].sessionCookie) {
    jar.set(baseUrl, SESSION_COOKIE_NAME, sessions[__VU].sessionCookie);
  }
  return sessions[__VU];
}
