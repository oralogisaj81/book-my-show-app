#!/usr/bin/env node
// Creates the shared identity pool once per suite run and writes it to
// --out as JSON, so individual test files can hydrate a ready-to-use
// identity instead of each calling POST /api/auth/signup itself.
//
// This matters because /api/auth/signup is rate-limited to 10 requests per
// 15 minutes, keyed by IP+email (server/routes/auth.ts's AUTH_RATE_LIMIT) —
// with 8 test files, several of which legitimately need 2+ identities
// (category 1's owner+attacker, category 2's admin+non-admin), calling
// createTestIdentity fresh in every file would blow through that budget
// well before the suite finishes and look like random 429s rather than the
// real behavior it is. Only the handful of checks that are specifically
// *about* a fresh registration call (mass-assignment, duplicate-email,
// malformed-body probes) still call the signup endpoint directly from
// their own test file — everything else reuses one of these three.
import { createTestIdentity, serializeIdentity } from './auth.js';
import { promoteToAdmin, closeDbPool } from './db.js';
import fs from 'node:fs';
import path from 'node:path';

const baseUrl = process.argv.includes('--base-url')
  ? process.argv[process.argv.indexOf('--base-url') + 1]
  : (process.env.BASE_URL || 'http://localhost:4000');
const out = process.argv.includes('--out')
  ? process.argv[process.argv.indexOf('--out') + 1]
  : null;
if (!out) throw new Error('missing --out <path>');

const owner = await createTestIdentity(baseUrl, { namePrefix: 'sec-owner' });
const attacker = await createTestIdentity(baseUrl, { namePrefix: 'sec-attacker' });
const admin = await createTestIdentity(baseUrl, { namePrefix: 'sec-admin' });
await promoteToAdmin(admin.email);
await closeDbPool();

const pool = {
  owner: serializeIdentity(owner),
  attacker: serializeIdentity(attacker),
  admin: serializeIdentity(admin),
};

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(pool, null, 2));
console.log(`setup: created 3 shared identities (owner, attacker, admin) -> ${out}`);
