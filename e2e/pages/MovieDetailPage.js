export class MovieDetailPage {
  constructor(page) {
    this.page = page
    this.heading = page.getByRole('heading', { level: 1 })
    this.showtimeLinks = page.locator('a[href^="/book/"]')
    this.noShowtimesMessage = page.getByText('No showtimes available in this city right now.')
  }

  async goto(movieId) {
    await this.page.goto(`/movies/${movieId}`)
  }

  async pickFirstShowtime() {
    await this.showtimeLinks.first().waitFor({ state: 'visible' })
    await this.showtimeLinks.first().click()
  }

  async pickShowtimeByShowId(showId) {
    await this.page.locator(`a[href="/book/${showId}"]`).click()
  }
}
