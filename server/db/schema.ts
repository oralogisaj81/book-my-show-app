import { boolean, doublePrecision, integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import type { CastMember, ScreenLayout, TierBreakdownEntry } from '../../shared/types/domain'

export const cities = pgTable('cities', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  state: text('state').notNull(),
})

export const movies = pgTable('movies', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  synopsis: text('synopsis').notNull(),
  genres: jsonb('genres').$type<string[]>().notNull(),
  languages: jsonb('languages').$type<string[]>().notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  certification: text('certification').notNull(),
  rating: doublePrecision('rating').notNull(),
  releaseDate: text('release_date').notNull(),
  status: text('status').$type<'now-showing' | 'upcoming'>().notNull(),
  posterUrl: text('poster_url').notNull(),
  backdropUrl: text('backdrop_url').notNull(),
  director: text('director').notNull(),
  cast: jsonb('cast').$type<CastMember[]>().notNull(),
})

export const cinemas = pgTable('cinemas', {
  id: text('id').primaryKey(),
  cityId: text('city_id')
    .notNull()
    .references(() => cities.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  address: text('address').notNull(),
})

export const screens = pgTable('screens', {
  id: text('id').primaryKey(),
  cinemaId: text('cinema_id')
    .notNull()
    .references(() => cinemas.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  layout: jsonb('layout').$type<ScreenLayout>().notNull(),
  features: jsonb('features').$type<string[]>().notNull(),
})

export const shows = pgTable('shows', {
  id: text('id').primaryKey(),
  movieId: text('movie_id')
    .notNull()
    .references(() => movies.id, { onDelete: 'cascade' }),
  cinemaId: text('cinema_id')
    .notNull()
    .references(() => cinemas.id, { onDelete: 'cascade' }),
  screenId: text('screen_id')
    .notNull()
    .references(() => screens.id, { onDelete: 'cascade' }),
  startTime: timestamp('start_time', { withTimezone: true, mode: 'string' }).notNull(),
  language: text('language').notNull(),
  format: text('format').notNull(),
  priceOverrides: jsonb('price_overrides').$type<Record<string, number>>().notNull(),
})

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  // Nullable: pre-auth rows (e.g. the seed-demand user, which never logs in) have none.
  passwordHash: text('password_hash'),
  passwordSalt: text('password_salt'),
  isAdmin: boolean('is_admin').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
})

export const seatHolds = pgTable('seat_holds', {
  id: text('id').primaryKey(),
  showId: text('show_id')
    .notNull()
    .references(() => shows.id, { onDelete: 'cascade' }),
  seatIds: jsonb('seat_ids').$type<string[]>().notNull(),
  holderId: text('holder_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }).notNull(),
})

export const bookings = pgTable('bookings', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  showId: text('show_id')
    .notNull()
    .references(() => shows.id, { onDelete: 'cascade' }),
  seatIds: jsonb('seat_ids').$type<string[]>().notNull(),
  tierBreakdown: jsonb('tier_breakdown').$type<TierBreakdownEntry[]>().notNull(),
  subtotal: integer('subtotal').notNull(),
  convenienceFee: integer('convenience_fee').notNull(),
  total: integer('total').notNull(),
  status: text('status').$type<'confirmed' | 'cancelled'>().notNull(),
  qrPayload: text('qr_payload').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true, mode: 'string' }),
})
