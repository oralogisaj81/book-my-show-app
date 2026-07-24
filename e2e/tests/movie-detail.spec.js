import { test, expect } from '../fixtures/auth.js'
import { findBookableShow } from '../fixtures/api-helpers.js'
import { MovieDetailPage } from '../pages/MovieDetailPage.js'

test.describe('movie detail', () => {
  test('shows the movie info and showtimes grouped by cinema, and a showtime link goes to seat selection', async ({
    user,
  }) => {
    const { movie, show } = await findBookableShow(user.api)
    const detail = new MovieDetailPage(user.page)

    await detail.goto(movie.id)
    await expect(detail.heading).toHaveText(movie.title)
    await expect(detail.showtimeLinks.first()).toBeVisible()

    await detail.pickShowtimeByShowId(show.id)
    await expect(user.page).toHaveURL(`/book/${show.id}`)
  })

  test('an upcoming movie shows "booking opens closer to release" instead of showtimes', async ({ user }) => {
    // Seed data is static and idempotently guarded (server/db/seed.ts skips
    // reseeding an already-seeded DB) — "Inception" is always seeded with
    // status "upcoming", so no shows/showtimes ever exist for it.
    const movies = await (await user.api.get('/api/movies')).json()
    const upcoming = movies.find((m) => m.status === 'upcoming')
    test.skip(!upcoming, 'no upcoming movie in seed data')

    const detail = new MovieDetailPage(user.page)
    await detail.goto(upcoming.id)
    await expect(detail.heading).toHaveText(upcoming.title)
    await expect(user.page.getByText('Booking opens closer to release.')).toBeVisible()
    expect(await detail.showtimeLinks.count()).toBe(0)
  })
})
