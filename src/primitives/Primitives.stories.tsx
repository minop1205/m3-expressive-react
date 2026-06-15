import type { Meta, StoryObj } from '@storybook/react'
import { Ripple } from './Ripple/Ripple'
import { FocusRing } from './FocusRing/FocusRing'

const meta: Meta = { title: 'Primitives/Interaction' }
export default meta
type Story = StoryObj

/** A minimal interactive surface wiring up the foundation primitives. */
function DemoSurface({ disabled = false }: { disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      style={{
        position: 'relative',
        appearance: 'none',
        border: 'none',
        cursor: disabled ? 'default' : 'pointer',
        padding: '16px 24px',
        minWidth: 200,
        color: 'var(--md-sys-color-on-primary-container)',
        background: 'var(--md-sys-color-primary-container)',
        borderRadius: 'var(--md-sys-shape-corner-large)',
        font: 'inherit',
        opacity: disabled ? 0.38 : 1,
      }}
      className="md-typescale-label-large"
    >
      {disabled ? 'Disabled' : 'Press / hover / tab to me'}
      {!disabled && (
        <>
          <Ripple />
          <FocusRing />
        </>
      )}
    </button>
  )
}

export const StateLayerAndRipple: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
      <DemoSurface />
      <DemoSurface disabled />
    </div>
  ),
}
