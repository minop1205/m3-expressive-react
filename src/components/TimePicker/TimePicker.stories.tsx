import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { TimePicker, type TimeValue } from './TimePicker'

const meta = {
  title: 'Components/TimePicker',
  component: TimePicker,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof TimePicker>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => {
    const [time, setTime] = useState<TimeValue>({ hour: 10, minute: 30 })
    return (
      <div>
        <TimePicker value={time} onChange={setTime} />
        <p>
          {String(time.hour).padStart(2, '0')}:{String(time.minute).padStart(2, '0')}
        </p>
      </div>
    )
  },
}

/** Keyboard entry (m3 "time input"): 96×72 fields with Hour / Minute supporting text. */
export const InputMode: Story = {
  render: () => {
    const [time, setTime] = useState<TimeValue>({ hour: 10, minute: 30 })
    return <TimePicker mode="input" value={time} onChange={setTime} />
  },
}
