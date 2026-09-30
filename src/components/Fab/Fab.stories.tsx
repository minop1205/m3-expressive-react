import type { Meta, StoryObj } from '@storybook/react'
import { fn } from 'storybook/test'
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
    color: 'primary',
    tonal: true,
    size: 'regular',
    onClick: fn(),
  },
  argTypes: {
    color: {
      control: 'inline-radio',
      options: ['primary', 'secondary', 'tertiary'],
    },
    tonal: { control: 'boolean' },
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

export const Playground: Story = {
  args: { 'aria-label': 'Edit' },
}

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
      <Fab {...args} color="primary" aria-label="Primary container" />
      <Fab {...args} color="secondary" aria-label="Secondary container" />
      <Fab {...args} color="tertiary" aria-label="Tertiary container" />
      <Fab {...args} color="primary" tonal={false} aria-label="Primary" />
      <Fab {...args} color="secondary" tonal={false} aria-label="Secondary" />
      <Fab {...args} color="tertiary" tonal={false} aria-label="Tertiary" />
    </div>
  ),
}

export const Extended: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
      <Fab {...args} icon={<AddIcon />} label="Create" />
      <Fab {...args} icon={<NavigationIcon />} label="Navigate" color="secondary" />
      <Fab {...args} icon={<EditIcon />} label="Compose" color="tertiary" />
    </div>
  ),
}

/**
 * Expressive extended FAB sizes: `regular` → small extended (56dp,
 * title-medium, 16/8/16), `medium` → medium extended (80dp, title-large,
 * 26/12/26), `large` → large extended (96dp, headline-small, 28/16/28). The
 * bottom row is the high-emphasis palette (`tonal={false}`).
 */
export const ExtendedSizes: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gap: 16, justifyItems: 'start' }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <Fab {...args} icon={<AddIcon />} label="Create" size="regular" />
        <Fab {...args} icon={<AddIcon />} label="Create" size="medium" />
        <Fab {...args} icon={<AddIcon />} label="Create" size="large" />
      </div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <Fab {...args} icon={<EditIcon />} label="Compose" size="regular" tonal={false} />
        <Fab {...args} icon={<EditIcon />} label="Compose" size="medium" tonal={false} />
        <Fab {...args} icon={<EditIcon />} label="Compose" size="large" tonal={false} />
      </div>
    </div>
  ),
}

/**
 * Toggle `expanded` to morph between the icon-only FAB and the Extended FAB —
 * the width springs open and closed on FastSpatial (slight overshoot in the
 * expressive motion scheme) while the label fades on FastEffects, per Compose
 * `Small / Medium / LargeExtendedFloatingActionButton(expanded=)`.
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
