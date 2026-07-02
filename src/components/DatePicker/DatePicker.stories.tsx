import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { DatePicker, type DateRange } from './DatePicker'
import { DatePickerField } from './DatePickerField'

const meta = {
  title: 'Components/DatePicker',
  component: DatePicker,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof DatePicker>

export default meta
type Story = StoryObj<typeof meta>

export const Modal: Story = {
  render: () => {
    const [date, setDate] = useState<Date | null>(new Date())
    return (
      <div>
        <DatePicker value={date} onChange={(d) => setDate(d as Date)} />
        <p>Selected: {date ? date.toDateString() : '—'}</p>
      </div>
    )
  },
}

export const Range: Story = {
  render: () => {
    const [range, setRange] = useState<DateRange>([null, null])
    return (
      <div>
        <DatePicker range value={range} onChange={(v) => setRange(v as DateRange)} />
        <p>
          {range[0]?.toDateString() ?? 'start'} → {range[1]?.toDateString() ?? 'end'}
        </p>
      </div>
    )
  },
}

export const Docked: StoryObj<typeof DatePickerField> = {
  render: () => {
    const [date, setDate] = useState<Date | null>(null)
    return <DatePickerField value={date} onChange={setDate} label="Event date" />
  },
}
