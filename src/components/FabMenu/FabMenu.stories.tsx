import type { Meta, StoryObj } from '@storybook/react'
import { FabMenu, FabMenuItem } from './FabMenu'

const meta = {
  title: 'Components/FabMenu',
  component: FabMenu,
  parameters: { layout: 'centered' },
  args: { icon: <span aria-hidden="true">＋</span>, ariaLabel: 'Create' },
} satisfies Meta<typeof FabMenu>

export default meta
type Story = StoryObj<typeof meta>

const items = (
  <>
    <FabMenuItem icon={<span aria-hidden="true">✎</span>}>New note</FabMenuItem>
    <FabMenuItem icon={<span aria-hidden="true">⏰</span>}>Reminder</FabMenuItem>
    <FabMenuItem icon={<span aria-hidden="true">🖼</span>}>Image</FabMenuItem>
    <FabMenuItem icon={<span aria-hidden="true">🎤</span>}>Voice</FabMenuItem>
  </>
)

export const Default: Story = {
  render: () => (
    <div style={{ height: 420, display: 'flex', alignItems: 'flex-end' }}>
      <FabMenu icon={<span aria-hidden="true">＋</span>} ariaLabel="Create">
        {items}
      </FabMenu>
    </div>
  ),
}

export const Open: Story = {
  render: () => (
    <div style={{ height: 420, display: 'flex', alignItems: 'flex-end' }}>
      <FabMenu icon={<span aria-hidden="true">＋</span>} ariaLabel="Create" defaultOpen>
        {items}
      </FabMenu>
    </div>
  ),
}

export const Secondary: Story = {
  render: () => (
    <div style={{ height: 420, display: 'flex', alignItems: 'flex-end' }}>
      <FabMenu icon={<span aria-hidden="true">＋</span>} ariaLabel="Create" color="secondary" defaultOpen>
        {items}
      </FabMenu>
    </div>
  ),
}

export const Tertiary: Story = {
  render: () => (
    <div style={{ height: 420, display: 'flex', alignItems: 'flex-end' }}>
      <FabMenu icon={<span aria-hidden="true">＋</span>} ariaLabel="Create" color="tertiary" defaultOpen>
        {items}
      </FabMenu>
    </div>
  ),
}

const plus = <span aria-hidden="true">＋</span>

/**
 * The menu opens from any FAB size (`size`), with the tonal (`*-container`,
 * default) or high-emphasis (`tonal={false}`) closed colors.
 */
export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 24 }}>
      {[true, false].map((tonal) => (
        <div key={String(tonal)} style={{ display: 'flex', gap: 24, alignItems: 'flex-end' }}>
          {(['regular', 'medium', 'large'] as const).map((size) => (
            <FabMenu key={size} icon={plus} ariaLabel="Create" size={size} tonal={tonal}>
              {items}
            </FabMenu>
          ))}
        </div>
      ))}
    </div>
  ),
}

/**
 * Opened from a large FAB: the 56dp close button sits in the top-trailing
 * corner of the 96dp footprint, 8dp below the items.
 */
export const LargeOpen: Story = {
  render: () => (
    <div style={{ height: 460, display: 'flex', alignItems: 'flex-end' }}>
      <FabMenu icon={plus} ariaLabel="Create" size="large" defaultOpen>
        {items}
      </FabMenu>
    </div>
  ),
}

/** RTL: the items align to the (left) trailing edge, content mirrored. */
export const RightToLeft: Story = {
  render: () => (
    <div dir="rtl" style={{ height: 420, display: 'flex', alignItems: 'flex-end' }}>
      <FabMenu icon={plus} ariaLabel="Create" defaultOpen>
        {items}
      </FabMenu>
    </div>
  ),
}

/**
 * `horizontalAlignment` (Compose FloatingActionButtonMenu): items aligned to
 * the FAB's start (a bottom-leading FAB), centered over it, or to its end
 * (the default).
 */
export const HorizontalAlignment: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 24 }}>
      {(['start', 'center', 'end'] as const).map((alignment) => (
        <div
          key={alignment}
          style={{
            width: 220,
            height: 420,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent:
              alignment === 'start' ? 'flex-start' : alignment === 'center' ? 'center' : 'flex-end',
          }}
        >
          <FabMenu
            icon={plus}
            ariaLabel={`Create (${alignment})`}
            horizontalAlignment={alignment}
            defaultOpen
          >
            {items}
          </FabMenu>
        </div>
      ))}
    </div>
  ),
}

/** RTL + `horizontalAlignment="start"`: the items align to the (right) leading edge. */
export const RightToLeftStart: Story = {
  render: () => (
    <div dir="rtl" style={{ height: 420, width: 240, display: 'flex', alignItems: 'flex-end' }}>
      <FabMenu icon={plus} ariaLabel="Create" horizontalAlignment="start" defaultOpen>
        {items}
      </FabMenu>
    </div>
  ),
}
