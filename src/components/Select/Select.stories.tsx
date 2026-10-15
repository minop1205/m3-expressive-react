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
    tonal: { control: 'boolean' },
    labelPlacement: { control: 'inline-radio', options: ['floating', 'above'] },
    shrinkLabel: { control: 'boolean' },
    openOnFocus: { control: 'boolean' },
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

/** A field start icon, and option start icons (kept on the selected option — B52). */
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
 * Open listbox (VRT): matches the field's width, the m3 select menu tokens
 * (B52: surface-container, 4dp, 48dp label-large options), the selected
 * option on surface-container-highest and a disabled option.
 */
export const Open: Story = {
  render: (args) => (
    <div style={{ paddingBottom: 300 }}>
      <Select {...args} defaultOpen defaultValue="banana" placeholder="Pick one" />
    </div>
  ),
}

/**
 * `tonal` (experimental, as TextField `tonal` — Compose `tonalColors()` +
 * `roundedShape`, still `TODO(b/448727879)` upstream).
 */
export const Tonal: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Select {...args} tonal defaultValue="banana" supportingText="Supporting text" />
      <Select {...args} tonal variant="outlined" defaultValue="banana" supportingText="Supporting text" />
      <Select {...args} tonal variant="outlined" startIcon={<Commute />} placeholder="Pick one" />
      <Select {...args} tonal error defaultValue="grape" errorText="Out of stock" />
    </div>
  ),
}

/** `labelPlacement="above"` (B52 — the TextField B37 placement): label above the container. */
export const LabelAbove: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Select {...args} labelPlacement="above" placeholder="Pick one" supportingText="Supporting text" />
      <Select {...args} labelPlacement="above" variant="outlined" defaultValue="banana" required />
    </div>
  ),
}

/** `shrinkLabel` (B52): the label stays minimized and the placeholder shows. */
export const ShrinkLabel: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Select {...args} shrinkLabel placeholder="Pick one" />
      <Select {...args} shrinkLabel variant="outlined" placeholder="Pick one" />
    </div>
  ),
}

/**
 * Options with supporting text (B52 — m3 menu-item supporting text,
 * body-small on-surface-variant). Label and supporting text wrap; the
 * listbox keeps the field's width.
 */
export const OptionSupportingText: Story = {
  render: (args) => (
    <div style={{ paddingBottom: 340 }}>
      <Select {...args} label="Plan" defaultOpen defaultValue="team">
        <Option value="free" supportingText="For one person">
          Free
        </Option>
        <Option value="team" supportingText="Shared projects, roles and a single bill for everyone">
          Team
        </Option>
        <Option value="enterprise" startIcon={<Flight />} supportingText="SSO, audit logs">
          Enterprise with a long name that wraps
        </Option>
        <Option value="legacy" disabled supportingText="No longer offered">
          Legacy
        </Option>
      </Select>
    </div>
  ),
}
