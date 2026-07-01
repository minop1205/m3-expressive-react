import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import { Snackbar } from './Snackbar'

const meta = {
  title: 'Components/Snackbar',
  component: Snackbar,
  parameters: { layout: 'centered' },
  args: { message: 'Single-line snackbar' },
} satisfies Meta<typeof Snackbar>

export default meta
type Story = StoryObj<typeof meta>

export const Message: Story = {}

export const WithAction: Story = {
  args: {
    message: 'Message archived',
    action: { label: 'Undo', onClick: fn() },
  },
}

export const WithActionAndDismiss: Story = {
  args: {
    message: 'Sent to trash',
    action: { label: 'Undo', onClick: fn() },
    onDismiss: fn(),
  },
}

export const TwoLine: Story = {
  args: {
    message:
      'A longer snackbar message that wraps onto a second line to demonstrate the two-line layout.',
    action: { label: 'Action', onClick: fn() },
    onDismiss: fn(),
  },
}
