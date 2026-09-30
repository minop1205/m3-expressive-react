import type { Meta, StoryObj } from '@storybook/react'
import { Button } from '../Button'
import { IconButton } from '../IconButton'
import Info from '@material-symbols/svg-400/outlined/info.svg?react'
import { Tooltip } from './Tooltip'

const meta = {
  title: 'Components/Tooltip',
  component: Tooltip,
  parameters: { layout: 'centered' },
  args: { children: <button>Trigger</button> },
} satisfies Meta<typeof Tooltip>

export default meta
type Story = StoryObj<typeof meta>

export const Plain: Story = {
  // defaultOpen so the tooltip surface itself is captured by VRT
  // (it only appears on hover/focus otherwise).
  args: { text: 'Add to favorites', defaultOpen: true },
  render: (args) => (
    <Tooltip {...args}>
      <IconButton icon={<Info />} aria-label="Add to favorites" variant="standard" />
    </Tooltip>
  ),
}

export const Rich: Story = {
  args: {
    defaultOpen: true,
    variant: 'rich',
    subhead: 'Rich tooltip',
    text: 'Rich tooltips support a subhead, longer body text, and an action.',
    action: <Button variant="text" size="xs">Learn more</Button>,
    // Rich tooltips default to placement="bottom".
  },
  render: (args) => (
    <Tooltip {...args}>
      <Button variant="outlined">Hover or focus me</Button>
    </Tooltip>
  ),
}

/**
 * Persistent rich tooltip: opens and closes on click (not hover / focus) and
 * stays open until the user presses elsewhere, presses Escape, or moves focus
 * away. Its actions are reachable with Tab from the trigger.
 */
export const Persistent: Story = {
  args: {
    defaultOpen: true,
    persistent: true,
    variant: 'rich',
    subhead: 'New: shared albums',
    text: 'Invite people to add their photos to an album you share with them.',
    action: (
      <>
        <Button variant="text" size="xs">Learn more</Button>
        <Button variant="text" size="xs">Dismiss</Button>
      </>
    ),
  },
  render: (args) => (
    <Tooltip {...args}>
      <Button variant="filled">Share album</Button>
    </Tooltip>
  ),
}

/**
 * Collision handling: the anchor sits in the top-left corner, so the plain
 * tooltip flips below it (no room above) and is kept 8dp inside the viewport.
 */
export const ViewportEdge: Story = {
  parameters: { layout: 'fullscreen' },
  args: { text: 'Flips below and stays on screen', defaultOpen: true },
  render: (args) => (
    <div style={{ padding: 4 }}>
      <Tooltip {...args}>
        <IconButton icon={<Info />} aria-label="Help" variant="standard" />
      </Tooltip>
    </div>
  ),
}
