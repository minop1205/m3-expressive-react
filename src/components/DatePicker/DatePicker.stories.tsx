import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { DatePicker } from './DatePicker'

const meta = {
  title: 'Components/DatePicker',
  component: DatePicker,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof DatePicker>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => {
    const [date, setDate] = useState<Date | null>(new Date())
    return (
      <div>
        <DatePicker value={date} onChange={setDate} />
        <p>Selected: {date ? date.toDateString() : '—'}</p>
      </div>
    )
  },
}
