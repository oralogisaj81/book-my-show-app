export class SeatSelectionPage {
  constructor(page) {
    this.page = page
    this.proceedButton = page.getByRole('button', { name: /Proceed to pay|Holding seats/ })
    this.error = page.locator('p.text-red-400')
  }

  async goto(showId) {
    await this.page.goto(`/book/${showId}`)
  }

  seat(seatId) {
    return this.page.getByTitle(new RegExp(`^Seat ${seatId}(\\s|$)`))
  }

  async selectSeat(seatId) {
    await this.seat(seatId).click()
  }

  // The click itself only waits for the DOM event — the POST /hold it
  // triggers resolves separately, so the wait is built into this action
  // rather than left for a caller to remember.
  async proceed() {
    const response = this.page.waitForResponse(
      (res) => res.request().method() === 'POST' && res.url().includes('/hold'),
    )
    await this.proceedButton.click()
    return response
  }
}
