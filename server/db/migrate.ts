import 'dotenv/config'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { db, pool } from './client'

async function main() {
  console.log('Running migrations...')
  await migrate(db, { migrationsFolder: './drizzle' })
  console.log('Migrations complete.')
  await pool.end()
}

main().catch((error) => {
  console.error('Migration failed:', error)
  process.exit(1)
})
