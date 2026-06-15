import type { Meta, StoryObj } from '@storybook/react'

const meta: Meta = { title: 'Foundations/Typography' }
export default meta
type Story = StoryObj

const ROLES = [
  'display-large',
  'display-medium',
  'display-small',
  'headline-large',
  'headline-medium',
  'headline-small',
  'title-large',
  'title-medium',
  'title-small',
  'body-large',
  'body-medium',
  'body-small',
  'label-large',
  'label-medium',
  'label-small',
] as const

export const TypeScale: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 16, color: 'var(--md-sys-color-on-surface)' }}>
      {ROLES.map((role) => (
        <div key={role} style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
          <code
            className="md-typescale-body-small"
            style={{ width: 140, color: 'var(--md-sys-color-on-surface-variant)' }}
          >
            {role}
          </code>
          <span className={`md-typescale-${role}`}>The quick brown fox</span>
        </div>
      ))}
    </div>
  ),
}
