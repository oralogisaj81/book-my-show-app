// Direct Postgres access against the e2e test database (.env.test), for the
// two things the app's own API deliberately has no endpoint for:
// promoting a user to admin (only `npm run admin:promote` does that, and
// shelling out per-test is slower and harder to isolate than a raw UPDATE)
// and forcing a seat hold to expire (the app's HOLD_DURATION_MS is 5
// minutes — waiting for it in real time would make the lifecycle spec
// prohibitively slow).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envTestPath = path.join(__dirname, '..', '..', '.env.test')

function loadDatabaseUrl() {
  const line = fs
    .readFileSync(envTestPath, 'utf8')
    .split('\n')
    .find((l) => l.startsWith('DATABASE_URL='))
  if (!line) throw new Error('DATABASE_URL not found in .env.test')
  return line.slice('DATABASE_URL='.length).trim()
}

const pool = new pg.Pool({ connectionString: loadDatabaseUrl() })

export async function promoteToAdmin(email) {
  const result = await pool.query('UPDATE users SET is_admin = true WHERE email = $1 RETURNING id', [
    email.toLowerCase(),
  ])
  if (result.rowCount === 0) throw new Error(`promoteToAdmin: no user found for ${email}`)
}

export async function expireHold(holdId) {
  const result = await pool.query("UPDATE seat_holds SET expires_at = now() - interval '1 minute' WHERE id = $1", [
    holdId,
  ])
  if (result.rowCount === 0) throw new Error(`expireHold: no hold found for ${holdId}`)
}

export async function closeDbPool() {
  await pool.end()
}
