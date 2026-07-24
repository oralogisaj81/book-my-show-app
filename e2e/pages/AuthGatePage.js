// The app's `AuthGate` is a full-screen modal App.tsx renders whenever
// `authStore.status === 'unauthenticated'` — it covers the entire viewport
// (`fixed inset-0 z-[100]`), so an anonymous visitor cannot reach any route
// underneath it, not just the booking flow. There's no separate /login route.
export class AuthGatePage {
  constructor(page) {
    this.page = page
    this.heading = page.getByRole('heading', { name: 'Welcome to CineHall' })
    // Scoped to the <Tabs> pill container — the submit button also renders the
    // literal text "Sign in" while in sign-in mode, so an unscoped
    // getByRole('button', { name: 'Sign in', exact: true }) would match both
    // and throw a strict-mode violation.
    const tabs = page.locator('div.rounded-full.bg-ink-800')
    this.signInTab = tabs.getByRole('button', { name: 'Sign in', exact: true })
    this.signUpTab = tabs.getByRole('button', { name: 'Sign up', exact: true })
    this.nameInput = page.getByPlaceholder('Your name')
    this.emailInput = page.getByPlaceholder('Email')
    this.passwordInput = page.getByPlaceholder(/^Password/)
    this.confirmPasswordInput = page.getByPlaceholder('Confirm password')
    this.error = page.locator('form p.text-red-400')
  }

  async waitFor() {
    await this.heading.waitFor({ state: 'visible' })
  }

  async signIn({ email, password }) {
    await this.signInTab.click()
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    const response = this.page.waitForResponse(
      (res) => res.request().method() === 'POST' && res.url().includes('/api/auth/login'),
    )
    await this.page.locator('form button[type="submit"]').click()
    return response
  }

  async signUp({ name, email, password }) {
    await this.signUpTab.click()
    await this.nameInput.fill(name)
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.confirmPasswordInput.fill(password)
    const response = this.page.waitForResponse(
      (res) => res.request().method() === 'POST' && res.url().includes('/api/auth/signup'),
    )
    await this.page.locator('form button[type="submit"]').click()
    return response
  }
}
