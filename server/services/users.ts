import { eq } from 'drizzle-orm'
import type { UserProfile } from '../../shared/types/domain'
import { db } from '../db/client'
import { users } from '../db/schema'

export type UserRow = typeof users.$inferSelect

export async function findByEmail(email: string): Promise<UserRow | undefined> {
  const [row] = await db.select().from(users).where(eq(users.email, email)).limit(1)
  return row
}

export async function findById(id: string): Promise<UserRow | undefined> {
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1)
  return row
}

export async function createUser(input: {
  id: string
  name: string
  email: string
  passwordHash: string
  passwordSalt: string
}): Promise<UserRow> {
  const [row] = await db.insert(users).values(input).returning()
  return row
}

/** Never send passwordHash/passwordSalt to the client. */
export function toPublicUser(row: UserRow): UserProfile {
  return { id: row.id, name: row.name, email: row.email, isAdmin: row.isAdmin, createdAt: row.createdAt }
}
