# CineHall security test report

Generated: 2026-07-24T20:36:59.464Z

## Executive summary

| Severity | Count |
|---|---|
| Critical | 0 |
| High | 1 |
| Medium | 1 |
| Low | 0 |
| Info | 8 |

## Findings

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
Response body: {"id":"user_2878c7a2-8d9d-41f1-a83e-335962680f63","name":"Security Test 1784925413845_j6y2hd","email":"sec-attacker_1784925413845_j6y2hd@example.invalid","isAdmin":false,"createdAt":"2026-07-24 20:36:53.982848+00"}
```

**Recommended fix**: If real logout-time revocation is wanted, add a minimal server-side check (e.g. a small denylist table of invalidated token signatures, or a per-user "session epoch"/tokenVersion column checked in verifySession() and bumped on logout) — this is the smallest change that preserves the existing stateless-cookie design for the common case while closing the post-logout replay window. Otherwise, document this as an accepted tradeoff and consider shortening SESSION_DURATION_MS.

---

### Verified: booking ownership check consistently rejects a non-owner via 404

- **Severity**: Info
- **OWASP category**: A01:2021 – Broken Access Control
- **Location**: GET /api/bookings/{id}, POST /api/bookings/{id}/cancel
- **Status**: Open

**Description**: Both endpoints return BOOKING_NOT_FOUND/404 for a non-owned booking id, masking existence — consistent with MOVIE_NOT_FOUND/SHOW_NOT_FOUND/etc. elsewhere in this codebase.

**Evidence**:
```
GET as attacker:
GET http://localhost:4000/api/bookings/bkg_7b01ccaf-62f0-4eae-82fa-cf789e09b616
Response: 404
Response body: {"code":"BOOKING_NOT_FOUND","message":"Booking not found."}

POST cancel as attacker:
POST http://localhost:4000/api/bookings/bkg_7b01ccaf-62f0-4eae-82fa-cf789e09b616/cancel
Response: 404
Response body: {"code":"BOOKING_NOT_FOUND","message":"Booking not found."}
```

**Recommended fix**: N/A — verified live.

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
Request body: {"name":"Mass Assignment Test","email":"mass-assign_1784925416464_5355n0@example.invalid","password":"SecTest123!","isAdmin":true,"role":"admin"}
Response: 200
Response body: {"id":"user_875cd50d-a4a2-44f0-8de5-a26973a5c052","name":"Mass Assignment Test","email":"mass-assign_1784925416464_5355n0@example.invalid","isAdmin":false,"createdAt":"2026-07-24 20:36:56.622667+00"}
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
Request body: {"name":"Dup Test 2","email":"dup_1784925417573_dup@example.invalid","password":"SecTest123!"}
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
Request body: {"email":"sec-owner_1784925413723_zn1cg4@example.invalid","password":"wrong-password-10"}
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
Response body: [{"id":"bkg_7b01ccaf-62f0-4eae-82fa-cf789e09b616","userId":"user_2a302187-6841-46a1-a219-f938b7a3168f","showId":"aurora-kurla-scr1__oppenheimer__d0__t2","seatIds":["B9"],"tierBreakdown":[{"count":1,"tierId":"classic","tierName":"Classic","pricePerSeat":180}],"subtotal":180,"convenienceFee":9,"total":189,"status":"confirmed","qrPayload":"{\"b\":\"bkg_7b01ccaf-62f0-4eae-82fa-cf789e09b616\",\"s\":\"aurora-kurla-scr1__oppenheimer__d0__t2\",\"seats\":[\"B9\"],\"v\":1}","createdAt":"2026-07-24 20:36:55.473+00"}]
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
  "content-security-policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: https://image.tmdb.org; connect-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'",
  "content-type": "application/json; charset=utf-8",
  "date": "Fri, 24 Jul 2026 20:36:58 GMT",
  "keep-alive": "timeout=72",
  "referrer-policy": "strict-origin-when-cross-origin",
  "strict-transport-security": "max-age=31536000; includeSubDomains",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "x-ratelimit-limit": "15000",
  "x-ratelimit-remaining": "14973",
  "x-ratelimit-reset": "55"
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
  "content-security-policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: https://image.tmdb.org; connect-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'",
  "content-type": "text/html; charset=utf-8",
  "date": "Fri, 24 Jul 2026 20:36:58 GMT",
  "etag": "W/\"40e-19f95d742f5\"",
  "keep-alive": "timeout=72",
  "last-modified": "Fri, 24 Jul 2026 20:35:40 GMT",
  "referrer-policy": "strict-origin-when-cross-origin",
  "strict-transport-security": "max-age=31536000; includeSubDomains",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "x-ratelimit-limit": "15000",
  "x-ratelimit-remaining": "14972",
  "x-ratelimit-reset": "55"
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
