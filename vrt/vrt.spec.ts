/**
 * Visual regression suite: every Storybook story × light/dark, screenshotted
 * against a built Storybook (`npm run build-storybook` first). Replaces
 * Chromatic (issue #112) — every new story keeps doubling as a VRT case.
 *
 * Determinism measures:
 * - `reducedMotion: 'reduce'` context (config) freezes rAF-driven animation
 *   (components honor prefers-reduced-motion) and `animations: 'disabled'`
 *   freezes CSS animation/transition at capture time.
 * - `window.__VRT__` is set before the preview loads; .storybook/preview.tsx
 *   freezes the clock (MockDate) under that flag so date-dependent stories
 *   (DatePicker's "today") never drift.
 * - Fonts are awaited via document.fonts.ready before capture.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test, expect } from '@playwright/test'

interface IndexEntry {
  id: string
  type: 'story' | 'docs'
  title: string
  name: string
}

// cwd-relative (npm scripts run at the package root); __dirname is
// unavailable when Playwright compiles the spec as ESM.
const indexPath = join(process.cwd(), 'storybook-static', 'index.json')
let entries: Record<string, IndexEntry>
try {
  entries = JSON.parse(readFileSync(indexPath, 'utf8')).entries
} catch {
  throw new Error(
    `Could not read ${indexPath} — run \`npm run build-storybook\` before \`npm run vrt\`.`,
  )
}

const stories = Object.values(entries).filter((e) => e.type === 'story')
const schemes = ['light', 'dark'] as const

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    ;(window as unknown as { __VRT__?: boolean }).__VRT__ = true
  })
})

for (const story of stories) {
  for (const scheme of schemes) {
    test(`${story.id} [${scheme}]`, async ({ page }) => {
      await page.goto(
        `/iframe.html?viewMode=story&id=${encodeURIComponent(story.id)}&globals=colorScheme:${scheme}`,
      )
      // Story rendered (root populated) and web fonts settled.
      await page.waitForSelector('#storybook-root :first-child', { state: 'attached' })
      await page.evaluate(() => document.fonts.ready)
      // One settle tick for portal-mounted content and initial effects.
      await page.waitForTimeout(150)
      await expect(page).toHaveScreenshot(`${story.id}--${scheme}.png`, {
        fullPage: true,
      })
    })
  }
}
