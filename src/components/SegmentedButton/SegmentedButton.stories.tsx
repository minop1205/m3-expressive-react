import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import CalendarDayIcon from '@material-symbols/svg-400/outlined/calendar_view_day.svg?react'
import CalendarWeekIcon from '@material-symbols/svg-400/outlined/calendar_view_week.svg?react'
import CalendarMonthIcon from '@material-symbols/svg-400/outlined/calendar_view_month.svg?react'
import WalkIcon from '@material-symbols/svg-400/outlined/directions_walk.svg?react'
import BikeIcon from '@material-symbols/svg-400/outlined/directions_bike.svg?react'
import CarIcon from '@material-symbols/svg-400/outlined/directions_car.svg?react'
import { SegmentedButton } from './SegmentedButton'

const meta = {
  title: 'Components/SegmentedButton',
  component: SegmentedButton,
  parameters: { layout: 'centered' },
  args: {
    options: [
      { value: 'd', label: 'Day' },
      { value: 'w', label: 'Week' },
      { value: 'm', label: 'Month' },
    ],
    value: 'w',
    onChange: () => {},
  },
} satisfies Meta<typeof SegmentedButton>

export default meta
type Story = StoryObj<typeof meta>

const days = [
  { value: 'd', label: 'Day' },
  { value: 'w', label: 'Week' },
  { value: 'm', label: 'Month' },
]

export const SingleSelect: Story = {
  render: () => {
    const [value, setValue] = useState('w')
    return (
      <SegmentedButton
        aria-label="View"
        options={days}
        value={value}
        onChange={(_event, v) => setValue(v as string)}
      />
    )
  },
}

export const MultiSelect: Story = {
  render: () => {
    const [value, setValue] = useState<string[]>(['b', 'i'])
    return (
      <SegmentedButton
        aria-label="Text style"
        multiSelect
        options={[
          { value: 'b', label: 'Bold' },
          { value: 'i', label: 'Italic' },
          { value: 'u', label: 'Underline' },
        ]}
        value={value}
        onChange={(_event, v) => setValue(v as string[])}
      />
    )
  },
}

export const Disabled: Story = {
  render: () => (
    <SegmentedButton
      aria-label="View"
      disabled
      options={days}
      value="w"
      onChange={() => {}}
    />
  ),
}

/** Icon + label: the leading icon crossfades to the check while selected. */
export const IconAndLabel: Story = {
  render: () => {
    const [value, setValue] = useState('w')
    return (
      <SegmentedButton
        aria-label="View"
        options={[
          { value: 'd', label: 'Day', icon: <CalendarDayIcon /> },
          { value: 'w', label: 'Week', icon: <CalendarWeekIcon /> },
          { value: 'm', label: 'Month', icon: <CalendarMonthIcon /> },
        ]}
        value={value}
        onChange={(_event, v) => setValue(v as string)}
      />
    )
  },
}

/**
 * Icon-only: each option carries an `ariaLabel`; the icon stays visible and
 * the check appears beside it while selected.
 */
export const IconOnly: Story = {
  render: () => {
    const [value, setValue] = useState('bike')
    return (
      <SegmentedButton
        aria-label="Travel mode"
        options={[
          { value: 'walk', icon: <WalkIcon />, ariaLabel: 'Walking' },
          { value: 'bike', icon: <BikeIcon />, ariaLabel: 'Cycling' },
          { value: 'car', icon: <CarIcon />, ariaLabel: 'Driving' },
        ]}
        value={value}
        onChange={(_event, v) => setValue(v as string)}
      />
    )
  },
}

/** A single disabled segment (selected and unselected neighbors stay enabled). */
export const DisabledSegment: Story = {
  render: () => {
    const [value, setValue] = useState('d')
    return (
      <SegmentedButton
        aria-label="View"
        options={[
          { value: 'd', label: 'Day' },
          { value: 'w', label: 'Week', disabled: true },
          { value: 'm', label: 'Month' },
        ]}
        value={value}
        onChange={(_event, v) => setValue(v as string)}
      />
    )
  },
}

/** Right-to-left: outer corners and Left / Right arrow keys mirror. */
export const RightToLeft: Story = {
  render: () => {
    const [value, setValue] = useState('w')
    return (
      <div dir="rtl">
        <SegmentedButton
          aria-label="View"
          options={days}
          value={value}
          onChange={(_event, v) => setValue(v as string)}
        />
      </div>
    )
  },
}
