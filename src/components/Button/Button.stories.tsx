import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { fn } from 'storybook/test'
import Add from '@material-symbols/svg-400/outlined/add.svg?react'
import { Button } from './Button'

const meta = {
  title: 'Components/Button',
  component: Button,
  parameters: { layout: 'centered' },
  args: {
    children: 'Button',
    variant: 'filled',
    size: 'sm',
    shape: 'round',
    onClick: fn(),
  },
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: ['elevated', 'filled', 'tonal', 'outlined', 'text'],
    },
    size: { control: 'inline-radio', options: ['xs', 'sm', 'md', 'lg', 'xl'] },
    shape: { control: 'inline-radio', options: ['round', 'square'] },
    disabled: { control: 'boolean' },
    onClick: { action: 'onClick' },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

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
  args: { startIcon: <Add />, children: 'Add item' },
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

export const Toggle: Story = {
  render: (args) => {
    const [selected, setSelected] = useState(false)
    return (
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {(['elevated', 'filled', 'tonal', 'outlined'] as const).map((variant) => (
          <Button
            key={variant}
            {...args}
            variant={variant}
            toggle
            selected={selected}
            onChange={(_event, next) => setSelected(next)}
          >
            {variant}
          </Button>
        ))}
      </div>
    )
  },
  args: { size: 'md' },
}

/** Selected toggles swap their resting shape (round → square, square → round). */
export const ToggleSelectedShapes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
      <Button {...args} toggle>
        round
      </Button>
      <Button {...args} toggle defaultSelected>
        round selected
      </Button>
      <Button {...args} toggle shape="square">
        square
      </Button>
      <Button {...args} toggle shape="square" defaultSelected>
        square selected
      </Button>
    </div>
  ),
  args: { size: 'md', variant: 'tonal' },
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
