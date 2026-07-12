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
