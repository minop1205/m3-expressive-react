import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import { Fab } from './Fab'
import EditIcon from '@material-symbols/svg-400/outlined/edit.svg?react'
import AddIcon from '@material-symbols/svg-400/outlined/add.svg?react'
import NavigationIcon from '@material-symbols/svg-400/outlined/navigation.svg?react'

const meta = {
  title: 'Components/FAB',
  component: Fab,
  parameters: { layout: 'centered' },
  args: {
    icon: <EditIcon />,
    'aria-label': 'Edit',
    color: 'primary-container',
    size: 'regular',
    onClick: fn(),
  },
  argTypes: {
    color: {
      control: 'inline-radio',
      options: [
        'primary-container',
        'secondary-container',
        'tertiary-container',
        'primary',
        'secondary',
        'tertiary',
      ],
    },
    size: {
      control: 'inline-radio',
      options: ['small', 'regular', 'medium', 'large'],
    },
    disableElevation: { control: 'boolean' },
    disabled: { control: 'boolean' },
    icon: { control: false },
    onClick: { action: 'onClick' },
  },
} satisfies Meta<typeof Fab>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      <Fab {...args} size="small" aria-label="Small" />
      <Fab {...args} size="regular" aria-label="Regular" />
      <Fab {...args} size="medium" aria-label="Medium" />
      <Fab {...args} size="large" aria-label="Large" />
    </div>
  ),
}

export const Colors: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      <Fab {...args} color="primary-container" aria-label="Primary container" />
      <Fab {...args} color="secondary-container" aria-label="Secondary container" />
      <Fab {...args} color="tertiary-container" aria-label="Tertiary container" />
      <Fab {...args} color="primary" aria-label="Primary" />
      <Fab {...args} color="secondary" aria-label="Secondary" />
      <Fab {...args} color="tertiary" aria-label="Tertiary" />
    </div>
  ),
}

export const Extended: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
      <Fab {...args} icon={<AddIcon />} label="Create" />
      <Fab {...args} icon={<NavigationIcon />} label="Navigate" color="secondary-container" />
      <Fab {...args} icon={<EditIcon />} label="Compose" color="tertiary-container" />
    </div>
  ),
}

/**
 * Toggle `expanded` to morph between the icon-only FAB and the Extended FAB —
 * the label row springs open (FastSpatial, slight overshoot) and collapses
 * (DefaultSpatial) while the label cross-fades, per Compose
 * `ExtendedFloatingActionButton(expanded=)`.
 */
export const Morph: Story = {
  render: (args) => <Fab {...args} icon={<EditIcon />} label="Compose" />,
  args: { expanded: false },
  argTypes: { expanded: { control: 'boolean' } },
}

/** Flat FAB (elevation 0) — as used inside a Navigation rail / drawer. */
export const DisableElevation: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      <Fab {...args} aria-label="Flat" />
      <Fab {...args} icon={<AddIcon />} label="Create" />
    </div>
  ),
  args: { disableElevation: true },
}

export const Disabled: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      <Fab {...args} size="regular" aria-label="Regular" />
      <Fab {...args} size="medium" aria-label="Medium" />
      <Fab {...args} label="Create" icon={<AddIcon />} />
    </div>
  ),
  args: { disabled: true },
}
