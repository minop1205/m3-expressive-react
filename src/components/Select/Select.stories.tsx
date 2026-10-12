import type { Meta, StoryObj } from '@storybook/react'
import { fn } from 'storybook/test'
import Commute from '@material-symbols/svg-400/outlined/commute.svg?react'
import Flight from '@material-symbols/svg-400/outlined/flight.svg?react'
import DirectionsCar from '@material-symbols/svg-400/outlined/directions_car.svg?react'
import Train from '@material-symbols/svg-400/outlined/train.svg?react'
import DirectionsBike from '@material-symbols/svg-400/outlined/directions_bike.svg?react'
import { Option, Select } from './Select'

const fruits = (
  <>
    <Option value="apple">Apple</Option>
    <Option value="banana">Banana</Option>
    <Option value="blueberry">Blueberry</Option>
    <Option value="cherry" disabled>
      Cherry
    </Option>
    <Option value="grape">Grape</Option>
  </>
)

const meta = {
  title: 'Components/Select',
  component: Select,
  parameters: { layout: 'centered' },
  args: {
    label: 'Fruit',
    onChange: fn(),
    onOpenChange: fn(),
    children: fruits,
  },
  argTypes: {
    variant: { control: 'inline-radio', options: ['filled', 'outlined'] },
    error: { control: 'boolean' },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
    fullWidth: { control: 'boolean' },
    children: { control: false },
    onChange: { action: 'onChange' },
    onOpenChange: { action: 'onOpenChange' },
  },
} satisfies Meta<typeof Select>

export default meta
type Story = StoryObj<typeof meta>

export const Filled: Story = {
  args: { variant: 'filled', defaultValue: 'banana', supportingText: 'Supporting text' },
}

export const Outlined: Story = {
  args: { variant: 'outlined', defaultValue: 'banana', supportingText: 'Supporting text' },
}

/** A field start icon, and option start icons (the check mark replaces the selected one's). */
export const WithIcons: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Select {...args} label="Travel mode" startIcon={<Commute />} defaultValue="train">
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
      </Select>
      <Select
        {...args}
        variant="outlined"
        label="Travel mode"
        startIcon={<Commute />}
        defaultValue="car"
      >
        <Option value="flight">Flight</Option>
        <Option value="car">Car</Option>
        <Option value="train">Train</Option>
      </Select>
    </div>
  ),
}

export const Disabled: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Select {...args} disabled defaultValue="apple" supportingText="Supporting text" />
      <Select
        {...args}
        variant="outlined"
        disabled
        defaultValue="apple"
        supportingText="Supporting text"
      />
    </div>
  ),
}

export const ErrorState: Story = {
  name: 'Error',
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Select {...args} required error errorText="Choose a fruit" />
      <Select {...args} variant="outlined" error defaultValue="grape" errorText="Out of stock" />
    </div>
  ),
}

/**
 * Open listbox (VRT): matches the field's width, selected option (check mark,
 * 12dp corners) and a disabled option.
 */
export const Open: Story = {
  render: (args) => (
    <div style={{ paddingBottom: 300 }}>
      <Select {...args} defaultOpen defaultValue="banana" placeholder="Pick one" />
    </div>
  ),
}
