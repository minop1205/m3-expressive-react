import type { Meta, StoryObj } from '@storybook/react'
import { useTheme } from '../theme/ThemeProvider'
import type { ColorRole } from '../theme/colorScheme'

const meta: Meta = {
  title: 'Foundations/Color',
  parameters: { layout: 'fullscreen' },
}
export default meta
type Story = StoryObj

/** Pairs of (container role, on-role) rendered as labelled swatches. */
const GROUPS: { title: string; pairs: [ColorRole, ColorRole][] }[] = [
  {
    title: 'Primary',
    pairs: [
      ['primary', 'on-primary'],
      ['primary-container', 'on-primary-container'],
    ],
  },
  {
    title: 'Secondary',
    pairs: [
      ['secondary', 'on-secondary'],
      ['secondary-container', 'on-secondary-container'],
    ],
  },
  {
    title: 'Tertiary',
    pairs: [
      ['tertiary', 'on-tertiary'],
      ['tertiary-container', 'on-tertiary-container'],
    ],
  },
  {
    title: 'Error',
    pairs: [
      ['error', 'on-error'],
      ['error-container', 'on-error-container'],
    ],
  },
  {
    title: 'Surfaces',
    pairs: [
      ['surface-container-lowest', 'on-surface'],
      ['surface-container-low', 'on-surface'],
      ['surface-container', 'on-surface'],
      ['surface-container-high', 'on-surface'],
      ['surface-container-highest', 'on-surface'],
    ],
  },
  {
    title: 'Outline',
    pairs: [
      ['surface', 'outline'],
      ['surface', 'outline-variant'],
    ],
  },
]

function Swatch({ bg, fg }: { bg: ColorRole; fg: ColorRole }) {
  const { scheme } = useTheme()
  return (
    <div
      style={{
        background: `var(--md-sys-color-${bg})`,
        color: `var(--md-sys-color-${fg})`,
        borderRadius: 'var(--md-sys-shape-corner-medium)',
        padding: '16px',
        minHeight: 72,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        border: '1px solid var(--md-sys-color-outline-variant)',
      }}
    >
      <span className="md-typescale-label-large">{bg}</span>
      <span className="md-typescale-body-small" style={{ opacity: 0.8 }}>
        {scheme[bg]}
      </span>
    </div>
  )
}

export const Roles: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 24, maxWidth: 960 }}>
      {GROUPS.map((group) => (
        <section key={group.title}>
          <h3 className="md-typescale-title-medium" style={{ marginBottom: 8 }}>
            {group.title}
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: 8,
            }}
          >
            {group.pairs.map(([bg, fg]) => (
              <Swatch key={bg} bg={bg} fg={fg} />
            ))}
          </div>
        </section>
      ))}
    </div>
  ),
}
