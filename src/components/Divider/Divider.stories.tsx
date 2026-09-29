import type { Meta, StoryObj } from '@storybook/react'
import { Divider } from './Divider'

const meta = {
  title: 'Components/Divider',
  component: Divider,
  parameters: { layout: 'padded' },
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: ['full-width', 'inset', 'middle-inset'],
    },
    orientation: {
      control: 'inline-radio',
      options: ['horizontal', 'vertical'],
    },
  },
} satisfies Meta<typeof Divider>

export default meta
type Story = StoryObj<typeof meta>

export const Horizontal: Story = {
  args: {
    orientation: 'horizontal',
    variant: 'full-width',
  },
}

export const Vertical: Story = {
  args: {
    orientation: 'vertical',
    variant: 'full-width',
  },
  decorators: [
    (Story) => (
      <div style={{ display: 'flex', height: 120 }}>
        <Story />
      </div>
    ),
  ],
}

export const InList: Story = {
  args: {
    variant: 'inset',
  },
  render: ({ variant }) => (
    <div style={{ width: 360, border: '1px solid #e0e0e0', borderRadius: 12 }}>
      {['Item one', 'Item two', 'Item three'].map((item, i) => (
        <div key={item}>
          {i > 0 && <Divider variant={variant} />}
          <div style={{ padding: '12px 16px' }}>{item}</div>
        </div>
      ))}
    </div>
  ),
}
