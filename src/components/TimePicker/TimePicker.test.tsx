import { createRef } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { TimePicker } from './TimePicker'

describe('TimePicker', () => {
  it('shows the current time in 12-hour form', () => {
    render(<TimePicker value={{ hour: 13, minute: 5 }} />)
    expect(screen.getByRole('button', { name: 'Hour' })).toHaveTextContent('01')
    expect(screen.getByRole('button', { name: 'Minute' })).toHaveTextContent('05')
    expect(screen.getByRole('button', { name: 'PM' })).toHaveAttribute('data-selected', 'true')
  })

  it('sets the hour from the dial', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<TimePicker value={{ hour: 10, minute: 0 }} onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: '3' }))
    expect(onChange).toHaveBeenCalledWith({ hour: 3, minute: 0 })
  })

  it('switches to minutes and sets one', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<TimePicker value={{ hour: 10, minute: 0 }} onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: 'Minute' }))
    await user.click(screen.getByRole('button', { name: '15' }))
    expect(onChange).toHaveBeenCalledWith({ hour: 10, minute: 15 })
  })

  it('toggles AM/PM', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<TimePicker value={{ hour: 10, minute: 0 }} onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: 'PM' }))
    expect(onChange).toHaveBeenCalledWith({ hour: 22, minute: 0 })
  })

  it('toggles between dial and input mode', async () => {
    const user = userEvent.setup()
    render(<TimePicker value={{ hour: 10, minute: 0 }} />)
    // Dial mode: hour is a button.
    expect(screen.getByRole('button', { name: 'Hour' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Toggle input picker' }))
    // Input mode: hour is a textbox, dial numbers gone.
    expect(screen.getByRole('textbox', { name: 'Hour' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '3' })).not.toBeInTheDocument()
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
