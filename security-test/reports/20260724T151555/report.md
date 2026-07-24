# CineHall security test report

Generated: 2026-07-24T20:16:01.894Z

## Executive summary

| Severity | Count |
|---|---|
| Critical | 0 |
| High | 2 |
| Medium | 8 |
| Low | 5 |
| Info | 7 |

## Findings

### Any authenticated user can release (cancel) another user's active seat hold

- **Severity**: High
- **OWASP category**: A01:2021 – Broken Access Control
- **Location**: POST /api/holds/{id}/release
- **Status**: Open

**Description**: server/routes/holds.ts guards POST /api/holds/:id/release with requireAuth only — releaseHold() in server/services/seatLock.ts deletes the hold row by id with no ownership check. Any signed-in user who obtains another user's hold id can free their seats mid-checkout (a real state mutation, not just a read), letting the seats be grabbed by someone else while the original holder believes they are still reserved.

**Evidence**:
```
POST release as attacker:
POST http://localhost:4000/api/holds/hold_b9779651-671f-4acc-af3a-521a0911e47e/release
Response: 204
Response body: 
```

**Recommended fix**: In server/routes/holds.ts's /holds/:id/release handler, call getHold() first, compare holderId to request.userId, and throw ApiError('FORBIDDEN', ...) before calling releaseHold() on mismatch. Root cause worth fixing at the same time: POST /api/shows/:id/hold (server/routes/shows.ts) currently trusts a client-supplied `holderId` in the request body instead of deriving it from request.userId — CLAUDE.md documents that pattern (deriving userId from the session, never the body) as the norm for confirmBooking/cancelBooking/bookings/me, but the hold-creation route doesn't follow it, which is what makes holderId-based ownership checks meaningless without also fixing this.

---

### 2 High/Critical npm dependency vulnerabilities

- **Severity**: High
- **OWASP category**: A06:2021 – Vulnerable and Outdated Components
- **Location**: package.json / package-lock.json
- **Status**: Open

**Description**: npm audit reported: react-router@7.12.0 - 8.2.0 (high), react-router-dom@>=7.12.0-pre.0 (high)

**Evidence**:
```
npm audit --omit=dev --json
High/Critical: react-router@7.12.0 - 8.2.0 (high), react-router-dom@>=7.12.0-pre.0 (high)
```

**Recommended fix**: Run `npm audit fix` where possible; for vulnerabilities without a compatible fix, evaluate whether the vulnerable code path is actually reachable in this app before deciding on an upgrade/replace/accept-risk call.

---

### Any authenticated user can read another user's active seat hold

- **Severity**: Medium
- **OWASP category**: A01:2021 – Broken Access Control
- **Location**: GET /api/holds/{id}
- **Status**: Open

**Description**: server/routes/holds.ts guards GET /api/holds/:id with requireAuth only — server/services/seatLock.ts's getHold() never compares the hold's holderId against the caller. Any signed-in user who obtains a hold id (e.g. via the release check below, or by observing one in transit) can read the showId and seatIds of a hold they do not own.

**Evidence**:
```
GET as attacker (owner-only resource):
GET http://localhost:4000/api/holds/hold_b9779651-671f-4acc-af3a-521a0911e47e
Response: 200
Response body: {"id":"hold_b9779651-671f-4acc-af3a-521a0911e47e","showId":"aurora-kurla-scr1__oppenheimer__d0__t2","seatIds":["A2"],"holderId":"user_2d186859-8cd2-431d-b9c5-bbc30668e923","createdAt":"2026-07-24 20:15:57.837+00","expiresAt":"2026-07-24 20:20:57.837+00"}
```

**Recommended fix**: In server/routes/holds.ts, compare hold.holderId to request.userId after getHold() resolves and throw ApiError('FORBIDDEN', ...) on mismatch, the same pattern already used for bookings in server/services/booking.ts.

---

### Logout cannot invalidate a session token before its natural 30-day expiry

- **Severity**: Medium
- **OWASP category**: A07:2021 – Identification and Authentication Failures
- **Location**: POST /api/auth/logout, server/lib/session.ts verifySession()
- **Status**: Open

**Description**: This app's stateless HMAC-signed session cookie (a deliberate choice per CLAUDE.md, to avoid a DB-backed session table) has no server-side revocation mechanism — verifySession() only checks the signature and expiresAt. /api/auth/logout only clears the cookie client-side; a token captured before logout (XSS, a synced/shared browser profile, a proxy log) remains fully valid for the rest of its 30-day SESSION_DURATION_MS window even after the user "logs out".

**Evidence**:
```
GET /api/auth/me replaying the pre-logout session cookie, after calling /api/auth/logout:
GET http://localhost:4000/api/auth/me
Response: 200
Response body: {"id":"user_9fed242a-8997-43ab-8a80-08b503a1033d","name":"Security Test 1784924155513_05qqdc","email":"sec-attacker_1784924155513_05qqdc@example.invalid","isAdmin":false,"createdAt":"2026-07-24 20:15:55.650489+00"}
```

**Recommended fix**: If real logout-time revocation is wanted, add a minimal server-side check (e.g. a small denylist table of invalidated token signatures, or a per-user "session epoch"/tokenVersion column checked in verifySession() and bumped on logout) — this is the smallest change that preserves the existing stateless-cookie design for the common case while closing the post-logout replay window. Otherwise, document this as an accepted tradeoff and consider shortening SESSION_DURATION_MS.

---

### Signup name field stores and returns raw HTML/script-shaped input unescaped

- **Severity**: Medium
- **OWASP category**: A03:2021 – Injection (Stored XSS surface)
- **Location**: POST /api/auth/signup (name), GET /api/auth/me
- **Status**: Open

**Description**: The API stores and returns the raw payload unsanitized. This repo's src/ has no dangerouslySetInnerHTML (checked statically), and React escapes text content by default, so this is not yet a confirmed exploit — it is a live surface that becomes one the moment any current or future component renders a user's name via dangerouslySetInnerHTML or similar (the name is rendered in several places: src/components/layout/ProfileMenu.tsx, src/pages/AccountPage.tsx, ticket components).

**Evidence**:
```
Signup with name = "<script>alert(1)</script>", then GET /api/auth/me:
GET http://localhost:4000/api/auth/me
Response: 200
Response body: {"id":"user_5626e527-3f0f-4880-9f6d-00dd9e2b15c3","name":"<script>alert(1)</script>","email":"xss_1784924160609_xss@example.invalid","isAdmin":false,"createdAt":"2026-07-24 20:16:00.747497+00"}
```

**Recommended fix**: Confirm every place a user's name is rendered uses React's default text interpolation, not dangerouslySetInnerHTML. Optionally sanitize/strip HTML server-side on write (server/routes/auth.ts) as defense-in-depth.

---

### Missing X-Frame-Options or CSP frame-ancestors on a JSON API response

- **Severity**: Medium
- **OWASP category**: A05:2021 – Security Misconfiguration
- **Location**: /api/cities response headers
- **Status**: Open

**Description**: X-Frame-Options or CSP frame-ancestors was not present. Prevents clickjacking via iframe embedding.

**Evidence**:
```
GET http://localhost:4000/api/cities
Response headers: {
  "connection": "keep-alive",
  "content-length": "221",
  "content-type": "application/json; charset=utf-8",
  "date": "Fri, 24 Jul 2026 20:16:00 GMT",
  "keep-alive": "timeout=72",
  "x-ratelimit-limit": "15000",
  "x-ratelimit-remaining": "14972",
  "x-ratelimit-reset": "48"
}
```

**Recommended fix**: Add X-Frame-Options or CSP frame-ancestors via a global Fastify onSend hook in server/app.ts (applies to both API and static-asset responses, since both are served by the same createApp() instance) — no need for an extra dependency like @fastify/helmet for a handful of static header values.

---

### Missing Content-Security-Policy on a JSON API response

- **Severity**: Medium
- **OWASP category**: A05:2021 – Security Misconfiguration
- **Location**: /api/cities response headers
- **Status**: Open

**Description**: Content-Security-Policy was not present. Primary defense-in-depth layer against XSS/data-injection.

**Evidence**:
```
GET http://localhost:4000/api/cities
Response headers: {
  "connection": "keep-alive",
  "content-length": "221",
  "content-type": "application/json; charset=utf-8",
  "date": "Fri, 24 Jul 2026 20:16:00 GMT",
  "keep-alive": "timeout=72",
  "x-ratelimit-limit": "15000",
  "x-ratelimit-remaining": "14972",
  "x-ratelimit-reset": "48"
}
```

**Recommended fix**: Add Content-Security-Policy via a global Fastify onSend hook in server/app.ts (applies to both API and static-asset responses, since both are served by the same createApp() instance) — no need for an extra dependency like @fastify/helmet for a handful of static header values.

---

### Missing X-Frame-Options or CSP frame-ancestors on the served frontend HTML

- **Severity**: Medium
- **OWASP category**: A05:2021 – Security Misconfiguration
- **Location**: / response headers
- **Status**: Open

**Description**: X-Frame-Options or CSP frame-ancestors was not present. Prevents clickjacking via iframe embedding.

**Evidence**:
```
GET http://localhost:4000/
Response headers: {
  "accept-ranges": "bytes",
  "cache-control": "public, max-age=0",
  "connection": "keep-alive",
  "content-length": "1038",
  "content-type": "text/html; charset=utf-8",
  "date": "Fri, 24 Jul 2026 20:16:00 GMT",
  "etag": "W/\"40e-19f95c4ee40\"",
  "keep-alive": "timeout=72",
  "last-modified": "Fri, 24 Jul 2026 20:15:39 GMT",
  "x-ratelimit-limit": "15000",
  "x-ratelimit-remaining": "14971",
  "x-ratelimit-reset": "48"
}
```

**Recommended fix**: Add X-Frame-Options or CSP frame-ancestors via a global Fastify onSend hook in server/app.ts (applies to both API and static-asset responses, since both are served by the same createApp() instance) — no need for an extra dependency like @fastify/helmet for a handful of static header values.

---

### Missing Content-Security-Policy on the served frontend HTML

- **Severity**: Medium
- **OWASP category**: A05:2021 – Security Misconfiguration
- **Location**: / response headers
- **Status**: Open

**Description**: Content-Security-Policy was not present. Primary defense-in-depth layer against XSS/data-injection.

**Evidence**:
```
GET http://localhost:4000/
Response headers: {
  "accept-ranges": "bytes",
  "cache-control": "public, max-age=0",
  "connection": "keep-alive",
  "content-length": "1038",
  "content-type": "text/html; charset=utf-8",
  "date": "Fri, 24 Jul 2026 20:16:00 GMT",
  "etag": "W/\"40e-19f95c4ee40\"",
  "keep-alive": "timeout=72",
  "last-modified": "Fri, 24 Jul 2026 20:15:39 GMT",
  "x-ratelimit-limit": "15000",
  "x-ratelimit-remaining": "14971",
  "x-ratelimit-reset": "48"
}
```

**Recommended fix**: Add Content-Security-Policy via a global Fastify onSend hook in server/app.ts (applies to both API and static-asset responses, since both are served by the same createApp() instance) — no need for an extra dependency like @fastify/helmet for a handful of static header values.

---

### JSON null as the entire body (valid JSON, degenerate shape) leaks internal error detail

- **Severity**: Medium
- **OWASP category**: A05:2021 – Security Misconfiguration
- **Location**: JSON null as the entire body (valid JSON, degenerate shape)
- **Status**: Open

**Description**: The response body for this path contains what looks like a raw JS runtime error message (TypeError/ReferenceError/etc.) rather than a clean, generic error body. server/app.ts's setErrorHandler only maps ApiError instances to a clean {code, message} — anything else (e.g. a TypeError from destructuring a non-object request.body) falls through to a branch that echoes err.message verbatim at a flat 500.

**Evidence**:
```
JSON null as the entire body (valid JSON, degenerate shape)
POST http://localhost:4000/api/auth/signup
Request body: "null"
Response: 500
Response body: {"code":"INTERNAL_ERROR","message":"Cannot read properties of null (reading 'name')"}
```

**Recommended fix**: In server/app.ts's setErrorHandler, don't send err.message for non-ApiError exceptions — always send a fixed generic message (e.g. "Something went wrong.") for that branch, matching what it already does when err.message isn't a string. Optionally also harden the specific route (server/routes/auth.ts) to validate request.body is a non-null object before destructuring off it.

---

### Booking ownership check reveals resource existence via 403 rather than masking it with 404

- **Severity**: Low
- **OWASP category**: A01:2021 – Broken Access Control
- **Location**: GET /api/bookings/{id}, POST /api/bookings/{id}/cancel
- **Status**: Open

**Description**: Both endpoints correctly reject a non-owner (consistently, via 403 FORBIDDEN — server/lib/httpError.ts), but 403 confirms the booking id exists at all, unlike a 404. Booking ids are unguessable UUIDs, so practical enumeration risk is low, but this tradeoff isn't currently documented as an intentional choice.

**Evidence**:
```
GET as attacker:
GET http://localhost:4000/api/bookings/bkg_4bb8ba79-45ba-4a7f-9368-9b357df1562a
Response: 403
Response body: {"code":"FORBIDDEN","message":"You do not have access to this booking."}

POST cancel as attacker:
POST http://localhost:4000/api/bookings/bkg_4bb8ba79-45ba-4a7f-9368-9b357df1562a/cancel
Response: 403
Response body: {"code":"FORBIDDEN","message":"You do not have access to this booking."}
```

**Recommended fix**: Optional hardening: return 404 (BOOKING_NOT_FOUND) instead of 403 for a non-owned booking id in both server/routes/bookings.ts and server/services/booking.ts, consistent with how MOVIE_NOT_FOUND/SHOW_NOT_FOUND/etc. already mask existence elsewhere in this codebase. Not required — record the current behavior as an accepted tradeoff if no change is made.

---

### Missing X-Content-Type-Options on a JSON API response

- **Severity**: Low
- **OWASP category**: A05:2021 – Security Misconfiguration
- **Location**: /api/cities response headers
- **Status**: Open

**Description**: X-Content-Type-Options was not present. Prevents MIME-sniffing.

**Evidence**:
```
GET http://localhost:4000/api/cities
Response headers: {
  "connection": "keep-alive",
  "content-length": "221",
  "content-type": "application/json; charset=utf-8",
  "date": "Fri, 24 Jul 2026 20:16:00 GMT",
  "keep-alive": "timeout=72",
  "x-ratelimit-limit": "15000",
  "x-ratelimit-remaining": "14972",
  "x-ratelimit-reset": "48"
}
```

**Recommended fix**: Add X-Content-Type-Options via a global Fastify onSend hook in server/app.ts (applies to both API and static-asset responses, since both are served by the same createApp() instance) — no need for an extra dependency like @fastify/helmet for a handful of static header values.

---

### Missing Referrer-Policy on a JSON API response

- **Severity**: Low
- **OWASP category**: A05:2021 – Security Misconfiguration
- **Location**: /api/cities response headers
- **Status**: Open

**Description**: Referrer-Policy was not present. Limits referrer leakage to third parties.

**Evidence**:
```
GET http://localhost:4000/api/cities
Response headers: {
  "connection": "keep-alive",
  "content-length": "221",
  "content-type": "application/json; charset=utf-8",
  "date": "Fri, 24 Jul 2026 20:16:00 GMT",
  "keep-alive": "timeout=72",
  "x-ratelimit-limit": "15000",
  "x-ratelimit-remaining": "14972",
  "x-ratelimit-reset": "48"
}
```

**Recommended fix**: Add Referrer-Policy via a global Fastify onSend hook in server/app.ts (applies to both API and static-asset responses, since both are served by the same createApp() instance) — no need for an extra dependency like @fastify/helmet for a handful of static header values.

---

### Missing X-Content-Type-Options on the served frontend HTML

- **Severity**: Low
- **OWASP category**: A05:2021 – Security Misconfiguration
- **Location**: / response headers
- **Status**: Open

**Description**: X-Content-Type-Options was not present. Prevents MIME-sniffing.

**Evidence**:
```
GET http://localhost:4000/
Response headers: {
  "accept-ranges": "bytes",
  "cache-control": "public, max-age=0",
  "connection": "keep-alive",
  "content-length": "1038",
  "content-type": "text/html; charset=utf-8",
  "date": "Fri, 24 Jul 2026 20:16:00 GMT",
  "etag": "W/\"40e-19f95c4ee40\"",
  "keep-alive": "timeout=72",
  "last-modified": "Fri, 24 Jul 2026 20:15:39 GMT",
  "x-ratelimit-limit": "15000",
  "x-ratelimit-remaining": "14971",
  "x-ratelimit-reset": "48"
}
```

**Recommended fix**: Add X-Content-Type-Options via a global Fastify onSend hook in server/app.ts (applies to both API and static-asset responses, since both are served by the same createApp() instance) — no need for an extra dependency like @fastify/helmet for a handful of static header values.

---

### Missing Referrer-Policy on the served frontend HTML

- **Severity**: Low
- **OWASP category**: A05:2021 – Security Misconfiguration
- **Location**: / response headers
- **Status**: Open

**Description**: Referrer-Policy was not present. Limits referrer leakage to third parties.

**Evidence**:
```
GET http://localhost:4000/
Response headers: {
  "accept-ranges": "bytes",
  "cache-control": "public, max-age=0",
  "connection": "keep-alive",
  "content-length": "1038",
  "content-type": "text/html; charset=utf-8",
  "date": "Fri, 24 Jul 2026 20:16:00 GMT",
  "etag": "W/\"40e-19f95c4ee40\"",
  "keep-alive": "timeout=72",
  "last-modified": "Fri, 24 Jul 2026 20:15:39 GMT",
  "x-ratelimit-limit": "15000",
  "x-ratelimit-remaining": "14971",
  "x-ratelimit-reset": "48"
}
```

**Recommended fix**: Add Referrer-Policy via a global Fastify onSend hook in server/app.ts (applies to both API and static-asset responses, since both are served by the same createApp() instance) — no need for an extra dependency like @fastify/helmet for a handful of static header values.

---

### Verified: signup endpoint ignores client-supplied isAdmin/role fields

- **Severity**: Info
- **OWASP category**: A04:2021 – Insecure Design (mass assignment)
- **Location**: POST /api/auth/signup
- **Status**: Open

**Description**: server/routes/auth.ts reads name/email/password off request.body individually (no object-spread binding) and server/services/users.ts's createUser() only inserts an explicit whitelist of fields — a client-supplied isAdmin/role in the signup body had no effect, confirmed live.

**Evidence**:
```
Signup with an extra isAdmin field:
POST http://localhost:4000/api/auth/signup
Request body: {"name":"Mass Assignment Test","email":"mass-assign_1784924158230_a8yymp@example.invalid","password":"SecTest123!","isAdmin":true,"role":"admin"}
Response: 200
Response body: {"id":"user_3766af04-f5e1-45ea-a95e-7b0504eb9167","name":"Mass Assignment Test","email":"mass-assign_1784924158230_a8yymp@example.invalid","isAdmin":false,"createdAt":"2026-07-24 20:15:58.378517+00"}
```

**Recommended fix**: N/A — re-check if createUser()'s input type or the signup handler is ever changed to bind request.body more broadly (e.g. object-spread or a schema that isn't an explicit allowlist).

---

### Signup response reveals whether an email is already registered

- **Severity**: Info
- **OWASP category**: A01:2021 – Broken Access Control (account enumeration)
- **Location**: POST /api/auth/signup
- **Status**: Open

**Description**: A distinct EMAIL_TAKEN/409 on duplicate signup lets a caller enumerate registered emails. This is a common, often-deliberate UX tradeoff — note this app's login endpoint explicitly avoids the same signal (CLAUDE.md: "Login failures always return the same generic ... message ... no user-enumeration signal"), but that documented protection doesn't extend to signup. Recorded so the decision is visible, not because it's treated as a vulnerability on its own.

**Evidence**:
```
Second signup with the same email:
POST http://localhost:4000/api/auth/signup
Request body: {"name":"Dup Test 2","email":"dup_1784924159322_dup@example.invalid","password":"SecTest123!"}
Response: 409
Response body: {"code":"EMAIL_TAKEN","message":"An account with this email already exists."}
```

**Recommended fix**: No fix required unless enumeration resistance is an explicit goal for signup specifically; if it is, this would need to change to a generic response, unlike the login path which already handles this correctly.

---

### Verified: login rate limiting engages after 11 rapid failed attempts

- **Severity**: Info
- **OWASP category**: A07:2021 – Identification and Authentication Failures
- **Location**: POST /api/auth/login
- **Status**: Open

**Description**: A 429 appeared at attempt 11 of 11, consistent with server/routes/auth.ts's documented max: 10 / 15 minutes, keyed by IP+email.

**Evidence**:
```
Attempt 11 (first 429):
POST http://localhost:4000/api/auth/login
Request body: {"email":"sec-owner_1784924155367_tfj8zf@example.invalid","password":"wrong-password-10"}
Response: 429
Response body: {"code":"INTERNAL_ERROR","message":"Rate limit exceeded, retry in 15 minutes"}
```

**Recommended fix**: N/A — documented behavior verified live.

---

### CSRF-via-same-origin assumption verified: no CORS opening found

- **Severity**: Info
- **OWASP category**: A01:2021 – Broken Access Control
- **Location**: server/app.ts (no CORS plugin registered)
- **Status**: Open

**Description**: No Access-Control-Allow-Origin header was returned for a cross-origin request, consistent with this app's single-artifact, same-origin-only deployment (CLAUDE.md). Recorded so this assumption is known-checked as of this run, not silently assumed. This app has no CSRF tokens at all, so this check — plus SameSite=lax (verified in tests/03-auth-session.js) — is the entire CSRF defense; re-run after any change that introduces a second origin or a CORS config.

**Evidence**:
```
GET /api/bookings/me with Origin: https://evil.example
GET http://localhost:4000/api/bookings/me
Response: 200
Response body: [{"id":"bkg_4bb8ba79-45ba-4a7f-9368-9b357df1562a","userId":"user_2d186859-8cd2-431d-b9c5-bbc30668e923","showId":"aurora-kurla-scr1__oppenheimer__d0__t2","seatIds":["A1"],"tierBreakdown":[{"count":1,"tierId":"classic","tierName":"Classic","pricePerSeat":180}],"subtotal":180,"convenienceFee":9,"total":189,"status":"confirmed","qrPayload":"{\"b\":\"bkg_4bb8ba79-45ba-4a7f-9368-9b357df1562a\",\"s\":\"aurora-kurla-scr1__oppenheimer__d0__t2\",\"seats\":[\"A1\"],\"v\":1}","createdAt":"2026-07-24 20:15:57.218+00"}]
```

**Recommended fix**: N/A — re-run this check any time a second frontend origin, a public API consumer, or a CORS config is introduced.

---

### Strict-Transport-Security not verifiable on a JSON API response (plain HTTP target)

- **Severity**: Info
- **OWASP category**: A05:2021 – Security Misconfiguration
- **Location**: /api/cities response headers
- **Status**: Open

**Description**: This run targeted a local http:// instance. HSTS is meaningless over plain HTTP from a browser's perspective — re-check against the real Render (TLS-terminated) deployment.

**Evidence**:
```
GET http://localhost:4000/api/cities
Response headers: {
  "connection": "keep-alive",
  "content-length": "221",
  "content-type": "application/json; charset=utf-8",
  "date": "Fri, 24 Jul 2026 20:16:00 GMT",
  "keep-alive": "timeout=72",
  "x-ratelimit-limit": "15000",
  "x-ratelimit-remaining": "14972",
  "x-ratelimit-reset": "48"
}
```

**Recommended fix**: N/A locally — verify HSTS is present on the deployed Render instance.

---

### Strict-Transport-Security not verifiable on the served frontend HTML (plain HTTP target)

- **Severity**: Info
- **OWASP category**: A05:2021 – Security Misconfiguration
- **Location**: / response headers
- **Status**: Open

**Description**: This run targeted a local http:// instance. HSTS is meaningless over plain HTTP from a browser's perspective — re-check against the real Render (TLS-terminated) deployment.

**Evidence**:
```
GET http://localhost:4000/
Response headers: {
  "accept-ranges": "bytes",
  "cache-control": "public, max-age=0",
  "connection": "keep-alive",
  "content-length": "1038",
  "content-type": "text/html; charset=utf-8",
  "date": "Fri, 24 Jul 2026 20:16:00 GMT",
  "etag": "W/\"40e-19f95c4ee40\"",
  "keep-alive": "timeout=72",
  "last-modified": "Fri, 24 Jul 2026 20:15:39 GMT",
  "x-ratelimit-limit": "15000",
  "x-ratelimit-remaining": "14971",
  "x-ratelimit-reset": "48"
}
```

**Recommended fix**: N/A locally — verify HSTS is present on the deployed Render instance.

---

### Verified: all 2 local .env file(s) are gitignored

- **Severity**: Info
- **OWASP category**: A02:2021 – Cryptographic Failures
- **Location**: ./.env.test, ./.env
- **Status**: Open

**Description**: .gitignore's `.env` and `.env.*` (with a `!.env.example` exception) entries were confirmed via git check-ignore -v against each real local-config file found, not just assumed from the pattern existing in .gitignore.

**Evidence**:
```
git check-ignore -v "./.env.test" -> .gitignore:18:.env.*	./.env.test
git check-ignore -v "./.env" -> .gitignore:17:.env	./.env
```

**Recommended fix**: N/A — re-run if a new .env-style file is ever added.

---
