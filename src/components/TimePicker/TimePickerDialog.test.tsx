import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { TimePicker, type TimePickerCloseReason, type TimeValue } from './TimePicker'

function firePointer(el: Element, type: string, props: Record<string, unknown>) {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.assign(event, { pointerId: 1, pointerType: 'mouse', button: 0, ...props })
  fireEvent(el, event)
}

function getDial(name: string) {
  const dial = screen.getByRole('group', { name })
  dial.getBoundingClientRect = () =>
    ({ left: 0, top: 0, right: 256, bottom: 256, width: 256, height: 256, x: 0, y: 0 }) as DOMRect
  return dial
}

const at = (deg: number, r: number) => ({
  clientX: 128 + r * Math.sin((deg * Math.PI) / 180),
  clientY: 128 - r * Math.cos((deg * Math.PI) / 180),
})

describe('TimePicker display mode (B6)', () => {
  it('defaultMode sets the initial mode (uncontrolled)', async () => {
    const user = userEvent.setup()
    const onModeChange = vi.fn()
    render(<TimePicker defaultMode="input" onModeChange={onModeChange} />)
    expect(screen.getByRole('textbox', { name: 'Hour' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Toggle dial picker' }))
    expect(onModeChange).toHaveBeenCalledWith('dial')
    expect(screen.getByRole('group', { name: 'Hour' })).toBeInTheDocument()
  })

  it('mode + onModeChange is controlled', async () => {
    const user = userEvent.setup()
    const onModeChange = vi.fn()
    const { rerender } = render(<TimePicker mode="dial" onModeChange={onModeChange} />)
    await user.click(screen.getByRole('button', { name: 'Toggle input picker' }))
    expect(onModeChange).toHaveBeenCalledWith('input')
    // Still the dial until the parent updates `mode`.
    expect(screen.getByRole('group', { name: 'Hour' })).toBeInTheDocument()
    rerender(<TimePicker mode="input" onModeChange={onModeChange} />)
    expect(screen.getByRole('textbox', { name: 'Hour' })).toBeInTheDocument()
  })

  it('mode alone keeps the deprecated v1.0 initial-mode behavior', async () => {
    const user = userEvent.setup()
    render(<TimePicker mode="input" />)
    expect(screen.getByRole('textbox', { name: 'Hour' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Toggle dial picker' }))
    expect(screen.getByRole('group', { name: 'Hour' })).toBeInTheDocument()
  })

  it('showModeToggle={false} hides the toggle', () => {
    render(<TimePicker showModeToggle={false} />)
    expect(screen.queryByRole('button', { name: /Toggle/ })).not.toBeInTheDocument()
  })
})

describe('TimePicker actions (B6)', () => {
  it('has no headline or actions by default', () => {
    render(<TimePicker />)
    expect(screen.queryByText('Select time')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'OK' })).not.toBeInTheDocument()
  })

  it('onAccept adds the headline and Cancel / OK; OK commits the draft', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const onAccept = vi.fn()
    render(
      <TimePicker defaultValue={{ hour: 10, minute: 0 }} onChange={onChange} onAccept={onAccept} />,
    )
    expect(screen.getByText('Select time')).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'PM' }))
    expect(onChange).toHaveBeenLastCalledWith({ hour: 22, minute: 0 })
    expect(onAccept).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'OK' }))
    expect(onAccept).toHaveBeenCalledWith({ hour: 22, minute: 0 })
  })

  it('Cancel reverts the draft to the last accepted value', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const onCancel = vi.fn()
    const onAccept = vi.fn()
    render(
      <TimePicker
        defaultValue={{ hour: 10, minute: 0 }}
        onChange={onChange}
        onAccept={onAccept}
        onCancel={onCancel}
      />,
    )
    await user.click(screen.getByRole('radio', { name: 'PM' }))
    await user.click(screen.getByRole('button', { name: 'OK' }))
    await user.click(screen.getByRole('radio', { name: 'AM' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenLastCalledWith({ hour: 22, minute: 0 })
    expect(screen.getByRole('radio', { name: 'PM' })).toBeChecked()
  })

  it('input mode: "Enter time" headline, Enter in the minute field accepts', async () => {
    const user = userEvent.setup()
    const onAccept = vi.fn()
    render(<TimePicker defaultMode="input" defaultValue={{ hour: 10, minute: 0 }} onAccept={onAccept} />)
    expect(screen.getByText('Enter time')).toBeInTheDocument()
    await user.click(screen.getByRole('textbox', { name: 'Minute' }))
    await user.keyboard('45{Enter}')
    expect(onAccept).toHaveBeenCalledWith({ hour: 10, minute: 45 })
  })

  it('localizes the built-in strings (B1)', () => {
    render(
      <TimePicker
        defaultValue={{ hour: 10, minute: 0 }}
        onAccept={() => {}}
        titleLabel="時刻を選択"
        okLabel="決定"
        cancelLabel="キャンセル"
        selectHourLabel="時を選択"
        selectMinuteLabel="分を選択"
        periodLabel="午前または午後"
        amLabel="午前"
        pmLabel="午後"
        hourLabel="時"
        switchToInputLabel="入力に切り替え"
      />,
    )
    expect(screen.getByText('時刻を選択')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '決定' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'キャンセル' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '時を選択' })).toBeChecked()
    expect(screen.getByRole('radio', { name: '分を選択' })).toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: '午前または午後' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '午前' })).toBeChecked()
    expect(screen.getByRole('group', { name: '時' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '入力に切り替え' })).toBeInTheDocument()
  })

  it('localizes the input error (B1)', () => {
    render(
      <TimePicker
        defaultMode="input"
        defaultValue={{ hour: 10, minute: 0 }}
        getErrorLabel={(field) => (field === 'minute' ? '分は0〜59' : '時は1〜12')}
      />,
    )
    const minute = screen.getByRole('textbox', { name: 'Minute' })
    minute.focus()
    fireEvent.change(minute, { target: { value: '75' } })
    expect(minute).toHaveAccessibleDescription('分は0〜59')
  })
})

function ModalHarness({
  onClose,
  onAccept,
  onChange,
}: {
  onClose: (reason: TimePickerCloseReason) => void
  onAccept?: (value: TimeValue) => void
  onChange?: (value: TimeValue) => void
}) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState<TimeValue>({ hour: 10, minute: 30 })
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      <span data-testid="value">
        {value.hour}:{value.minute}
      </span>
      <TimePicker
        open={open}
        onClose={(reason) => {
          onClose(reason)
          setOpen(false)
        }}
        value={value}
        onChange={(v) => {
          onChange?.(v)
          setValue(v)
        }}
        onAccept={onAccept}
      />
    </>
  )
}

describe('TimePicker modal (open, B6 / B7)', () => {
  it('renders nothing while closed', () => {
    render(<TimePicker open={false} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens as an aria-modal dialog named by the headline, focusing the hour selector', async () => {
    const user = userEvent.setup()
    render(<ModalHarness onClose={() => {}} />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    const dialog = screen.getByRole('dialog', { name: 'Select time' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByRole('radio', { name: 'Select hour' })).toHaveFocus()
    expect(await axe(document.body)).toHaveNoViolations()
  })

  it('OK closes with "accept" and restores focus', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const onAccept = vi.fn()
    render(<ModalHarness onClose={onClose} onAccept={onAccept} />)
    const opener = screen.getByRole('button', { name: 'Open' })
    await user.click(opener)
    await user.click(screen.getByRole('radio', { name: 'PM' }))
    await user.click(screen.getByRole('button', { name: 'OK' }))
    expect(onAccept).toHaveBeenCalledWith({ hour: 22, minute: 30 })
    expect(onClose).toHaveBeenCalledWith('accept')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
    expect(screen.getByTestId('value')).toHaveTextContent('22:30')
  })

  it.each([
    ['cancel', async (user: ReturnType<typeof userEvent.setup>) => {
      await user.click(screen.getByRole('button', { name: 'Cancel' }))
    }],
    ['escapeKeyDown', async (user: ReturnType<typeof userEvent.setup>) => {
      await user.keyboard('{Escape}')
    }],
    ['backdropClick', async () => {
      const scrim = screen.getByRole('dialog').parentElement!.firstElementChild!
      fireEvent.click(scrim)
    }],
  ] as const)('%s reverts the draft and closes with that reason', async (reason, act) => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<ModalHarness onClose={onClose} />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    await user.click(screen.getByRole('radio', { name: 'PM' }))
    expect(screen.getByTestId('value')).toHaveTextContent('22:30')
    await act(user)
    expect(onClose).toHaveBeenCalledWith(reason)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByTestId('value')).toHaveTextContent('10:30')
  })

  it('traps focus inside the dialog', async () => {
    const user = userEvent.setup()
    render(<ModalHarness onClose={() => {}} />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    const dialog = screen.getByRole('dialog')
    for (let i = 0; i < 8; i++) {
      await user.tab()
      expect(dialog).toContainElement(document.activeElement as HTMLElement)
    }
  })
})

describe('TimePicker 24-hour clock (B8)', () => {
  it('defaults from the locale: en-US is 12h, ja-JP / en-GB are 24h', () => {
    const { rerender } = render(<TimePicker defaultValue={{ hour: 18, minute: 0 }} />)
    expect(screen.getByRole('radiogroup', { name: 'AM or PM' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Select hour' })).toHaveTextContent('06')
    rerender(<TimePicker defaultValue={{ hour: 18, minute: 0 }} locale="ja-JP" />)
    expect(screen.queryByRole('radiogroup', { name: 'AM or PM' })).not.toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Select hour' })).toHaveTextContent('18')
    rerender(<TimePicker defaultValue={{ hour: 18, minute: 0 }} locale="en-GB" />)
    expect(screen.getByRole('radio', { name: 'Select hour' })).toHaveTextContent('18')
  })

  it('ampm overrides the locale', () => {
    const { rerender } = render(<TimePicker ampm={false} defaultValue={{ hour: 9, minute: 0 }} />)
    expect(screen.queryByRole('radio', { name: 'AM' })).not.toBeInTheDocument()
    rerender(<TimePicker ampm locale="ja-JP" defaultValue={{ hour: 9, minute: 0 }} />)
    expect(screen.getByRole('radio', { name: 'AM' })).toBeChecked()
  })

  it('shows 0–11 on the outer ring and 12–23 on the inner ring, named in hours', () => {
    const { container } = render(<TimePicker ampm={false} defaultValue={{ hour: 18, minute: 0 }} />)
    const names = screen
      .getAllByRole('button', { name: /hours$/ })
      .map((b) => b.getAttribute('aria-label'))
    expect(names).toEqual(Array.from({ length: 24 }, (_, h) => `${h} hours`))
    expect(screen.getByRole('button', { name: '18 hours' })).toHaveAttribute('aria-current', 'time')
    expect(screen.getByRole('radio', { name: 'Select hour' })).toHaveAccessibleDescription('18 hours')
    // Inner ring radius 69 vs outer 101 (256dp dial, center 128).
    const style = (name: string) => screen.getByRole('button', { name }).style
    expect(parseFloat(style('0 hours').top)).toBeCloseTo(128 - 101)
    expect(parseFloat(style('12 hours').top)).toBeCloseTo(128 - 69)
    // The handle sits on the inner ring for 12–23.
    const handle = container.querySelector('[class*=handle]') as HTMLElement
    expect(parseFloat(handle.style.top)).toBe(128 - 69 - 24)
  })

  it('arrow keys loop outer → inner → outer', async () => {
    const user = userEvent.setup()
    render(<TimePicker ampm={false} defaultValue={{ hour: 11, minute: 0 }} />)
    screen.getByRole('button', { name: '11 hours' }).focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('button', { name: '12 hours' })).toHaveFocus()
    screen.getByRole('button', { name: '23 hours' }).focus()
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('button', { name: '0 hours' })).toHaveFocus()
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('button', { name: '23 hours' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('radio', { name: 'Select hour' })).toHaveTextContent('23')
  })

  it('a tap nearer than 74dp to the center picks the inner ring', () => {
    const onChange = vi.fn()
    render(<TimePicker ampm={false} defaultValue={{ hour: 9, minute: 0 }} onChange={onChange} />)
    const dial = getDial('Hour')
    firePointer(dial, 'pointerdown', at(90, 69))
    firePointer(dial, 'pointerup', at(90, 69))
    expect(onChange).toHaveBeenLastCalledWith({ hour: 15, minute: 0 })
  })

  it('a tap on the outer ring and at 12 o’clock picks 0 / 12 correctly', () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <TimePicker ampm={false} value={{ hour: 9, minute: 0 }} onChange={onChange} />,
    )
    let dial = getDial('Hour')
    firePointer(dial, 'pointerdown', at(0, 101))
    firePointer(dial, 'pointerup', at(0, 101))
    expect(onChange).toHaveBeenLastCalledWith({ hour: 0, minute: 0 })
    rerender(<TimePicker ampm={false} value={{ hour: 9, minute: 0 }} onChange={onChange} />)
    dial = getDial('Hour')
    firePointer(dial, 'pointerdown', at(0, 60))
    firePointer(dial, 'pointerup', at(0, 60))
    expect(onChange).toHaveBeenLastCalledWith({ hour: 12, minute: 0 })
  })

  it('dragging across the 74dp boundary moves between the rings', () => {
    const onChange = vi.fn()
    render(<TimePicker ampm={false} defaultValue={{ hour: 9, minute: 0 }} onChange={onChange} />)
    const dial = getDial('Hour')
    firePointer(dial, 'pointerdown', at(200, 101))
    firePointer(dial, 'pointermove', at(210, 90))
    expect(onChange).toHaveBeenLastCalledWith({ hour: 7, minute: 0 })
    firePointer(dial, 'pointermove', at(240, 60))
    expect(onChange).toHaveBeenLastCalledWith({ hour: 20, minute: 0 })
  })

  it('input mode validates 0–23 and keeps a lone 0 / 1 / 2 in the hour field', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <TimePicker ampm={false} defaultMode="input" value={{ hour: 9, minute: 0 }} onChange={onChange} />,
    )
    const hour = screen.getByRole('textbox', { name: 'Hour' })
    const minute = screen.getByRole('textbox', { name: 'Minute' })
    expect(hour).toHaveValue('09')
    await user.click(hour)
    await user.keyboard('2')
    // "2" may start 20–23: no auto-advance yet; 2 is a valid hour.
    expect(hour).toHaveFocus()
    expect(onChange).toHaveBeenLastCalledWith({ hour: 2, minute: 0 })
    await user.keyboard('3')
    expect(onChange).toHaveBeenLastCalledWith({ hour: 23, minute: 0 })
    expect(minute).toHaveFocus()
    await user.click(hour)
    await user.keyboard('0')
    expect(onChange).toHaveBeenLastCalledWith({ hour: 0, minute: 0 })
    await user.clear(hour)
    await user.keyboard('24')
    expect(hour).toHaveAttribute('aria-invalid', 'true')
    expect(hour).toHaveAccessibleDescription('Hour must be 0–23')
    await user.clear(hour)
    await user.keyboard('5')
    // 5 can't start a 2-digit 24h hour → advance.
    expect(minute).toHaveFocus()
    expect(onChange).toHaveBeenLastCalledWith({ hour: 5, minute: 0 })
  })

  it('has no axe violations in 24h dial and input modes', async () => {
    const dial = render(<TimePicker ampm={false} defaultValue={{ hour: 18, minute: 30 }} />)
    expect(await axe(dial.container)).toHaveNoViolations()
    dial.unmount()
    const input = render(
      <TimePicker ampm={false} defaultMode="input" defaultValue={{ hour: 18, minute: 30 }} />,
    )
    expect(screen.getByRole('textbox', { name: 'Hour' })).toHaveValue('18')
    expect(await axe(input.container)).toHaveNoViolations()
  })
})
