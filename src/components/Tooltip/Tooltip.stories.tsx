import type { Meta, StoryObj } from '@storybook/react'
import { Button } from '../Button'
import { IconButton } from '../IconButton'
import { Tooltip } from './Tooltip'

const InfoIcon = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M11 9h2V7h-2m1 13c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8m0-18A10 10 0 0 0 2 12a10 10 0 0 0 10 10 10 10 0 0 0 10-10A10 10 0 0 0 12 2m-1 15h2v-6h-2z" />
  </svg>
)

const meta = {
  title: 'Components/Tooltip',
  component: Tooltip,
  parameters: { layout: 'centered' },
  args: { children: <button>Trigger</button> },
} satisfies Meta<typeof Tooltip>

export default meta
type Story = StoryObj<typeof meta>

export const Plain: Story = {
  args: { text: 'Add to favorites' },
  render: (args) => (
    <Tooltip {...args}>
      <IconButton icon={InfoIcon} aria-label="Info" variant="standard" />
    </Tooltip>
  ),
}

export const Rich: Story = {
  args: {
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
