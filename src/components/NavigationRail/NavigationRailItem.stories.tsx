import { forwardRef, useRef, type CSSProperties, type ReactNode } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import Inbox from '@material-symbols/svg-400/outlined/inbox.svg?react'
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
  expanded: boolean
  t: number
  label: string
  badge: string
  badgeDot: boolean
  selected: boolean
  disabled: boolean
}

/** Map the `badge` text / `badgeDot` controls to the `badge` prop. */
const badgeProp = ({ badge, badgeDot }: Args) => (badgeDot ? true : badge || undefined)

const meta: Meta<Args> = {
  title: 'Components/NavigationRailItem',
  // Left-aligned (not centered) so expanding grows rightward only — makes the
  // morph easy to inspect, and matches the rail's real left-edge placement.
  parameters: { layout: 'padded' },
  argTypes: {
    expanded: { control: 'boolean' },
    t: { control: { type: 'range', min: 0, max: 1, step: 0.01 }, name: 'morph t (0=collapsed, 1=expanded)' },
    label: { control: 'text' },
    badge: { control: 'text' },
    badgeDot: { control: 'boolean', name: 'badge: small dot (overrides text)' },
    selected: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  args: { expanded: false, t: 0, label: 'Inbox', badge: '', badgeDot: false, selected: true, disabled: false },
}

export default meta
type Story = StoryObj<Args>

/**
 * A single standalone item driven by its public props — toggle `expanded` to
 * spring between collapsed and expanded. The RailBox runs the same spring only
 * to animate the demo container's width alongside the item's own morph.
 */
export const Playground: Story = {
  argTypes: { t: { table: { disable: true } } },
  render: (args) => {
    const { expanded, label, selected, disabled } = args
    const ref = useRef<HTMLDivElement | null>(null)
    useRailMorph(expanded, ref)
    return (
      <RailBox ref={ref} style={{ minHeight: 100 }}>
        <NavigationRailItem
          value="inbox"
          icon={<Inbox />}
          label={label || undefined}
          badge={badgeProp(args)}
          selected={selected}
          disabled={disabled}
          expanded={expanded}
        />
      </RailBox>
    )
  },
}

/**
 * Frame-by-frame inspection: `expanded` is omitted so the item inherits `--_t`
 * from the container; scrub the `t` slider to freeze any frame of the morph.
 */
export const MorphFrame: Story = {
  argTypes: { expanded: { table: { disable: true } } },
  render: (args) => (
    <RailBox t={args.t}>
      <NavigationRailItem
        value="inbox"
        icon={<Inbox />}
        label={args.label || undefined}
        badge={badgeProp(args)}
        selected={args.selected}
        disabled={args.disabled}
      />
    </RailBox>
  ),
}
