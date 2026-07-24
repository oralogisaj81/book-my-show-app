import 'dotenv/config'
import { eq } from 'drizzle-orm'
import { db, pool } from '../db/client'
import { users } from '../db/schema'

async function main() {
  const email = process.argv[2]?.trim().toLowerCase()
  if (!email) {
    console.error('Usage: npm run admin:promote -- <email>')
    process.exit(1)
  }

  const [updated] = await db.update(users).set({ isAdmin: true }).where(eq(users.email, email)).returning()

  if (!updated) {
    console.error(`No account found for ${email}. Sign up through the app first, then run this again.`)
    process.exitCode = 1
  } else {
    console.log(`${updated.email} is now an admin.`)
  }

  await pool.end()
}

main().catch((error) => {
  console.error('Failed to promote user:', error)
  process.exit(1)
})
