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

/**
 * `variant="vibrant"` — the Expressive style (Compose `vibrantColors()` +
 * `TimePickerShapes` + `VibrantTimePickerDialog`): SurfaceContainer, 100×120
 * Lowest fields with a Primary selection, pill AM / PM, no headline.
 */
export const Vibrant: Story = {
  render: () => {
    const [time, setTime] = useState<TimeValue>({ hour: 10, minute: 30 })
    return (
      <TimePicker
        variant="vibrant"
        value={time}
        onChange={setTime}
        onAccept={() => {}}
        onCancel={() => {}}
      />
    )
  },
}

/** Vibrant keyboard input: 100×120 DisplayLarge fields, error text only. */
export const VibrantInputMode: Story = {
  render: () => {
    const [time, setTime] = useState<TimeValue>({ hour: 10, minute: 30 })
    return <TimePicker variant="vibrant" defaultMode="input" value={time} onChange={setTime} />
  },
}

/**
 * `orientation="horizontal"` (Compose `TimePickerLayoutType.Horizontal`): the
 * time display and a 216×38 AM / PM beside the dial, for landscape layouts.
 */
export const Horizontal: Story = {
  render: () => {
    const [time, setTime] = useState<TimeValue>({ hour: 10, minute: 30 })
    return (
      <TimePicker
        orientation="horizontal"
        value={time}
        onChange={setTime}
        onAccept={() => {}}
        onCancel={() => {}}
      />
    )
  },
}

/** Vibrant + horizontal: 52 between the display and the dial, 216×40 AM / PM. */
export const VibrantHorizontal: Story = {
  render: () => {
    const [time, setTime] = useState<TimeValue>({ hour: 18, minute: 30 })
    return (
      <TimePicker
        variant="vibrant"
        orientation="horizontal"
        value={time}
        onChange={setTime}
        onAccept={() => {}}
        onCancel={() => {}}
      />
    )
  },
}

/**
 * `mode="scroll"` (Compose `TimeScroll`): two endless scroll wheels — wheel,
 * drag, or ArrowUp / ArrowDown. The toggle switches scroll ⇄ input.
 */
export const ScrollMode: Story = {
  render: () => {
    const [time, setTime] = useState<TimeValue>({ hour: 10, minute: 30 })
    return <TimePicker defaultMode="scroll" value={time} onChange={setTime} />
  },
}

/** Scroll mode in the vibrant style (the Compose default for `TimeScroll`), 24-hour. */
export const VibrantScrollMode: Story = {
  render: () => {
    const [time, setTime] = useState<TimeValue>({ hour: 18, minute: 45 })
    return (
      <TimePicker
        variant="vibrant"
        defaultMode="scroll"
        ampm={false}
        value={time}
        onChange={setTime}
        onAccept={() => {}}
        onCancel={() => {}}
      />
    )
  },
}
