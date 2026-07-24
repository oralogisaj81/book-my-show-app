import { and, eq, gt, sql } from 'drizzle-orm'
import type { SeatHold, SeatState } from '../../shared/types/domain'
import { ApiError } from '../../shared/lib/apiError'
import { generateId } from '../../shared/lib/id'
import { db, type DbExecutor } from '../db/client'
import { seatHolds } from '../db/schema'
import { computeSeatMap } from './seatMap'

const HOLD_DURATION_MS = 5 * 60 * 1000

export interface HoldSeatsResult {
  hold: SeatHold
  seats: SeatState[]
}

export async function holdSeats(showId: string, seatIds: string[], holderId: string): Promise<HoldSeatsResult> {
  if (seatIds.length === 0) {
    throw new ApiError('NO_SEATS_SELECTED', 'Select at least one seat to continue.')
  }

  const hold = await db.transaction(async (tx) => {
    // Serializes hold attempts for THIS show only — different shows proceed fully in parallel,
    // and the lock auto-releases at transaction end. This is what makes a single Postgres
    // table a correct stand-in for a Redis-based lock at this app's scale.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${showId}))`)

    const seatMap = await computeSeatMap(showId, tx)
    const bySeatId = new Map(seatMap.map((s) => [s.seatId, s]))
    const conflicts = seatIds.filter((id) => bySeatId.get(id)?.status !== 'available')
    if (conflicts.length > 0) {
      throw new ApiError('SEATS_UNAVAILABLE', `These seats were just taken: ${conflicts.join(', ')}`)
    }

    const now = new Date()
    const newHold: SeatHold = {
      id: generateId('hold'),
      showId,
      seatIds,
      holderId,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + HOLD_DURATION_MS).toISOString(),
    }
    await tx.insert(seatHolds).values(newHold)
    return newHold
  })

  const seats = await computeSeatMap(showId)
  return { hold, seats }
}

export async function releaseHold(holdId: string): Promise<void> {
  await db.delete(seatHolds).where(eq(seatHolds.id, holdId))
}

export async function getHold(holdId: string): Promise<SeatHold | undefined> {
  const [row] = await db
    .select()
    .from(seatHolds)
    .where(and(eq(seatHolds.id, holdId), gt(seatHolds.expiresAt, sql`now()`)))
    .limit(1)
  return row
}

/** Consumes (deletes) a still-valid hold within the given transaction, returning it — used when finalizing a booking. */
export async function consumeHold(executor: DbExecutor, holdId: string): Promise<SeatHold | undefined> {
  const [row] = await executor
    .select()
    .from(seatHolds)
    .where(and(eq(seatHolds.id, holdId), gt(seatHolds.expiresAt, sql`now()`)))
    .for('update')
    .limit(1)
  if (!row) return undefined
  await executor.delete(seatHolds).where(eq(seatHolds.id, holdId))
  return row
}

/** Light housekeeping — deletes long-expired hold rows. Not required for correctness (reads already filter on expiresAt), just table hygiene. */
export async function sweepExpiredHolds(): Promise<void> {
  await db.execute(sql`delete from ${seatHolds} where ${seatHolds.expiresAt} < now() - interval '1 hour'`)
}
