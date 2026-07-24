export class HomePage {
  constructor(page) {
    this.page = page
    this.citySwitcherButton = page.locator('header button', { hasText: /Select city|Mumbai|Delhi|Bengaluru|Hyderabad/ }).first()
    this.searchInput = page.getByPlaceholder('Search movies...')
    this.nowShowingTab = page.getByRole('button', { name: 'Now Showing' })
    this.upcomingTab = page.getByRole('button', { name: 'Upcoming' })
    // Scoped to MovieGrid's own container class, not just `a[href^="/movies/"]`
    // — FeaturedHero (rendered above the grid) has its own "Book tickets"
    // link to a movie detail page, which matches that broader selector too
    // but has no <h3> inside it, so an unscoped .first().locator('h3') can
    // resolve to the hero link and hang forever waiting for an <h3> that
    // will never appear there.
    this.movieGrid = page.locator('div.grid.grid-cols-2.gap-4 > a[href^="/movies/"]')
  }

  async goto() {
    await this.page.goto('/')
  }

  async openCitySwitcher() {
    await this.citySwitcherButton.click()
  }

  async selectCity(cityName) {
    await this.openCitySwitcher()
    await this.page.getByRole('button', { name: cityName, exact: true }).click()
  }

  // The navbar search box (visible at the default Desktop Chrome viewport
  // width used by this suite) only filters on submit — it navigates to
  // `/?q=...`, which HomePage reads via useSearchParams — unlike the
  // mobile-only SearchBar component, which filters on every keystroke.
  async search(query) {
    await this.searchInput.fill(query)
    await this.searchInput.press('Enter')
  }

  movieCard(title) {
    return this.page.getByRole('link', { name: new RegExp(title) })
  }

  async openMovie(title) {
    await this.movieCard(title).click()
  }
}
