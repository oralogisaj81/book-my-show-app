import 'dotenv/config'
import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from './schema'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set')
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL })
export const db = drizzle(pool, { schema })

/** Accepts either the top-level db client or a transaction handle from db.transaction(...). */
export type DbExecutor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0]
