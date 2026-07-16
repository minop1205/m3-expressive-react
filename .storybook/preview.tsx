import type { Preview, Decorator } from '@storybook/react'
import React from 'react'
import isChromatic from 'chromatic/isChromatic'
// Roboto (Storybook preview only). Library consumers load Roboto themselves —
// see README. Weights 400 (regular) / 500 (medium) are the only ones the
// typescale tokens use.
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import { ThemeProvider } from '../src/theme/ThemeProvider'
import '../src/styles/tokens.css'
import '../src/styles/typescale.css'
import './preview.css'

// Chromatic pauses CSS animations automatically but NOT rAF-driven ones.
// Our animated components honor prefers-reduced-motion, so emulate it in
// Chromatic's capture browsers to freeze JS animations deterministically.
if (isChromatic() && typeof window !== 'undefined') {
  const originalMatchMedia = window.matchMedia.bind(window)
  window.matchMedia = (query: string): MediaQueryList => {
    const mql = originalMatchMedia(query)
    if (!query.includes('prefers-reduced-motion')) return mql
    return {
      matches: true,
      media: mql.media,
      onchange: null,
      addListener: mql.addListener.bind(mql),
      removeListener: mql.removeListener.bind(mql),
      addEventListener: mql.addEventListener.bind(mql),
      removeEventListener: mql.removeEventListener.bind(mql),
      dispatchEvent: mql.dispatchEvent.bind(mql),
    }
  }
}

const withTheme: Decorator = (Story, context) => {
  const mode = context.globals.colorScheme === 'dark' ? 'dark' : 'light'
  const seed = context.globals.seedColor ?? '#6750A4'
  return (
    <ThemeProvider seedColor={seed} mode={mode}>
      {/* color must be set here (inside ThemeProvider) — the --md-sys-color-*
          vars live on ThemeProvider's div, so the body-level rule in
          preview.css can't resolve them and currentColor icons stayed black
          in dark mode. */}
      <div
        style={{
          padding: 24,
          background: 'var(--md-sys-color-background)',
          color: 'var(--md-sys-color-on-background)',
          minHeight: '100vh',
        }}
      >
        <Story />
      </div>
    </ThemeProvider>
  )
}

const preview: Preview = {
  decorators: [withTheme],
  globalTypes: {
    colorScheme: {
      description: 'Light / dark mode',
      defaultValue: 'light',
      toolbar: {
        title: 'Mode',
        icon: 'mirror',
        items: ['light', 'dark'],
        dynamicTitle: true,
      },
    },
    seedColor: {
      description: 'Dynamic Color seed',
      defaultValue: '#6750A4',
      toolbar: {
        title: 'Seed',
        icon: 'paintbrush',
        items: [
          { value: '#6750A4', title: 'Baseline purple' },
          { value: '#386A20', title: 'Green' },
          { value: '#8C4A60', title: 'Rose' },
          { value: '#00639B', title: 'Blue' },
          { value: '#825500', title: 'Amber' },
        ],
        dynamicTitle: true,
      },
    },
  },
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    // Snapshot every story in both color schemes. Each mode sets the
    // `colorScheme` global, which the withTheme decorator feeds into
    // ThemeProvider. Seed-color modes are deliberately left out to keep the
    // snapshot count at 2x (add them per-story if a component needs it).
    chromatic: {
      modes: {
        light: { colorScheme: 'light' },
        dark: { colorScheme: 'dark' },
      },
    },
  },
}

export default preview
