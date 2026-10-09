import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DatePicker, type DateRange } from './DatePicker'
import { DatePickerField } from './DatePickerField'
import { daysInMonth, formatDateInput, parseDateInput, startOfDay } from './dateUtils'

// Regression tests for #415 (picker edge cases).

const day = (n: number) =>
  screen.getByRole('gridcell', { name: new RegExp(`\\b${n}, \\d{4}$`) })
const focused = () => document.activeElement as HTMLElement

describe('DatePicker keyboard focus stays within [min, max] (#415)', () => {
  it('arrows stop at max / min', async () => {
    const user = userEvent.setup()
    render(
      <DatePicker
        value={new Date(2024, 5, 30)}
        min={new Date(2024, 5, 1)}
        max={new Date(2024, 5, 30)}
      />,
    )
    day(30).focus()
    await user.keyboard('{ArrowRight}')
    expect(focused()).toHaveAccessibleName('Sunday, June 30, 2024')
    await user.keyboard('{ArrowDown}')
    expect(focused()).toHaveAccessibleName('Sunday, June 30, 2024')
    expect(screen.getByRole('grid', { name: 'June 2024' })).toBeInTheDocument()
    await user.keyboard('{Home}{ArrowLeft}{ArrowUp}')
    expect(focused()).toHaveAccessibleName('Saturday, June 1, 2024')
    expect(screen.getByRole('grid', { name: 'June 2024' })).toBeInTheDocument()
  })

  it('PageDown / Shift+PageDown clamp to max, PageUp / Shift+PageUp to min', async () => {
    const user = userEvent.setup()
    render(
      <DatePicker
        value={new Date(2024, 6, 15)}
        min={new Date(2024, 6, 10)}
        max={new Date(2024, 6, 20)}
      />,
    )
    day(15).focus()
    await user.keyboard('{PageDown}')
    expect(focused()).toHaveAccessibleName('Saturday, July 20, 2024')
    await user.keyboard('{Shift>}{PageDown}{PageDown}{/Shift}')
    expect(focused()).toHaveAccessibleName('Saturday, July 20, 2024')
    expect(screen.getByRole('grid', { name: 'July 2024' })).toBeInTheDocument()
    await user.keyboard('{PageUp}')
    expect(focused()).toHaveAccessibleName('Wednesday, July 10, 2024')
    await user.keyboard('{Shift>}{PageUp}{/Shift}')
    expect(focused()).toHaveAccessibleName('Wednesday, July 10, 2024')
    expect(screen.getByRole('grid', { name: 'July 2024' })).toBeInTheDocument()
  })

  it('stays within Compose 1900–2100 when unbounded', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<DatePicker value={new Date(2100, 11, 15)} />)
    day(15).focus()
    await user.keyboard('{Shift>}{PageDown}{/Shift}')
    expect(focused()).toHaveAccessibleName('Friday, December 31, 2100')
    await user.keyboard('{Shift>}{PageDown}{/Shift}{PageDown}{ArrowRight}')
    expect(focused()).toHaveAccessibleName('Friday, December 31, 2100')
    expect(screen.getByRole('grid', { name: 'December 2100' })).toBeInTheDocument()
    unmount()

    render(<DatePicker value={new Date(1900, 0, 15)} />)
    day(15).focus()
    await user.keyboard('{Shift>}{PageUp}{/Shift}{PageUp}{ArrowLeft}')
    expect(focused()).toHaveAccessibleName('Monday, January 1, 1900')
    expect(screen.getByRole('grid', { name: 'January 1900' })).toBeInTheDocument()
  })
})

describe('modal DatePicker reopens on the month of the value (#415)', () => {
  it('drops the month browsed before closing', async () => {
    const user = userEvent.setup()
    function Harness() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Pick
          </button>
          <DatePicker
            open={open}
            value={new Date(2024, 6, 4)}
            onClose={() => setOpen(false)}
          />
        </>
      )
    }
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Pick' }))
    await user.click(screen.getByRole('button', { name: 'Next month' }))
    await user.click(screen.getByRole('button', { name: 'Next month' }))
    expect(screen.getByRole('grid', { name: 'September 2024' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await user.click(screen.getByRole('button', { name: 'Pick' }))
    expect(screen.getByRole('grid', { name: 'July 2024' })).toBeInTheDocument()
    expect(focused()).toHaveAccessibleName('Thursday, July 4, 2024')
  })
})

describe('DatePickerField re-picking the selected date (#415)', () => {
  it('resets the text and clears the error', async () => {
    const user = userEvent.setup()
    render(<DatePickerField defaultValue={new Date(2024, 6, 10)} />)
    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, 'garbage{Enter}')
    expect(screen.getByRole('alert')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Open calendar' }))
    await user.click(screen.getByRole('gridcell', { name: /July 10, 2024/ }))
    expect(input).toHaveValue('07/10/2024')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('DatePicker input mode re-syncs its text (#415)', () => {
  it('reverts the typed text on Cancel', async () => {
    const user = userEvent.setup()
    render(<DatePicker defaultMode="input" defaultValue={new Date(2024, 6, 4)} onCancel={() => {}} />)
    const input = () => screen.getByRole('textbox', { name: 'Date' })
    await user.clear(input())
    await user.type(input(), '7/20/2024{Tab}') // blur commits a draft (Enter would accept)
    expect(screen.getByText(/Jul 20/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByText(/Jul 4/)).toBeInTheDocument()
    expect(input()).toHaveValue('07/04/2024')
  })

  it('drops rejected text and its error on Cancel', async () => {
    const user = userEvent.setup()
    render(<DatePicker defaultMode="input" defaultValue={new Date(2024, 6, 4)} onCancel={() => {}} />)
    const input = () => screen.getByRole('textbox', { name: 'Date' })
    await user.clear(input())
    await user.type(input(), 'nope{Enter}')
    expect(screen.getByRole('alert')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(input()).toHaveValue('07/04/2024')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('follows a controlled value changed from outside', () => {
    const { rerender } = render(<DatePicker mode="input" value={new Date(2024, 6, 4)} />)
    expect(screen.getByRole('textbox', { name: 'Date' })).toHaveValue('07/04/2024')
    rerender(<DatePicker mode="input" value={new Date(2025, 0, 2)} />)
    expect(screen.getByRole('textbox', { name: 'Date' })).toHaveValue('01/02/2025')
    rerender(<DatePicker range mode="input" value={[new Date(2024, 6, 1), null]} />)
    rerender(
      <DatePicker range mode="input" value={[new Date(2024, 6, 1), new Date(2024, 6, 9)]} />,
    )
    expect(screen.getByRole('textbox', { name: 'End date' })).toHaveValue('07/09/2024')
  })
})

describe('dateUtils years 0–99 (#415)', () => {
  it('parseDateInput keeps the typed year', () => {
    const d = parseDateInput('01/15/0024', 'en-US')
    expect(d?.getFullYear()).toBe(24)
    expect(d?.getMonth()).toBe(0)
    expect(d?.getDate()).toBe(15)
    // Year 0 is a leap year (1900 is not).
    expect(parseDateInput('02/29/0000', 'en-US')?.getFullYear()).toBe(0)
    expect(parseDateInput('0096-02-29', 'en-US')?.getFullYear()).toBe(96)
  })

  it('daysInMonth uses the literal year', () => {
    expect(daysInMonth(0, 1)).toBe(29)
    expect(daysInMonth(1900, 1)).toBe(28)
  })

  it('startOfDay and formatDateInput keep the year', () => {
    const d = new Date(2000, 0, 15, 13, 30)
    d.setFullYear(24)
    expect(startOfDay(d).getFullYear()).toBe(24)
    expect(startOfDay(d).getHours()).toBe(0)
    expect(formatDateInput(startOfDay(d), 'en-US')).toBe('01/15/0024')
  })
})

describe('DatePicker range values with a time of day (#415)', () => {
  it('a grid click on the start day completes a same-day range', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DatePicker range value={[new Date(2024, 6, 10, 15, 0), null]} onChange={onChange} />)
    await user.click(day(10))
    expect(onChange).toHaveBeenLastCalledWith([new Date(2024, 6, 10), new Date(2024, 6, 10)])
  })

  it('input mode accepts an end date on the start day', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <DatePicker
        range
        defaultMode="input"
        value={[new Date(2024, 6, 10, 15, 0), null]}
        onChange={onChange}
      />,
    )
    await user.type(screen.getByRole('textbox', { name: 'End date' }), '7/10/2024{Enter}')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(onChange).toHaveBeenLastCalledWith([new Date(2024, 6, 10), new Date(2024, 6, 10)])
  })
})

describe('inline DatePicker Cancel uses the latest controlled value (#415)', () => {
  it('reverts to a value loaded after mount', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    function Harness() {
      const [value, setValue] = useState<Date | DateRange | null>(new Date(2024, 6, 4))
      return (
        <>
          <button type="button" onClick={() => setValue(new Date(2024, 6, 14))}>
            Load
          </button>
          <DatePicker
            value={value}
            onChange={(v) => {
              onChange(v)
              setValue(v)
            }}
            onCancel={() => {}}
          />
        </>
      )
    }
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Load' }))
    await user.click(day(20))
    expect(onChange).toHaveBeenLastCalledWith(new Date(2024, 6, 20))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onChange).toHaveBeenLastCalledWith(new Date(2024, 6, 14))
    expect(day(14)).toHaveAttribute('aria-selected', 'true')
  })
})
