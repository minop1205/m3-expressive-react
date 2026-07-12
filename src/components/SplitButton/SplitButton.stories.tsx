import type { Meta, StoryObj } from '@storybook/react'
import { MenuItem } from '../Menu'
import { SplitButton } from './SplitButton'

const meta = {
  title: 'Components/SplitButton',
  component: SplitButton,
  parameters: { layout: 'centered' },
  args: {
    children: 'Send',
    menu: (
      <>
        <MenuItem>Save as draft</MenuItem>
        <MenuItem>Schedule send</MenuItem>
        <MenuItem>Discard</MenuItem>
      </>
    ),
  },
} satisfies Meta<typeof SplitButton>

export default meta
type Story = StoryObj<typeof meta>

export const Filled: Story = {}

export const Variants: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      <SplitButton {...args} variant="elevated" />
      <SplitButton {...args} variant="filled" />
      <SplitButton {...args} variant="tonal" />
      <SplitButton {...args} variant="outlined" />
    </div>
  ),
}

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
      <SplitButton {...args} size="xs" />
      <SplitButton {...args} size="sm" />
      <SplitButton {...args} size="md" />
    </div>
  ),
}

export const WithIcon: Story = {
  args: { startIcon: <span aria-hidden="true">✉</span> },
}

export const Disabled: Story = {
  args: { disabled: true },
}
