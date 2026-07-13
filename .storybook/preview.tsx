import type { Preview, Decorator } from '@storybook/react'
import React from 'react'
// Roboto (Storybook preview only). Library consumers load Roboto themselves —
// see README. Weights 400 (regular) / 500 (medium) are the only ones the
// typescale tokens use.
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import { ThemeProvider } from '../src/theme/ThemeProvider'
import '../src/styles/tokens.css'
import '../src/styles/typescale.css'
import './preview.css'

const withTheme: Decorator = (Story, context) => {
  const mode = context.globals.colorScheme === 'dark' ? 'dark' : 'light'
  const seed = context.globals.seedColor ?? '#6750A4'
  return (
    <ThemeProvider seedColor={seed} mode={mode}>
      <div style={{ padding: 24, background: 'var(--md-sys-color-background)', minHeight: '100vh' }}>
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
  },
}

export default preview
