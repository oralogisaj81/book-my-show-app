export class AdminTheatersPage {
  constructor(page) {
    this.page = page
    this.addCinemaButton = page.getByRole('button', { name: 'Add cinema' })
    this.saveCinemaButton = page.getByRole('button', { name: /Save cinema|Saving/ })
    this.nameInput = page.getByPlaceholder(/Aurora Cineplex/)
    this.addressInput = page.getByPlaceholder('Street, area, city')
    this.citySelect = page.locator('select')
    this.deleteConfirmButton = page.getByRole('button', { name: 'Delete' })
  }

  async goto() {
    await this.page.goto('/admin/theaters')
  }

  row(cinemaName) {
    return this.page.locator('tbody tr', { hasText: cinemaName })
  }

  async openAddCinemaForm() {
    await this.addCinemaButton.click()
  }

  async fillCinemaForm({ name, address, cityName }) {
    if (name !== undefined) await this.nameInput.fill(name)
    if (address !== undefined) await this.addressInput.fill(address)
    if (cityName !== undefined) await this.citySelect.selectOption({ label: cityName })
  }

  // Waits for the PUT /api/admin/cinemas the save button triggers, not just
  // the click's own DOM event.
  async saveCinema() {
    const response = this.page.waitForResponse(
      (res) => res.request().method() === 'PUT' && res.url().includes('/api/admin/cinemas'),
    )
    await this.saveCinemaButton.click()
    return response
  }

  async createCinema({ name, address, cityName }) {
    await this.openAddCinemaForm()
    await this.fillCinemaForm({ name, address, cityName })
    return this.saveCinema()
  }

  async openEditForm(cinemaName) {
    await this.row(cinemaName).getByRole('button').nth(1).click()
  }

  async openDeleteConfirm(cinemaName) {
    await this.row(cinemaName).getByRole('button').nth(2).click()
  }

  async confirmDelete() {
    const response = this.page.waitForResponse(
      (res) => res.request().method() === 'DELETE' && res.url().includes('/api/admin/cinemas/'),
    )
    await this.deleteConfirmButton.click()
    return response
  }
}
