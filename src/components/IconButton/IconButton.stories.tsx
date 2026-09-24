import { useCallback, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { fn } from 'storybook/test'
import Favorite from '@material-symbols/svg-400/outlined/favorite.svg?react'
import FavoriteFill from '@material-symbols/svg-400/outlined/favorite-fill.svg?react'
import Settings from '@material-symbols/svg-400/outlined/settings.svg?react'
import { IconButton } from './IconButton'

const meta = {
  title: 'Components/IconButton',
  component: IconButton,
  parameters: { layout: 'centered' },
  args: {
    icon: <Settings />,
    'aria-label': 'Settings',
    variant: 'filled',
    size: 'sm',
    width: 'default',
    shape: 'round',
    onClick: fn(),
    onChange: fn(),
  },
  argTypes: {
    variant: { control: 'inline-radio', options: ['standard', 'filled', 'tonal', 'outlined'] },
    size: { control: 'inline-radio', options: ['xs', 'sm', 'md', 'lg', 'xl'] },
    width: { control: 'inline-radio', options: ['narrow', 'default', 'wide'] },
    shape: { control: 'inline-radio', options: ['round', 'square'] },
    toggle: { control: 'boolean' },
    disabled: { control: 'boolean' },
    icon: { control: false },
    selectedIcon: { control: false },
    onClick: { action: 'onClick' },
    onChange: { action: 'onChange' },
  },
} satisfies Meta<typeof IconButton>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const Variants: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 12 }}>
      <IconButton {...args} variant="standard" aria-label="Standard" />
      <IconButton {...args} variant="filled" aria-label="Filled" />
      <IconButton {...args} variant="tonal" aria-label="Tonal" />
      <IconButton {...args} variant="outlined" aria-label="Outlined" />
    </div>
  ),
}

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((size) => (
        <IconButton {...args} key={size} size={size} variant="filled" aria-label={size} />
      ))}
    </div>
  ),
}

export const Widths: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      {(['narrow', 'default', 'wide'] as const).map((width) => (
        <IconButton {...args} key={width} width={width} variant="tonal" aria-label={width} />
      ))}
    </div>
  ),
  args: { size: 'md' },
}

export const Toggle: Story = {
  render: ({ onChange: onChangeProp, ...args }) => {
    const [on, setOn] = useState(false)
    const handleChange = useCallback(
      (next: boolean) => {
        setOn(next)
        onChangeProp?.(next)
      },
      [onChangeProp],
    )
    return (
      <IconButton
        {...args}
        toggle
        selected={on}
        onChange={handleChange}
        icon={<Favorite />}
        selectedIcon={<FavoriteFill />}
        aria-label="Add to favorites"
        selectedAriaLabel="Remove from favorites"
      />
    )
  },
  args: { variant: 'filled', size: 'md' },
}

export const Disabled: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 12 }}>
      <IconButton {...args} variant="filled" aria-label="Filled" />
      <IconButton {...args} variant="tonal" aria-label="Tonal" />
      <IconButton {...args} variant="outlined" aria-label="Outlined" />
      <IconButton {...args} variant="standard" aria-label="Standard" />
    </div>
  ),
  args: { disabled: true },
}
