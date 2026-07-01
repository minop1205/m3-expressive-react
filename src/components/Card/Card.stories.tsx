import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import { Card } from './Card'

const meta = {
  title: 'Components/Card',
  component: Card,
  parameters: { layout: 'centered' },
  args: {
    variant: 'filled',
    children: 'Card content',
  },
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: ['filled', 'elevated', 'outlined'],
    },
    disabled: { control: 'boolean' },
  },
  render: (args) => (
    <Card {...args} style={{ width: 300, padding: 16 }}>
      {args.children}
    </Card>
  ),
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const Variants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      {(['filled', 'elevated', 'outlined'] as const).map((variant) => (
        <Card key={variant} variant={variant} style={{ width: 200, padding: 16 }}>
          <strong style={{ textTransform: 'capitalize' }}>{variant}</strong>
          <p style={{ margin: '8px 0 0' }}>Supporting text for the card body.</p>
        </Card>
      ))}
    </div>
  ),
}

export const Clickable: Story = {
  args: { onClick: fn() },
  render: (args) => (
    <Card {...args} variant="elevated" style={{ width: 300, padding: 16 }}>
      <strong>Clickable card</strong>
      <p style={{ margin: '8px 0 0' }}>
        Passing onClick adds ripple, focus ring, and keyboard activation.
      </p>
    </Card>
  ),
}

export const Disabled: Story = {
  args: { onClick: fn(), disabled: true },
  render: (args) => (
    <Card {...args} variant="elevated" style={{ width: 300, padding: 16 }}>
      <strong>Disabled card</strong>
      <p style={{ margin: '8px 0 0' }}>Dimmed to 38% and non-interactive.</p>
    </Card>
  ),
}
