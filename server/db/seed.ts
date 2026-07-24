import 'dotenv/config'
import { db, pool } from './client'
import { bookings, cinemas, cities, movies, screens, shows, users } from './schema'
import { CINEMAS, CITIES, generateSeedBookings, MOVIES, SCREENS, SEED_DEMAND_USER_ID, SHOWS } from './seed-data'

const CHUNK_SIZE = 500

async function insertInChunks<T extends object>(table: Parameters<typeof db.insert>[0], rows: T[]): Promise<void> {
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    await db.insert(table).values(rows.slice(i, i + CHUNK_SIZE) as never)
  }
}

async function main() {
  const existing = await db.select({ id: cities.id }).from(cities).limit(1)
  if (existing.length > 0) {
    console.log('Database already seeded — skipping. Use a fresh database to reseed.')
    await pool.end()
    return
  }

  console.log('Seeding cities...')
  await db.insert(cities).values(CITIES)

  console.log('Seeding movies...')
  await insertInChunks(movies, MOVIES)

  console.log('Seeding cinemas...')
  await db.insert(cinemas).values(
    CINEMAS.map((cinema) => ({
      id: cinema.id,
      cityId: cinema.cityId,
      name: cinema.name,
      address: cinema.address,
    })),
  )

  console.log('Seeding screens...')
  await insertInChunks(screens, SCREENS)

  console.log('Seeding shows...')
  await insertInChunks(shows, SHOWS)

  console.log('Seeding demand user + historical bookings...')
  await db.insert(users).values({
    id: SEED_DEMAND_USER_ID,
    name: 'Seed Demand',
    email: 'seed-demand@cinehall.internal',
  })
  const seedBookings = generateSeedBookings()
  await insertInChunks(bookings, seedBookings)

  console.log(
    `Seed complete: ${CITIES.length} cities, ${MOVIES.length} movies, ${CINEMAS.length} cinemas, ${SCREENS.length} screens, ${SHOWS.length} shows, ${seedBookings.length} historical bookings.`,
  )
  await pool.end()
}

main().catch((error) => {
  console.error('Seeding failed:', error)
  process.exit(1)
})
