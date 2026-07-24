// Category 1: Broken access control / IDOR (OWASP A01:2021).
// Two resource families in this app carry an owner: bookings (checked) and
// seat holds (NOT checked — see below). CLAUDE.md documents, for bookings,
// that userId is "always derived from the session, never from the request
// body" for confirmBooking/cancelBooking/bookings/me — the seat-hold routes
// are the one place that invariant doesn't hold, which is exactly what this
// file is built to catch.
import fs from 'node:fs';
import { parseArgs, finding, writeFindings } from '../lib/findings.js';
import { evidenceFrom } from '../lib/http.js';
import { hydrateIdentity } from '../lib/auth.js';
import { pickBookableShow, placeTestBooking, placeTestHold } from '../lib/data.js';

const { baseUrl, out } = parseArgs(process.argv.slice(2));
const findings = [];

const pool = JSON.parse(fs.readFileSync(new URL('../.state/identities.json', import.meta.url), 'utf8'));
const owner = hydrateIdentity(baseUrl, pool.owner);
const attacker = hydrateIdentity(baseUrl, pool.attacker);

const show = await pickBookableShow(baseUrl);

// -- Bookings: ownership check present — verify it actually holds ---------
const { booking } = await placeTestBooking(owner, show.id);

const getBookingAsAttacker = await attacker.client.get(`/api/bookings/${booking.id}`);
const cancelBookingAsAttacker = await attacker.client.post(`/api/bookings/${booking.id}/cancel`, undefined);

// Either 403 (reveals existence) or 404 (masks it) is a legitimate way to block a non-owner —
// see reference/false-positive-guide.md's "404 instead of 403" section. What actually matters
// is that a non-owner is rejected at all, and that both endpoints agree on which convention.
const bookingGetBlocked = [403, 404].includes(getBookingAsAttacker.status);
const bookingCancelBlocked = [403, 404].includes(cancelBookingAsAttacker.status);

if (!bookingGetBlocked || !bookingCancelBlocked) {
  findings.push(finding({
    title: 'Cross-account booking access not fully blocked',
    severity: 'Critical',
    owasp: 'A01:2021 – Broken Access Control',
    location: 'GET /api/bookings/{id}, POST /api/bookings/{id}/cancel',
    description: `A second, unrelated identity was able to ${!bookingGetBlocked ? 'read' : ''}${!bookingGetBlocked && !bookingCancelBlocked ? ' and ' : ''}${!bookingCancelBlocked ? 'cancel' : ''} a booking it does not own.`,
    evidence: [
      evidenceFrom(getBookingAsAttacker, { note: 'GET as attacker (owner-only resource):' }),
      evidenceFrom(cancelBookingAsAttacker, { note: 'POST cancel as attacker:' }),
    ].join('\n\n'),
    fix: 'Filter by booking.userId === request.userId (server/services/booking.ts already does this for cancelBooking — confirm the same check is present and unconditional for every booking-scoped route) before returning/mutating the resource.',
  }));
} else if (getBookingAsAttacker.status !== cancelBookingAsAttacker.status) {
  // Both blocked the action, but via different status codes — an inconsistency worth a line
  // even though neither call actually leaked or mutated anything.
  findings.push(finding({
    title: 'Inconsistent ownership-check status codes across booking endpoints',
    severity: 'Low',
    owasp: 'A01:2021 – Broken Access Control',
    location: 'GET /api/bookings/{id} vs POST /api/bookings/{id}/cancel',
    description: 'Both endpoints correctly reject a non-owner, but with different status codes, which undermines the existence-masking guarantee of using 404 at all (a caller can distinguish "doesn\'t exist" from "exists, not yours" via whichever endpoint still uses 403).',
    evidence: [
      evidenceFrom(getBookingAsAttacker, { note: 'GET as attacker:' }),
      evidenceFrom(cancelBookingAsAttacker, { note: 'POST cancel as attacker:' }),
    ].join('\n\n'),
    fix: 'Make both endpoints return the same status for a non-owned resource id.',
  }));
} else {
  findings.push(finding({
    title: `Verified: booking ownership check consistently rejects a non-owner via ${getBookingAsAttacker.status}`,
    severity: 'Info',
    owasp: 'A01:2021 – Broken Access Control',
    location: 'GET /api/bookings/{id}, POST /api/bookings/{id}/cancel',
    description: getBookingAsAttacker.status === 404
      ? 'Both endpoints return BOOKING_NOT_FOUND/404 for a non-owned booking id, masking existence — consistent with MOVIE_NOT_FOUND/SHOW_NOT_FOUND/etc. elsewhere in this codebase.'
      : 'Both endpoints return FORBIDDEN/403 for a non-owned booking id. Booking ids are unguessable UUIDs (shared/lib/id.ts), so the existence leak this reveals is low-risk, but note it isn\'t currently documented as an intentional choice.',
    evidence: [
      evidenceFrom(getBookingAsAttacker, { note: 'GET as attacker:' }),
      evidenceFrom(cancelBookingAsAttacker, { note: 'POST cancel as attacker:' }),
    ].join('\n\n'),
    fix: 'N/A — verified live.',
  }));
}

// -- Seat holds: no ownership check at all on GET or release --------------
const { holdId } = await placeTestHold(owner, show.id);

const getHoldAsAttacker = await attacker.client.get(`/api/holds/${holdId}`);
const releaseHoldAsAttacker = await attacker.client.post(`/api/holds/${holdId}/release`, undefined);

if (getHoldAsAttacker.status === 200) {
  findings.push(finding({
    title: 'Any authenticated user can read another user\'s active seat hold',
    severity: 'Medium',
    owasp: 'A01:2021 – Broken Access Control',
    location: 'GET /api/holds/{id}',
    description: 'server/routes/holds.ts guards GET /api/holds/:id with requireAuth only — server/services/seatLock.ts\'s getHold() never compares the hold\'s holderId against the caller. Any signed-in user who obtains a hold id (e.g. via the release check below, or by observing one in transit) can read the showId and seatIds of a hold they do not own.',
    evidence: evidenceFrom(getHoldAsAttacker, { note: 'GET as attacker (owner-only resource):' }),
    fix: 'In server/routes/holds.ts, compare hold.holderId to request.userId after getHold() resolves and throw ApiError(\'FORBIDDEN\', ...) on mismatch, the same pattern already used for bookings in server/services/booking.ts.',
  }));
}

if (releaseHoldAsAttacker.status === 204) {
  findings.push(finding({
    title: 'Any authenticated user can release (cancel) another user\'s active seat hold',
    severity: 'High',
    owasp: 'A01:2021 – Broken Access Control',
    location: 'POST /api/holds/{id}/release',
    description: 'server/routes/holds.ts guards POST /api/holds/:id/release with requireAuth only — releaseHold() in server/services/seatLock.ts deletes the hold row by id with no ownership check. Any signed-in user who obtains another user\'s hold id can free their seats mid-checkout (a real state mutation, not just a read), letting the seats be grabbed by someone else while the original holder believes they are still reserved.',
    evidence: evidenceFrom(releaseHoldAsAttacker, { note: 'POST release as attacker:' }),
    fix: 'In server/routes/holds.ts\'s /holds/:id/release handler, call getHold() first, compare holderId to request.userId, and throw ApiError(\'FORBIDDEN\', ...) before calling releaseHold() on mismatch. Root cause worth fixing at the same time: POST /api/shows/:id/hold (server/routes/shows.ts) currently trusts a client-supplied `holderId` in the request body instead of deriving it from request.userId — CLAUDE.md documents that pattern (deriving userId from the session, never the body) as the norm for confirmBooking/cancelBooking/bookings/me, but the hold-creation route doesn\'t follow it, which is what makes holderId-based ownership checks meaningless without also fixing this.',
  }));
}

// Sanity check the happy path too — if the owner can't read their own
// booking, something is wrong with the harness, not the app.
const getBookingAsOwner = await owner.client.get(`/api/bookings/${booking.id}`);
if (getBookingAsOwner.status !== 200) {
  console.error(`WARNING: owner could not read their own booking (${getBookingAsOwner.status}) — verify BASE_URL/auth before trusting this file's other results.`);
}

writeFindings(findings, out);
console.log(`01-access-control: ${findings.length} finding(s)`);
