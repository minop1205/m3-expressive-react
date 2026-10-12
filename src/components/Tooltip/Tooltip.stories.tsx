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
    // Centered below the trigger. Without `placement`, a rich tooltip takes
    // the bottom-end corner (see RichDefaultCorner).
    placement: 'bottom',
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
    placement: 'bottom',
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

/**
 * Beside the trigger: `placement="end"` (logical — the left side in RTL);
 * `start`, `left` and `right` work the same way, vertically centered and
 * flipped when there is no room.
 */
export const PlacementEnd: Story = {
  args: { text: 'Add to favorites', placement: 'end', defaultOpen: true },
  render: (args) => (
    <Tooltip {...args}>
      <IconButton icon={<Info />} aria-label="Add to favorites" variant="standard" />
    </Tooltip>
  ),
}

/** Logical `start` mirrors in RTL: the tooltip sits to the trigger's right. */
export const PlacementStartRtl: Story = {
  args: { text: 'Add to favorites', placement: 'start', defaultOpen: true },
  render: (args) => (
    <div dir="rtl">
      <Tooltip {...args}>
        <IconButton icon={<Info />} aria-label="Add to favorites" variant="standard" />
      </Tooltip>
    </div>
  ),
}

/**
 * Rich default: the bottom-end corner of the trigger (below, start-aligned so
 * it extends toward the end edge).
 */
export const RichDefaultCorner: Story = {
  args: {
    defaultOpen: true,
    variant: 'rich',
    subhead: 'Rich tooltip',
    text: 'By default a rich tooltip sits at the bottom-end corner of its trigger.',
  },
  render: (args) => (
    <Tooltip {...args}>
      <Button variant="outlined">Hover or focus me</Button>
    </Tooltip>
  ),
}

/**
 * Four-corner positioning: near the bottom-right of the viewport the rich
 * tooltip moves to the trigger's top-start corner to stay on screen.
 */
export const RichCornerFlip: Story = {
  parameters: { layout: 'fullscreen' },
  args: {
    defaultOpen: true,
    variant: 'rich',
    subhead: 'Rich tooltip',
    text: 'No room below or to the end: the tooltip takes the top-start corner.',
  },
  render: (args) => (
    <div
      style={{
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'flex-end',
        height: '100vh',
        padding: 16,
      }}
    >
      <Tooltip {...args}>
        <Button variant="outlined">Corner</Button>
      </Tooltip>
    </div>
  ),
}

/**
 * Optional caret (16×8dp) pointing at the trigger; the caret tip, not the
 * container, keeps the 4dp distance from the trigger.
 */
export const Caret: Story = {
  args: { text: 'Add to favorites', caret: true, defaultOpen: true },
  render: (args) => (
    // Room above, so the tooltip keeps its default top placement.
    <div style={{ paddingTop: 48 }}>
      <Tooltip {...args}>
        <IconButton icon={<Info />} aria-label="Add to favorites" variant="standard" />
      </Tooltip>
    </div>
  ),
}

/** A rich tooltip with a caret, at its default bottom-end corner. */
export const RichCaret: Story = {
  args: {
    defaultOpen: true,
    variant: 'rich',
    caret: true,
    subhead: 'Rich tooltip',
    text: 'The caret points at the center of the trigger.',
  },
  render: (args) => (
    <Tooltip {...args}>
      <Button variant="outlined">Hover or focus me</Button>
    </Tooltip>
  ),
}
