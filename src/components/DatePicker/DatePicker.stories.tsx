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

// Fixed dates keep snapshots idempotent. June 2026 matches the frozen clock in
// .storybook/preview.tsx (VRT captures), so the today marker (15th) is visible
// alongside the selection.
export const Modal: Story = {
  render: () => {
    const [date, setDate] = useState<Date | null>(new Date(2026, 5, 10))
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
    const [range, setRange] = useState<DateRange>([new Date(2026, 5, 5), new Date(2026, 5, 12)])
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
