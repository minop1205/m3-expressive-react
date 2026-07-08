import { forwardRef, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import Inbox from '@material-symbols/svg-400/outlined/inbox.svg?react'
import Outbox from '@material-symbols/svg-400/outlined/outbox.svg?react'
import { NavigationRailItem } from './NavigationRailItem'
import { useRailMorph } from './useRailMorph'

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
      <NavigationRailItem value="inbox" icon={<Inbox />} label="Inbox" selected={selected} />
      <NavigationRailItem value="outbox" icon={<Outbox />} label="Outbox" badge="3" />
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
          <NavigationRailItem value="inbox" icon={<Inbox />} label="Inbox" selected />
          <NavigationRailItem value="outbox" icon={<Outbox />} label="Outbox" badge="3" />
        </RailBox>
      </div>
    )
  },
}
