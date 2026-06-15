import type { Meta, StoryObj } from '@storybook/react'

const meta: Meta = { title: 'Foundations/Shape & Elevation' }
export default meta
type Story = StoryObj

const SHAPES = [
  'none',
  'extra-small',
  'small',
  'medium',
  'large',
  'large-increased',
  'extra-large',
  'extra-large-increased',
  'extra-extra-large',
  'full',
] as const

const LEVELS = [0, 1, 2, 3, 4, 5] as const

export const Shape: Story = {
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: 16,
      }}
    >
      {SHAPES.map((shape) => (
        <div key={shape} style={{ textAlign: 'center' }}>
          <div
            style={{
              height: 88,
              background: 'var(--md-sys-color-primary-container)',
              borderRadius: `var(--md-sys-shape-corner-${shape})`,
            }}
          />
          <div className="md-typescale-label-medium" style={{ marginTop: 8 }}>
            {shape}
          </div>
        </div>
      ))}
    </div>
  ),
}

export const Elevation: Story = {
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: 24,
        padding: 24,
      }}
    >
      {LEVELS.map((level) => (
        <div key={level} style={{ textAlign: 'center' }}>
          <div
            style={{
              height: 96,
              background: 'var(--md-sys-color-surface-container-low)',
              borderRadius: 'var(--md-sys-shape-corner-medium)',
              boxShadow: `var(--md-sys-elevation-shadow-level${level})`,
            }}
          />
          <div className="md-typescale-label-medium" style={{ marginTop: 8 }}>
            level {level}
          </div>
        </div>
      ))}
    </div>
  ),
}
