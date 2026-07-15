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
      <IconButton icon={<Info />} aria-label="Info" variant="standard" />
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
    placement: 'bottom',
  },
  render: (args) => (
    <Tooltip {...args}>
      <Button variant="outlined">Hover or focus me</Button>
    </Tooltip>
  ),
}
