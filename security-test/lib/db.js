// Direct Postgres access for the one thing this app's API deliberately has
// no endpoint for: promoting a user to admin (CLAUDE.md — "There's no
// seeded admin — promote an account after signup with npm run
// admin:promote"). Mirrors e2e/fixtures/db.js's promoteToAdmin exactly,
// including its choice to read .env.test directly rather than the app's
// default `.env` lookup — this suite is meant to run against the same
// disposable Neon branch the e2e/load-test suites use, never the developer's
// real local/dev database, since it creates throwaway accounts and at least
// one real booking per run.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envTestPath = path.join(__dirname, '..', '..', '.env.test');

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const line = fs
    .readFileSync(envTestPath, 'utf8')
    .split('\n')
    .find((l) => l.startsWith('DATABASE_URL='));
  if (!line) throw new Error('DATABASE_URL not found in .env.test (and not set in the environment)');
  return line.slice('DATABASE_URL='.length).trim();
}

let pool;
function getPool() {
  if (!pool) pool = new pg.Pool({ connectionString: loadDatabaseUrl() });
  return pool;
}

export async function promoteToAdmin(email) {
  const result = await getPool().query('UPDATE users SET is_admin = true WHERE email = $1 RETURNING id', [
    email.toLowerCase(),
  ]);
  if (result.rowCount === 0) throw new Error(`promoteToAdmin: no user found for ${email}`);
}

export async function closeDbPool() {
  if (pool) await pool.end();
}
