import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './Button'

const meta = {
  title: 'Components/Button',
  component: Button,
  parameters: { layout: 'centered' },
  args: { children: 'Button', variant: 'filled', size: 'sm', shape: 'round' },
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: ['elevated', 'filled', 'tonal', 'outlined', 'text'],
    },
    size: { control: 'inline-radio', options: ['xs', 'sm', 'md', 'lg', 'xl'] },
    shape: { control: 'inline-radio', options: ['round', 'square'] },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

const PlusIcon = (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M11 13H5v-2h6V5h2v6h6v2h-6v6h-2z" />
  </svg>
)

export const Variants: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      <Button {...args} variant="elevated">Elevated</Button>
      <Button {...args} variant="filled">Filled</Button>
      <Button {...args} variant="tonal">Tonal</Button>
      <Button {...args} variant="outlined">Outlined</Button>
      <Button {...args} variant="text">Text</Button>
    </div>
  ),
}

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
      <Button {...args} size="xs">XS</Button>
      <Button {...args} size="sm">Small</Button>
      <Button {...args} size="md">Medium</Button>
      <Button {...args} size="lg">Large</Button>
      <Button {...args} size="xl">XL</Button>
    </div>
  ),
}

export const WithIcon: Story = {
  args: { icon: PlusIcon, children: 'Add item' },
}

export const Shapes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      <Button {...args} shape="round">Round</Button>
      <Button {...args} shape="square">Square</Button>
    </div>
  ),
  args: { size: 'md' },
}

export const Disabled: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      <Button {...args} variant="filled">Filled</Button>
      <Button {...args} variant="outlined">Outlined</Button>
      <Button {...args} variant="text">Text</Button>
    </div>
  ),
  args: { disabled: true },
}
