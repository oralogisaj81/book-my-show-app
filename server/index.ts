import 'dotenv/config'
import { createApp } from './app'
import { sweepExpiredHolds } from './services/seatLock'

const PORT = Number(process.env.PORT) || 4000

async function main() {
  const app = createApp()

  // Light housekeeping — reads already ignore expired holds, this just keeps the table tidy.
  setInterval(() => {
    sweepExpiredHolds().catch((error) => app.log.error(error, 'Failed to sweep expired holds'))
  }, 10 * 60 * 1000)

  await app.listen({ port: PORT, host: '0.0.0.0' })
}

main().catch((error) => {
  console.error('Failed to start server:', error)
  process.exit(1)
})
