export class CheckoutPage {
  constructor(page) {
    this.page = page
    this.cardNumberInput = page.getByPlaceholder('4242 4242 4242 4242')
    this.expiryInput = page.getByPlaceholder('MM/YY')
    this.cvvInput = page.getByPlaceholder('123')
    this.nameInput = page.getByPlaceholder('Full name')
    this.payButton = page.getByRole('button', { name: /^Pay |Confirming/ })
    this.holdTimer = page.locator('.animate-pulse, [class*="border-brand-500/30"]')
  }

  async fillPaymentDetails({ cardNumber = '4242424242424242', expiry = '12/29', cvv = '123', name = 'Test Cardholder' } = {}) {
    await this.cardNumberInput.fill(cardNumber)
    await this.expiryInput.fill(expiry)
    await this.cvvInput.fill(cvv)
    await this.nameInput.fill(name)
  }

  // Waits for POST /api/bookings/confirm to actually resolve, not just for
  // the click's DOM event to dispatch.
  async pay() {
    const response = this.page.waitForResponse(
      (res) => res.request().method() === 'POST' && res.url().includes('/api/bookings/confirm'),
    )
    await this.payButton.click()
    return response
  }
}
