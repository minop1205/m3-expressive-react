import { forwardRef, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { NavigationRailItem } from './NavigationRailItem'
import { useRailMorph } from './useRailMorph'

const icon = (d: string) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d={d} />
  </svg>
)
const Inbox = icon('M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2m0 12h-4c0 1.66-1.35 3-3 3s-3-1.34-3-3H5V5h14z')
const Outbox = icon('M19 3H4.99C3.89 3 3 3.9 3 5v14c0 1.1.89 2 1.99 2H19c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2m0 12h-4c0 1.66-1.35 3-3 3s-3-1.34-3-3H4.99V5H19zm-3-4h-2V8h-4v3H8l4 4z')

/**
 * The item lives inside a container whose width/padding track the same `--_t`
 * the rail uses, so a lone item morphs exactly as it would in the rail. `--_t`
 * is set on this element (via `t` or the spring), and items inherit it.
 */
const RailBox = forwardRef<HTMLDivElement, { t?: number; style?: CSSProperties; children: ReactNode }>(
  function RailBox({ t, style, children }, ref) {
    return (
      <div
        ref={ref}
        style={{
          boxSizing: 'border-box',
          width: 'calc(96px + 124px * var(--_t, 0))',
          paddingInline: 'calc(20px * var(--_t, 0))',
          paddingBlock: 12,
          background: 'var(--md-sys-color-surface)',
          ...(t != null ? ({ '--_t': t } as CSSProperties) : {}),
          ...style,
        }}
      >
        {children}
      </div>
    )
  },
)

interface Args {
  t: number
  selected: boolean
}

const meta: Meta<Args> = {
  title: 'Components/NavigationRailItem',
  // Left-aligned (not centered) so expanding grows rightward only — makes the
  // morph easy to inspect, and matches the rail's real left-edge placement.
  parameters: { layout: 'padded' },
  argTypes: {
    t: { control: { type: 'range', min: 0, max: 1, step: 0.01 }, name: 'morph t (0=collapsed, 1=expanded)' },
    selected: { control: 'boolean' },
  },
  args: { t: 0, selected: true },
}

export default meta
type Story = StoryObj<Args>

/** Scrub the `t` slider to inspect any frame of the morph. */
export const Playground: Story = {
  render: ({ t, selected }) => (
    <RailBox t={t}>
      <NavigationRailItem value="inbox" icon={Inbox} label="Inbox" selected={selected} />
      <NavigationRailItem value="outbox" icon={Outbox} label="Outbox" badge="3" />
    </RailBox>
  ),
}

/** Click to spring between collapsed and expanded. */
export const Morph: Story = {
  render: () => {
    const ref = useRef<HTMLDivElement | null>(null)
    const [expanded, setExpanded] = useState(false)
    useRailMorph(expanded, ref)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-start' }}>
        <button type="button" onClick={() => setExpanded((e) => !e)}>
          {expanded ? 'Collapse' : 'Expand'}
        </button>
        <RailBox ref={ref} style={{ minHeight: 160 }}>
          <NavigationRailItem value="inbox" icon={Inbox} label="Inbox" selected />
          <NavigationRailItem value="outbox" icon={Outbox} label="Outbox" badge="3" />
        </RailBox>
      </div>
    )
  },
}
