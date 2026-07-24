import { HttpClient } from './http.js';

const TEST_PASSWORD = 'SecTest123!'; // satisfies the app's 8-char MIN_PASSWORD_LENGTH (server/routes/auth.ts)

function uniqueSuffix() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// Fresh, unique, throwaway identity per call — same principle as
// e2e/fixtures/auth.js's registerUser: a shared/seeded account racing across
// test categories produces failures that have nothing to do with what's
// actually being tested, and this suite specifically wants independent
// identities for every ownership check. Hits POST /api/auth/signup, which
// both creates the account and sets the session cookie in one call — this
// app has no separate register-then-login step.
export async function createTestIdentity(baseUrl, { namePrefix = 'sectest' } = {}) {
  const client = new HttpClient(baseUrl);
  const suffix = uniqueSuffix();
  const email = `${namePrefix}_${suffix}@example.invalid`;
  const name = `Security Test ${suffix}`;

  const res = await client.post('/api/auth/signup', { name, email, password: TEST_PASSWORD });
  if (res.status !== 200) {
    throw new Error(`createTestIdentity: signup failed (${res.status}): ${res.bodyText}`);
  }

  return { client, email, password: TEST_PASSWORD, name, userId: res.bodyJson?.id, signupResponse: res };
}

export function logout(client) {
  return client.post('/api/auth/logout', undefined);
}

// Serializes just enough of an identity (email/password/userId + the live
// session cookie) to hand to another test file without spending a fresh
// signup call on it — see lib/setup.js for why this matters (the signup
// endpoint's 10-req/15min-per-email+IP rate limit, server/routes/auth.ts).
export function serializeIdentity({ email, password, name, userId, client }) {
  return { email, password, name, userId, cookies: Object.fromEntries(client.cookies) };
}

export function hydrateIdentity(baseUrl, saved) {
  const client = new HttpClient(baseUrl);
  client.cookies = new Map(Object.entries(saved.cookies));
  return { client, email: saved.email, password: saved.password, name: saved.name, userId: saved.userId };
}
