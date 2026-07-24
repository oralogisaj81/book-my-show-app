import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import { defineConfig, devices } from '@playwright/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

// The app's own dotenv/config call defaults to `.env` (the developer's local/dev
// database). The e2e suite must never touch that DB, so it loads `.env.test`
// (a separate Neon branch) explicitly and passes it to the spawned server
// processes via `env`, rather than relying on the default `.env` lookup.
const envTestPath = path.join(repoRoot, '.env.test')
const testEnv = Object.fromEntries(
  fs
    .readFileSync(envTestPath, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const idx = line.indexOf('=')
      return [line.slice(0, idx), line.slice(idx + 1)]
    }),
)

const FRONTEND_URL = 'http://localhost:5173'
const BACKEND_URL = 'http://localhost:4000'

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  outputDir: path.join(__dirname, 'test-results'),
  forbidOnly: !!process.env.CI,
  // One retry locally as a safety net for rare backend hiccups under load, not a
  // substitute for fixing a real, reproducible failure.
  retries: process.env.CI ? 2 : 1,
  timeout: 60_000,
  reporter: process.env.CI
    ? [['github'], ['html', { outputFolder: 'playwright-report', open: 'never' }]]
    : [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: FRONTEND_URL,
    headless: !!process.env.CI || process.env.E2E_HEADLESS === '1',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // A local dev backend with a default pg Pool is not a scaled environment —
  // cap workers rather than letting Playwright default to one per CPU core.
  // Serial (1) rather than the usual 3-4-local guidance for two compounding,
  // app-specific reasons observed running this suite: (1) /api/auth/signup
  // is rate-limited to 10 req/15min (server/routes/auth.ts) and each worker
  // creates its own `user`/`admin` identity once (fixtures/auth.js), so
  // worker count directly multiplies real signup calls against that budget;
  // (2) a worker crash/recycle re-runs that worker-scoped fixture and gets a
  // *new* incrementing workerIndex rather than reusing the old one, so any
  // instability under multi-worker CPU contention on a dev machine snowballs
  // into extra signups that then trip the real rate limit. Serial execution
  // is slower but was the only configuration that didn't cascade.
  workers: 1,
  webServer: [
    {
      // Backend only (not `npm run dev`, which bundles both processes under
      // `concurrently` and would give this config only one URL to poll).
      command: 'npx tsx watch server/index.ts',
      cwd: repoRoot,
      env: { ...testEnv, PORT: '4000', NODE_ENV: 'development' },
      url: `${BACKEND_URL}/api/cities`,
      timeout: 60_000,
      reuseExistingServer: false,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'npx vite',
      cwd: repoRoot,
      url: FRONTEND_URL,
      timeout: 60_000,
      reuseExistingServer: false,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
})
