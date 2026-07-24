import { test, expect } from '../fixtures/auth.js'
import { getCities } from '../fixtures/api-helpers.js'
import { AdminTheatersPage } from '../pages/AdminTheatersPage.js'

function uniqueCinemaName(prefix) {
  return `${prefix} ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

test.describe('admin: theaters CRUD', () => {
  test('create a cinema through the real form, and it is actually visible via the API afterward', async ({
    admin,
  }) => {
    const cities = await getCities(admin.api)
    const name = uniqueCinemaName('E2E Cinema Create')
    const theaters = new AdminTheatersPage(admin.page)

    await theaters.goto()
    const response = await theaters.createCinema({ name, address: '1 E2E Test Street', cityName: cities[0].name })
    expect(response.status()).toBe(200)
    await expect(theaters.row(name)).toBeVisible()

    // Not just "the create call returned 200" — re-fetch independently.
    const cinemasAfter = await (await admin.api.get('/api/admin/cinemas')).json()
    const created = cinemasAfter.find((c) => c.name === name)
    expect(created).toBeTruthy()
    expect(created.address).toBe('1 E2E Test Street')

    // Clean up: this suite runs against a persistent shared database, not a
    // per-run disposable one, so tests that create admin resources delete
    // their own afterward instead of accumulating cinemas run over run.
    await admin.api.delete(`/api/admin/cinemas/${created.id}`)
  })

  test('edit an existing cinema through the real form, and the change persists on re-fetch', async ({ admin }) => {
    const cities = await getCities(admin.api)
    const originalName = uniqueCinemaName('E2E Cinema Edit')
    const updatedName = `${originalName} (updated)`
    const theaters = new AdminTheatersPage(admin.page)

    await theaters.goto()
    await theaters.createCinema({ name: originalName, address: 'Original Address', cityName: cities[0].name })
    await expect(theaters.row(originalName)).toBeVisible()

    await theaters.openEditForm(originalName)
    await theaters.fillCinemaForm({ name: updatedName, address: 'Updated Address' })
    const saveResponse = await theaters.saveCinema()
    expect(saveResponse.status()).toBe(200)
    await expect(theaters.row(updatedName)).toBeVisible()

    const cinemasAfter = await (await admin.api.get('/api/admin/cinemas')).json()
    const updated = cinemasAfter.find((c) => c.name === updatedName)
    expect(updated).toBeTruthy()
    expect(updated.address).toBe('Updated Address')
    expect(cinemasAfter.find((c) => c.name === originalName)).toBeFalsy()

    await admin.api.delete(`/api/admin/cinemas/${updated.id}`)
  })

  test('delete a cinema through the real form, and it is actually gone via the API afterward', async ({ admin }) => {
    const cities = await getCities(admin.api)
    const name = uniqueCinemaName('E2E Cinema Delete')
    const theaters = new AdminTheatersPage(admin.page)

    await theaters.goto()
    await theaters.createCinema({ name, address: 'Delete Me Street', cityName: cities[0].name })
    await expect(theaters.row(name)).toBeVisible()

    await theaters.openDeleteConfirm(name)
    const deleteResponse = await theaters.confirmDelete()
    expect(deleteResponse.status()).toBe(204)
    await expect(theaters.row(name)).not.toBeVisible()

    const cinemasAfter = await (await admin.api.get('/api/admin/cinemas')).json()
    expect(cinemasAfter.find((c) => c.name === name)).toBeFalsy()
  })

  test('a non-admin user cannot reach the theaters admin page', async ({ user }) => {
    await user.page.goto('/admin/theaters')
    await expect(user.page).toHaveURL('/')
  })
})
