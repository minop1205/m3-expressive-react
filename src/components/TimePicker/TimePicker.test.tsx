import { createRef } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { TimePicker } from './TimePicker'

function firePointer(el: Element, type: string, props: Record<string, unknown>) {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.assign(event, { pointerId: 1, pointerType: 'mouse', button: 0, ...props })
  fireEvent(el, event)
}

/** The dial group, laid out as a 256×256 box at the origin. */
function getDial(name: 'Hour' | 'Minute' = 'Hour') {
  const dial = screen.getByRole('group', { name })
  dial.getBoundingClientRect = () =>
    ({ left: 0, top: 0, right: 256, bottom: 256, width: 256, height: 256, x: 0, y: 0 }) as DOMRect
  return dial
}

/** A point on the dial at `deg` (clockwise from 12 o'clock) and `r` from the center. */
const at = (deg: number, r = 101) => ({
  clientX: 128 + r * Math.sin((deg * Math.PI) / 180),
  clientY: 128 - r * Math.cos((deg * Math.PI) / 180),
})

describe('TimePicker', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the current time in 12-hour form', () => {
    render(<TimePicker value={{ hour: 13, minute: 5 }} />)
    expect(screen.getByRole('radio', { name: 'Select hour' })).toHaveTextContent('01')
    expect(screen.getByRole('radio', { name: 'Select minutes' })).toHaveTextContent('05')
    expect(screen.getByRole('radio', { name: 'PM' })).toBeChecked()
  })

  describe('radio semantics', () => {
    it('exposes the hour / minute selectors as a radio group with their values', async () => {
      const user = userEvent.setup()
      render(<TimePicker value={{ hour: 10, minute: 30 }} />)
      const hour = screen.getByRole('radio', { name: 'Select hour' })
      const minute = screen.getByRole('radio', { name: 'Select minutes' })
      expect(hour.closest('[role=radiogroup]')).toBe(minute.closest('[role=radiogroup]'))
      expect(hour).toBeChecked()
      expect(minute).not.toBeChecked()
      expect(hour).toHaveAccessibleDescription("10 o'clock")
      expect(minute).toHaveAccessibleDescription('30 minutes')
      // One Tab stop; arrow keys move and select.
      expect(hour).toHaveAttribute('tabindex', '0')
      expect(minute).toHaveAttribute('tabindex', '-1')
      hour.focus()
      await user.keyboard('{ArrowRight}')
      expect(minute).toHaveFocus()
      expect(minute).toBeChecked()
      expect(screen.getByRole('group', { name: 'Minute' })).toBeInTheDocument()
      await user.keyboard('{ArrowRight}')
      expect(hour).toHaveFocus()
      expect(hour).toBeChecked()
    })

    it('exposes AM / PM as a radio group with arrow keys', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      render(<TimePicker defaultValue={{ hour: 10, minute: 0 }} onChange={onChange} />)
      const group = screen.getByRole('radiogroup', { name: 'AM or PM' })
      const am = screen.getByRole('radio', { name: 'AM' })
      const pm = screen.getByRole('radio', { name: 'PM' })
      expect(group).toContainElement(am)
      expect(am).toBeChecked()
      expect(am).toHaveAttribute('tabindex', '0')
      expect(pm).toHaveAttribute('tabindex', '-1')
      am.focus()
      await user.keyboard('{ArrowDown}')
      expect(pm).toHaveFocus()
      expect(pm).toBeChecked()
      expect(onChange).toHaveBeenLastCalledWith({ hour: 22, minute: 0 })
      await user.keyboard('{ArrowUp}')
      expect(am).toBeChecked()
      expect(onChange).toHaveBeenLastCalledWith({ hour: 10, minute: 0 })
    })

    it('toggles AM/PM on click', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      render(<TimePicker value={{ hour: 10, minute: 0 }} onChange={onChange} />)
      await user.click(screen.getByRole('radio', { name: 'PM' }))
      expect(onChange).toHaveBeenCalledWith({ hour: 22, minute: 0 })
    })
  })

  describe('dial', () => {
    it('names the numbers with units and marks the current one', async () => {
      const user = userEvent.setup()
      render(<TimePicker defaultValue={{ hour: 15, minute: 45 }} />)
      const three = screen.getByRole('button', { name: "3 o'clock" })
      expect(three).toHaveAttribute('aria-current', 'time')
      expect(screen.getByRole('button', { name: "4 o'clock" })).not.toHaveAttribute('aria-current')
      expect(screen.getAllByRole('button', { name: /o'clock$/ })).toHaveLength(12)
      await user.click(screen.getByRole('radio', { name: 'Select minutes' }))
      expect(screen.getByRole('button', { name: '45 minutes' })).toHaveAttribute('aria-current', 'time')
      expect(screen.getByRole('button', { name: '0 minutes' })).toBeInTheDocument()
    })

    it('accepts custom hour / minute labels', () => {
      render(
        <TimePicker
          defaultValue={{ hour: 3, minute: 0 }}
          getHourLabel={(h) => `${h}時`}
          getMinuteLabel={(m) => `${m}分`}
        />,
      )
      expect(screen.getByRole('button', { name: '3時' })).toBeInTheDocument()
      expect(screen.getByRole('radio', { name: 'Select minutes' })).toHaveAccessibleDescription('0分')
    })

    it('is a single Tab stop on the selected value, with arrow keys looping the ring', async () => {
      const user = userEvent.setup()
      render(<TimePicker defaultValue={{ hour: 11, minute: 0 }} />)
      const stops = screen
        .getAllByRole('button', { name: /o'clock$/ })
        .filter((b) => b.tabIndex === 0)
      expect(stops.map((b) => b.getAttribute('aria-label'))).toEqual(["11 o'clock"])
      // Tab order: hour selector → AM/PM → dial → mode toggle.
      await user.tab()
      expect(screen.getByRole('radio', { name: 'Select hour' })).toHaveFocus()
      await user.tab()
      expect(screen.getByRole('radio', { name: 'AM' })).toHaveFocus()
      await user.tab()
      expect(screen.getByRole('button', { name: "11 o'clock" })).toHaveFocus()
      await user.keyboard('{ArrowRight}')
      expect(screen.getByRole('button', { name: "12 o'clock" })).toHaveFocus()
      await user.keyboard('{ArrowDown}')
      expect(screen.getByRole('button', { name: "1 o'clock" })).toHaveFocus()
      await user.keyboard('{ArrowLeft}{ArrowLeft}{ArrowUp}')
      expect(screen.getByRole('button', { name: "10 o'clock" })).toHaveFocus()
      await user.tab()
      expect(screen.getByRole('button', { name: 'Toggle input picker' })).toHaveFocus()
    })

    it('Shift+Tab from the dial returns to the active selector', async () => {
      const user = userEvent.setup()
      render(<TimePicker defaultValue={{ hour: 11, minute: 0 }} />)
      screen.getByRole('button', { name: "11 o'clock" }).focus()
      await user.keyboard('{Shift>}{Tab}{/Shift}')
      expect(screen.getByRole('radio', { name: 'Select hour' })).toHaveFocus()
    })

    it('Enter / Space select without switching to minutes', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      render(<TimePicker defaultValue={{ hour: 10, minute: 0 }} onChange={onChange} />)
      screen.getByRole('button', { name: "10 o'clock" }).focus()
      await user.keyboard('{ArrowRight}{Enter}')
      expect(onChange).toHaveBeenLastCalledWith({ hour: 11, minute: 0 })
      await user.keyboard('{ArrowRight} ')
      expect(onChange).toHaveBeenLastCalledWith({ hour: 0, minute: 0 })
      expect(screen.getByRole('button', { name: "12 o'clock" })).toHaveFocus()
      expect(screen.getByRole('radio', { name: 'Select hour' })).toBeChecked()
    })

    it('an in-between minute keeps its angle; the entry is the nearest 5-minute mark', async () => {
      const user = userEvent.setup()
      const { container } = render(<TimePicker defaultValue={{ hour: 10, minute: 7 }} />)
      await user.click(screen.getByRole('radio', { name: 'Select minutes' }))
      const arm = container.querySelector('[class*=arm]') as HTMLElement
      expect(parseFloat(arm.style.transform.slice(7)) % 360).toBe(42)
      expect(screen.getByRole('button', { name: '5 minutes' })).toHaveAttribute('tabindex', '0')
      // 7 is not one of the dial numbers, so none is announced as current.
      expect(
        screen.getAllByRole('button', { name: /minutes$/ }).filter((b) => b.hasAttribute('aria-current')),
      ).toHaveLength(0)
    })

    it('rotates the hand the short way round (11 → 1 turns +60°)', () => {
      vi.useFakeTimers()
      const { container, rerender } = render(<TimePicker value={{ hour: 11, minute: 0 }} />)
      const arm = container.querySelector('[class*=arm]') as HTMLElement
      expect(arm.style.transform).toBe('rotate(330deg)')
      rerender(<TimePicker value={{ hour: 1, minute: 0 }} />)
      expect(arm.style.transform).toBe('rotate(390deg)')
    })

    it('a pointer tap on an hour selects it and switches to minutes after 100ms', () => {
      vi.useFakeTimers()
      const onChange = vi.fn()
      render(<TimePicker defaultValue={{ hour: 10, minute: 0 }} onChange={onChange} />)
      const dial = getDial('Hour')
      firePointer(dial, 'pointerdown', at(90))
      firePointer(dial, 'pointerup', at(90))
      expect(onChange).toHaveBeenLastCalledWith({ hour: 3, minute: 0 })
      expect(screen.getByRole('group', { name: 'Hour' })).toBeInTheDocument()
      act(() => {
        vi.advanceTimersByTime(100)
      })
      expect(screen.getByRole('group', { name: 'Minute' })).toBeInTheDocument()
      expect(screen.getByRole('radio', { name: 'Select minutes' })).toBeChecked()
    })

    it('a pointer tap on minutes snaps to the 5-minute marks', () => {
      const onChange = vi.fn()
      render(<TimePicker defaultValue={{ hour: 10, minute: 0 }} onChange={onChange} />)
      fireEvent.click(screen.getByRole('radio', { name: 'Select minutes' }))
      const dial = getDial('Minute')
      firePointer(dial, 'pointerdown', at(100))
      firePointer(dial, 'pointerup', at(100))
      // 100° ≈ 16.7 min → the 15 mark.
      expect(onChange).toHaveBeenLastCalledWith({ hour: 10, minute: 15 })
    })

    it('dragging the track selects with 1-minute resolution', () => {
      const onChange = vi.fn()
      const { container } = render(
        <TimePicker defaultValue={{ hour: 10, minute: 0 }} onChange={onChange} />,
      )
      fireEvent.click(screen.getByRole('radio', { name: 'Select minutes' }))
      const dial = getDial('Minute')
      firePointer(dial, 'pointerdown', at(0, 60))
      firePointer(dial, 'pointermove', at(20, 60))
      firePointer(dial, 'pointermove', at(43, 60))
      expect(onChange).toHaveBeenLastCalledWith({ hour: 10, minute: 7 })
      // The hand follows the pointer while dragging…
      const arm = container.querySelector('[class*=arm]') as HTMLElement
      expect(parseFloat(arm.style.transform.slice(7)) % 360).toBe(43)
      firePointer(dial, 'pointerup', at(43, 60))
      // …and settles on the selected minute.
      expect(parseFloat(arm.style.transform.slice(7)) % 360).toBe(42)
    })

    it('ending an hour drag switches to minutes', () => {
      const onChange = vi.fn()
      render(<TimePicker defaultValue={{ hour: 10, minute: 0 }} onChange={onChange} />)
      const dial = getDial('Hour')
      firePointer(dial, 'pointerdown', at(90))
      firePointer(dial, 'pointermove', at(120))
      firePointer(dial, 'pointermove', at(150))
      expect(onChange).toHaveBeenLastCalledWith({ hour: 5, minute: 0 })
      firePointer(dial, 'pointerup', at(150))
      expect(screen.getByRole('group', { name: 'Minute' })).toBeInTheDocument()
    })

    it('keeps the PM period when selecting an hour', () => {
      const onChange = vi.fn()
      render(<TimePicker value={{ hour: 22, minute: 0 }} onChange={onChange} />)
      const dial = getDial('Hour')
      firePointer(dial, 'pointerdown', at(0))
      firePointer(dial, 'pointerup', at(0))
      expect(onChange).toHaveBeenLastCalledWith({ hour: 12, minute: 0 })
    })

    it('has no axe violations on the minute dial', async () => {
      const { container } = render(<TimePicker value={{ hour: 10, minute: 30 }} />)
      fireEvent.click(screen.getByRole('radio', { name: 'Select minutes' }))
      expect(await axe(container)).toHaveNoViolations()
    })
  })

  it('toggles between dial and input mode', async () => {
    const user = userEvent.setup()
    render(<TimePicker value={{ hour: 10, minute: 0 }} />)
    expect(screen.getByRole('radio', { name: 'Select hour' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Toggle input picker' }))
    // Input mode: hour is a textbox, the dial is gone.
    expect(screen.getByRole('textbox', { name: 'Hour' })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Hour' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Toggle dial picker' }))
    expect(screen.getByRole('group', { name: 'Hour' })).toBeInTheDocument()
  })

  it('edits the time via input fields', () => {
    const onChange = vi.fn()
    render(<TimePicker mode="input" value={{ hour: 10, minute: 0 }} onChange={onChange} />)
    fireEvent.change(screen.getByRole('textbox', { name: 'Minute' }), {
      target: { value: '45' },
    })
    expect(onChange).toHaveBeenCalledWith({ hour: 10, minute: 45 })
  })

  describe('input-mode typing', () => {
    const setup = (value = { hour: 10, minute: 0 }) => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      render(<TimePicker mode="input" value={value} onChange={onChange} />)
      return {
        user,
        onChange,
        hour: screen.getByRole('textbox', { name: 'Hour' }) as HTMLInputElement,
        minute: screen.getByRole('textbox', { name: 'Minute' }) as HTMLInputElement,
      }
    }

    it('exposes a numeric, 2-digit field', () => {
      const { hour } = setup()
      expect(hour).toHaveAttribute('inputmode', 'numeric')
      expect(hour).toHaveAttribute('maxlength', '2')
    })

    it('replaces a full field instead of appending ("10" + "3" never commits 12 AM)', async () => {
      const { user, onChange, hour, minute } = setup()
      await user.type(hour, '3')
      expect(onChange).toHaveBeenCalledTimes(1)
      expect(onChange).toHaveBeenCalledWith({ hour: 3, minute: 0 })
      // 3 can't start a valid 2-digit hour → focus moves to the minute field.
      expect(minute).toHaveFocus()
    })

    it('replaces the field when a raw 3-character value arrives', () => {
      const onChange = vi.fn()
      render(<TimePicker mode="input" value={{ hour: 10, minute: 0 }} onChange={onChange} />)
      const hour = screen.getByRole('textbox', { name: 'Hour' })
      hour.focus()
      fireEvent.change(hour, { target: { value: '103', selectionStart: 3 } })
      expect(onChange).toHaveBeenCalledWith({ hour: 3, minute: 0 })
      expect(onChange).not.toHaveBeenCalledWith({ hour: 0, minute: 0 })
    })

    it('selects the field on focus so typing replaces it', async () => {
      const { user, onChange, hour, minute } = setup()
      await user.click(hour)
      expect(hour.selectionStart).toBe(0)
      expect(hour.selectionEnd).toBe(2)
      await user.keyboard('11')
      expect(onChange).toHaveBeenLastCalledWith({ hour: 11, minute: 0 })
      // Valid 2-digit hour → auto-advance.
      expect(minute).toHaveFocus()
    })

    it('does not auto-advance after a digit that can start a 2-digit hour', async () => {
      const { user, onChange, hour, minute } = setup({ hour: 3, minute: 0 })
      await user.clear(hour)
      await user.type(hour, '1')
      expect(hour).toHaveFocus()
      expect(onChange).toHaveBeenLastCalledWith({ hour: 1, minute: 0 })
      await user.type(hour, '2')
      // 12 AM = midnight.
      expect(onChange).toHaveBeenLastCalledWith({ hour: 0, minute: 0 })
      expect(minute).toHaveFocus()
    })

    it('does not auto-advance on a deletion', async () => {
      const { user, onChange, hour } = setup({ hour: 3, minute: 0 })
      // Backspace the leading "0" of "03" → "3".
      await user.type(hour, '{Backspace}', { initialSelectionStart: 1, initialSelectionEnd: 1 })
      expect(hour).toHaveValue('3')
      expect(hour).toHaveFocus()
      expect(onChange).not.toHaveBeenCalled()
    })

    it('keeps the PM period when typing an hour', async () => {
      const { user, onChange, hour } = setup({ hour: 22, minute: 0 })
      await user.type(hour, '4')
      expect(onChange).toHaveBeenCalledWith({ hour: 16, minute: 0 })
    })

    it('allows an empty field while editing and reverts on blur', async () => {
      const { user, onChange, hour } = setup()
      await user.clear(hour)
      expect(hour).toHaveValue('')
      expect(hour).not.toHaveAttribute('aria-invalid')
      await user.tab()
      expect(hour).toHaveValue('10')
      expect(onChange).not.toHaveBeenCalled()
    })

    it('ignores non-digits', async () => {
      const { user, onChange, minute } = setup()
      await user.clear(minute)
      await user.type(minute, 'a-')
      expect(minute).toHaveValue('')
      expect(onChange).not.toHaveBeenCalled()
    })

    it('shows an error for an out-of-range minute instead of clamping', async () => {
      const { user, onChange, minute } = setup()
      await user.clear(minute)
      await user.type(minute, '75')
      expect(minute).toHaveValue('75')
      expect(minute).toHaveAttribute('aria-invalid', 'true')
      expect(minute).toHaveAccessibleDescription('Minute must be 0–59')
      // "7" was a valid minute; "75" is never committed (nor clamped to 59).
      expect(onChange).toHaveBeenLastCalledWith({ hour: 10, minute: 7 })
      expect(onChange).not.toHaveBeenCalledWith({ hour: 10, minute: 59 })
      // Blur reverts to the last committed value (the controlled value here).
      await user.tab()
      expect(minute).toHaveValue('00')
      expect(minute).not.toHaveAttribute('aria-invalid')
    })

    it('shows an error for an out-of-range hour and does not advance', async () => {
      const { user, onChange, hour } = setup({ hour: 3, minute: 0 })
      await user.clear(hour)
      await user.type(hour, '0')
      // "0" alone is incomplete — no error, no commit.
      expect(hour).toHaveValue('0')
      expect(hour).not.toHaveAttribute('aria-invalid')
      await user.type(hour, '0')
      expect(hour).toHaveValue('00')
      expect(hour).toHaveAttribute('aria-invalid', 'true')
      expect(hour).toHaveAccessibleDescription('Hour must be 1–12')
      expect(hour).toHaveFocus()
      // Enter does not advance from an invalid hour.
      await user.keyboard('{Enter}')
      expect(hour).toHaveFocus()
      expect(onChange).not.toHaveBeenCalled()
    })

    it('flags 13 as an invalid hour', () => {
      const onChange = vi.fn()
      render(<TimePicker mode="input" value={{ hour: 1, minute: 0 }} onChange={onChange} />)
      const hour = screen.getByRole('textbox', { name: 'Hour' })
      hour.focus()
      fireEvent.change(hour, { target: { value: '13' } })
      expect(hour).toHaveAttribute('aria-invalid', 'true')
      expect(onChange).not.toHaveBeenCalled()
    })

    it('advances to the minute field on Enter from a valid hour', async () => {
      const { user, hour, minute } = setup()
      await user.clear(hour)
      await user.type(hour, '1{Enter}')
      expect(minute).toHaveFocus()
    })

    it('has no axe violations in the error state', async () => {
      const { container } = render(<TimePicker mode="input" value={{ hour: 10, minute: 0 }} />)
      const minute = screen.getByRole('textbox', { name: 'Minute' })
      minute.focus()
      fireEvent.change(minute, { target: { value: '75' } })
      expect(minute).toHaveAttribute('aria-invalid', 'true')
      expect(await axe(container)).toHaveNoViolations()
    })
  })

  it('forwards a ref', () => {
    const ref = createRef<HTMLDivElement>()
    render(<TimePicker ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('has no axe violations', async () => {
    const { container } = render(<TimePicker value={{ hour: 10, minute: 30 }} />)
    expect(await axe(container)).toHaveNoViolations()
  })
})
