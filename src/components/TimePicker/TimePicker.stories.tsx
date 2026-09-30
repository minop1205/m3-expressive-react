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
    return <TimePicker defaultMode="input" value={time} onChange={setTime} />
  },
}

/**
 * 24-hour clock (`ampm={false}`, or a 24-hour `locale` such as `ja-JP`):
 * 114dp selectors, no AM/PM, and an inner 12–23 ring on the hour dial.
 */
export const TwentyFourHour: Story = {
  render: () => {
    const [time, setTime] = useState<TimeValue>({ hour: 18, minute: 30 })
    return <TimePicker ampm={false} value={time} onChange={setTime} />
  },
}

/**
 * `onAccept` / `onCancel` add the "Select time" headline and Cancel / OK:
 * `onChange` tracks the draft, OK commits it, Cancel reverts it.
 */
export const WithActions: Story = {
  render: () => {
    const [draft, setDraft] = useState<TimeValue>({ hour: 10, minute: 30 })
    const [saved, setSaved] = useState<TimeValue>(draft)
    return (
      <div>
        <TimePicker value={draft} onChange={setDraft} onAccept={setSaved} onCancel={() => {}} />
        <p>
          Saved: {String(saved.hour).padStart(2, '0')}:{String(saved.minute).padStart(2, '0')}
        </p>
      </div>
    )
  },
}

/** `open` shows the picker as a modal dialog (Compose TimePickerDialog). */
export const ModalDialog: Story = {
  render: () => {
    const [open, setOpen] = useState(true)
    const [draft, setDraft] = useState<TimeValue>({ hour: 10, minute: 30 })
    const [saved, setSaved] = useState<TimeValue>(draft)
    return (
      <div>
        <button type="button" onClick={() => setOpen(true)}>
          Pick a time
        </button>
        <p>
          Saved: {String(saved.hour).padStart(2, '0')}:{String(saved.minute).padStart(2, '0')}
        </p>
        <TimePicker
          open={open}
          onClose={() => setOpen(false)}
          value={draft}
          onChange={setDraft}
          onAccept={setSaved}
        />
      </div>
    )
  },
}
