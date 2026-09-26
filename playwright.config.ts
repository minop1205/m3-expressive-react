import { defineConfig } from '@playwright/test'

/**
 * Visual regression testing config (issue #112 — Chromatic replacement).
 *
 * Baselines live in vrt/__screenshots__/ and are CANONICAL FOR THE GITHUB
 * ACTIONS RUNNER: they are generated and updated ONLY by the
 * `update-vrt-baselines` PR label (see .github/workflows/vrt.yml), never
 * from a dev machine. Even the official Playwright Docker image is only an
 * approximation — its emoji/symbol fallback fonts differ from the runner's
 * (observed: ~12/350 glyph diffs in stories using emoji icons and "→"),
 * so use Docker to eyeball changes locally, and the label to update.
 */
export default defineConfig({
  testDir: './vrt',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [['list'], ['html', { outputFolder: 'vrt-report', open: 'never' }]]
    : [['list']],
  // One flat folder, no platform suffix (Linux-canonical, see above).
  snapshotPathTemplate: '{testDir}/__screenshots__/{arg}{ext}',
  expect: {
    toHaveScreenshot: {
      // Freeze CSS animations/transitions at capture; rAF-driven motion is
      // frozen via prefers-reduced-motion (components honor it).
      animations: 'disabled',
      // Per-pixel YIQ tolerance (Playwright default). No diff pixels allowed
      // beyond it — runs compare Linux-to-Linux so drift means a real change.
      threshold: 0.2,
    },
  },
  use: {
    baseURL: 'http://127.0.0.1:6906',
    viewport: { width: 1200, height: 800 },
    reducedMotion: 'reduce',
    deviceScaleFactor: 1,
  },
  webServer: {
    command: 'node scripts/serve-static.mjs storybook-static 6906',
    url: 'http://127.0.0.1:6906/index.json',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
})
