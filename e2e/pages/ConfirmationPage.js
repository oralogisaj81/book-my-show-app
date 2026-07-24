export class ConfirmationPage {
  constructor(page) {
    this.page = page
    this.heading = page.getByRole('heading', { name: 'Booking confirmed!' })
    this.viewBookingsLink = page.getByRole('link', { name: 'View my bookings' })
    this.notFoundMessage = page.getByText('Booking not found.')
  }

  async goto(bookingId) {
    await this.page.goto(`/booking/${bookingId}`)
  }
}
