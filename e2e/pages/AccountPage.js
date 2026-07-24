export class AccountPage {
  constructor(page) {
    this.page = page
    this.activeTab = page.getByRole('button', { name: 'My bookings' })
    this.cancelledTab = page.getByRole('button', { name: 'Cancelled' })
    // TicketCard's own root className — no test-id in the markup, this is the
    // most stable anchor available for "one booking row" as a unit.
    this.cardRoot = 'div.rounded-2xl.border.border-ink-700.bg-ink-850\\/40'
    this.emptyState = page.getByText(/haven.t booked|No cancelled bookings/i)
  }

  async goto() {
    await this.page.goto('/account')
  }

  cardForMovie(movieTitle) {
    return this.page.locator(this.cardRoot).filter({ hasText: movieTitle })
  }

  // Worker-scoped test identities (see fixtures/auth.js) can end up with more
  // than one booking for the same movie across different tests in one
  // worker — filtering by the booked seat label too (TicketCard renders
  // "Seats A1, A2 · ...") disambiguates a specific booking, not just "some
  // card mentioning this movie."
  cardForBooking(movieTitle, seatId) {
    return this.page.locator(this.cardRoot).filter({ hasText: movieTitle }).filter({ hasText: seatId })
  }

  cancelButtonForCard(card) {
    return card.getByRole('button', { name: /^Cancel$/ })
  }

  async cancelBooking(card) {
    const response = this.page.waitForResponse(
      (res) => res.request().method() === 'POST' && res.url().includes('/cancel'),
    )
    await this.cancelButtonForCard(card).click()
    return response
  }
}
