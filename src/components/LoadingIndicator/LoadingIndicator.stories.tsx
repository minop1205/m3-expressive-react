import type { Meta, StoryObj } from '@storybook/react'
import { LoadingIndicator } from './LoadingIndicator'

const meta = {
  title: 'Components/LoadingIndicator',
  component: LoadingIndicator,
  parameters: { layout: 'centered' },
  argTypes: {
    variant: { control: 'inline-radio', options: ['uncontained', 'contained'] },
    value: { control: { type: 'range', min: 0, max: 1, step: 0.05 } },
    size: { control: { type: 'range', min: 24, max: 160, step: 4 } },
  },
} satisfies Meta<typeof LoadingIndicator>

export default meta
type Story = StoryObj<typeof meta>

export const Indeterminate: Story = {
  args: { 'aria-label': 'Loading' },
}

export const Contained: Story = {
  args: { variant: 'contained', 'aria-label': 'Loading' },
}

export const Determinate: Story = {
  args: { value: 0.6, 'aria-label': 'Loading' },
}

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
      {[36, 48, 96, 140].map((size) => (
        <LoadingIndicator key={size} {...args} size={size} aria-label={`Loading ${size}`} />
      ))}
    </div>
  ),
}
