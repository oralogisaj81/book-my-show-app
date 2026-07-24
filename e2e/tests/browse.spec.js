import { test, expect } from '../fixtures/auth.js'
import { HomePage } from '../pages/HomePage.js'

test.describe('browse / search / filter', () => {
  test('the landing page renders the movie grid without erroring', async ({ user }) => {
    const home = new HomePage(user.page)
    await home.goto()
    // locator.count() has no auto-wait — force a wait for the first card
    // before reading the count (the fetch chain is city -> movies-for-city).
    await home.movieGrid.first().waitFor({ state: 'visible' })
    expect(await home.movieGrid.count()).toBeGreaterThan(0)
  })

  test('free-text search narrows to matching titles, and clears the previous list first', async ({ user }) => {
    const home = new HomePage(user.page)
    await home.goto()
    await home.movieGrid.first().waitFor({ state: 'visible' })

    const firstTitle = await home.movieGrid.first().locator('h3').innerText()
    const fragment = firstTitle.split(' ')[0]

    await home.search(fragment)
    await expect(home.movieGrid.first()).toBeVisible()
    const titles = await home.movieGrid.locator('h3').allInnerTexts()
    expect(titles.length).toBeGreaterThan(0)
    for (const title of titles) {
      expect(title.toLowerCase()).toContain(fragment.toLowerCase())
    }
  })

  test('an unmatched search shows the empty state, not a stale previous list', async ({ user }) => {
    const home = new HomePage(user.page)
    await home.goto()
    await home.movieGrid.first().waitFor({ state: 'visible' })

    await home.search('zzz-no-such-movie-should-ever-match-xyz')
    await expect(user.page.getByText('No movies found')).toBeVisible()
    expect(await home.movieGrid.count()).toBe(0)
  })

  test('now showing vs upcoming tabs show different catalogs', async ({ user }) => {
    const home = new HomePage(user.page)
    await home.goto()
    await home.movieGrid.first().waitFor({ state: 'visible' })
    const nowShowingHrefs = await home.movieGrid.evaluateAll((els) => els.map((el) => el.getAttribute('href')))

    // Tab filtering is a synchronous client-side re-render (the movie list
    // itself was already fetched, filtered in-memory by status) — no network
    // wait needed, but expect.poll rides out React's own render tick.
    await home.upcomingTab.click()
    await expect
      .poll(() => home.movieGrid.evaluateAll((els) => els.map((el) => el.getAttribute('href'))))
      .not.toEqual(nowShowingHrefs)
  })

  test('switching city updates the active city label', async ({ user }) => {
    const home = new HomePage(user.page)
    await home.goto()
    await expect(user.page.getByRole('button', { name: 'Mumbai' })).toBeVisible()

    await home.selectCity('Delhi NCR')
    await expect(user.page.getByRole('button', { name: 'Delhi NCR' })).toBeVisible()
  })
})
