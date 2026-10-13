import type { Meta, StoryObj } from '@storybook/react'
import { fn } from 'storybook/test'
import Commute from '@material-symbols/svg-400/outlined/commute.svg?react'
import Flight from '@material-symbols/svg-400/outlined/flight.svg?react'
import DirectionsCar from '@material-symbols/svg-400/outlined/directions_car.svg?react'
import Train from '@material-symbols/svg-400/outlined/train.svg?react'
import DirectionsBike from '@material-symbols/svg-400/outlined/directions_bike.svg?react'
import { Autocomplete, Option } from './Autocomplete'

const fruits = [
  'Apple',
  'Apricot',
  'Banana',
  'Blackberry',
  'Blueberry',
  { value: 'Cherry', label: 'Cherry', disabled: true },
  'Grape',
]

const meta = {
  title: 'Components/Autocomplete',
  component: Autocomplete,
  parameters: { layout: 'centered' },
  args: {
    label: 'Fruit',
    options: fruits,
    onChange: fn(),
    onInputChange: fn(),
    onOpenChange: fn(),
  },
  argTypes: {
    variant: { control: 'inline-radio', options: ['filled', 'outlined'] },
    freeSolo: { control: 'boolean' },
    error: { control: 'boolean' },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
    fullWidth: { control: 'boolean' },
    options: { control: false },
    onChange: { action: 'onChange' },
    onInputChange: { action: 'onInputChange' },
    onOpenChange: { action: 'onOpenChange' },
  },
} satisfies Meta<typeof Autocomplete>

export default meta
type Story = StoryObj<typeof meta>

export const Filled: Story = {
  args: {
    variant: 'filled',
    defaultValue: 'Banana',
    supportingText: 'Type to filter',
  },
}

export const Outlined: Story = {
  args: {
    variant: 'outlined',
    defaultValue: 'Banana',
    supportingText: 'Type to filter',
  },
}

/** `Option` children: option start icons and a field start icon. */
export const WithIcons: Story = {
  args: { options: undefined },
  render: (args) => (
    <Autocomplete {...args} label="Travel mode" startIcon={<Commute />} defaultValue="train">
      <Option value="flight" startIcon={<Flight />}>
        Flight
      </Option>
      <Option value="car" startIcon={<DirectionsCar />}>
        Car
      </Option>
      <Option value="train" startIcon={<Train />}>
        Train
      </Option>
      <Option value="bike" startIcon={<DirectionsBike />}>
        Bike
      </Option>
    </Autocomplete>
  ),
}

export const Disabled: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Autocomplete {...args} disabled defaultValue="Apple" supportingText="Supporting text" />
      <Autocomplete
        {...args}
        variant="outlined"
        disabled
        defaultValue="Apple"
        supportingText="Supporting text"
      />
    </div>
  ),
}

export const ErrorState: Story = {
  name: 'Error',
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Autocomplete {...args} required error errorText="Choose a fruit" />
      <Autocomplete
        {...args}
        variant="outlined"
        error
        defaultValue="Grape"
        errorText="Out of stock"
      />
    </div>
  ),
}

/** Open and filtered by the typed text (VRT): only the matching options, at the field's width. */
export const Filtered: Story = {
  render: (args) => (
    <div style={{ paddingBottom: 260 }}>
      <Autocomplete {...args} defaultOpen defaultInputValue="b" />
    </div>
  ),
}

/** Open on a picked value: every option, the selected one checked. */
export const Open: Story = {
  render: (args) => (
    <div style={{ paddingBottom: 380 }}>
      <Autocomplete {...args} defaultOpen defaultValue="Banana" />
    </div>
  ),
}

/** Nothing matches: `noOptionsText` (without it the listbox closes). */
export const NoOptions: Story = {
  render: (args) => (
    <div style={{ paddingBottom: 100 }}>
      <Autocomplete {...args} defaultOpen defaultInputValue="kiwi" noOptionsText="No options" />
    </div>
  ),
}

/** `freeSolo`: any text is a value (committed with Enter or on blur). */
export const FreeSolo: Story = {
  args: { freeSolo: true, label: 'Fruit (any)', defaultValue: 'Dragon fruit' },
}
