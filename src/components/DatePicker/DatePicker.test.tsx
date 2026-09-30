import { createRef } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { DatePicker } from './DatePicker'

/** Day cell by its day-of-month number in the displayed month. */
const day = (n: number) =>
  screen.getByRole('gridcell', { name: new RegExp(`\\b${n}, \\d{4}$`) })

describe('DatePicker', () => {
  it('shows the selected date in the headline', () => {
    render(<DatePicker value={new Date(2024, 6, 4)} locale="en-US" />)
    expect(screen.getByText(/Jul 4/)).toBeInTheDocument()
  })

  it('renders an APG grid with column headers and full-date cells', () => {
    render(<DatePicker value={new Date(2024, 6, 15)} />)
    const grid = screen.getByRole('grid', { name: 'July 2024' })
    const headers = within(grid).getAllByRole('columnheader')
    expect(headers.map((h) => h.querySelector('[class*=visuallyHidden]')?.textContent)).toEqual([
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ])
    const cell = screen.getByRole('gridcell', { name: 'Monday, July 15, 2024' })
    expect(cell).toHaveAttribute('aria-selected', 'true')
    expect(day(16)).toHaveAttribute('aria-selected', 'false')
  })

  it('marks today with aria-current and a Today prefix', () => {
    const now = new Date()
    render(<DatePicker defaultValue={null} />)
    const cell = screen.getByRole('gridcell', { name: /^Today, / })
    expect(cell).toHaveAttribute('aria-current', 'date')
    expect(cell.textContent).toBe(String(now.getDate()))
  })

  it('selects a day on click (uncontrolled)', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DatePicker defaultValue={new Date(2024, 6, 1)} onChange={onChange} />)
    await user.click(day(20))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0][0].getDate()).toBe(20)
    expect(day(20)).toHaveAttribute('aria-selected', 'true')
  })

  it('navigates months', async () => {
    const user = userEvent.setup()
    render(<DatePicker value={new Date(2024, 6, 15)} locale="en-US" />)
    expect(screen.getByRole('grid', { name: 'July 2024' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next month' }))
    expect(screen.getByRole('grid', { name: 'August 2024' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'August 2024' })).toBeInTheDocument()
  })

  it('selects a start then end in range mode and highlights the span', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DatePicker range value={[new Date(2024, 6, 1), null]} onChange={onChange} />)
    // First selecting the end (after the existing start) completes the range.
    await user.click(day(10))
    expect(onChange).toHaveBeenCalledWith([expect.any(Date), expect.any(Date)])
    const [start, end] = onChange.mock.calls[0][0]
    expect(start.getDate()).toBe(1)
    expect(end.getDate()).toBe(10)
  })

  it('marks and names in-range days when both ends are set', () => {
    render(<DatePicker range value={[new Date(2024, 6, 1), new Date(2024, 6, 10)]} />)
    expect(day(5)).toHaveAttribute('data-in-range', 'true')
    expect(day(5)).toHaveAccessibleName('In range, Friday, July 5, 2024')
    expect(day(1)).toHaveAccessibleName('Start date, Monday, July 1, 2024')
    expect(day(10)).toHaveAccessibleName('End date, Wednesday, July 10, 2024')
    expect(day(1)).toHaveAttribute('aria-selected', 'true')
    expect(day(10)).toHaveAttribute('aria-selected', 'true')
  })

  it('always lays out six weeks so the height never jumps', () => {
    // June 2026 needs only five rows; February 2026 (starts Sunday) only four.
    for (const month of [new Date(2026, 5, 10), new Date(2026, 1, 10)]) {
      const { unmount } = render(<DatePicker value={month} />)
      const rows = within(screen.getByRole('grid')).getAllByRole('row')
      expect(rows).toHaveLength(7) // header row + 6 weeks
      for (const row of rows.slice(1)) {
        expect(within(row).getAllByRole('gridcell')).toHaveLength(7)
      }
      unmount()
    }
  })

  it('starts the week on the locale first day', () => {
    const weekdayRow = (locale: string) => {
      const { unmount } = render(<DatePicker value={new Date(2026, 5, 1)} locale={locale} />)
      const text = screen
        .getAllByRole('columnheader')
        .map((el) => el.querySelector('[aria-hidden]')?.textContent)
        .join('')
      unmount()
      return text
    }
    expect(weekdayRow('en-US')).toBe('SMTWTFS')
    expect(weekdayRow('en-GB')).toBe('MTWTFSS')
  })

  it('places the first of the month under its weekday for Monday-first locales', () => {
    // 1 June 2026 is a Monday: first cell in en-GB, second in en-US.
    const cellIndex = (locale: string) => {
      const { unmount } = render(<DatePicker value={new Date(2026, 5, 10)} locale={locale} />)
      const firstWeek = within(screen.getByRole('grid')).getAllByRole('row')[1]
      const index = within(firstWeek)
        .getAllByRole('gridcell')
        .findIndex((el) => el.textContent === '1')
      unmount()
      return index
    }
    expect(cellIndex('en-GB')).toBe(0)
    expect(cellIndex('en-US')).toBe(1)
  })

  it('draws the range band only once both ends are chosen', () => {
    const { rerender } = render(<DatePicker range value={[new Date(2024, 6, 1), null]} />)
    expect(day(1)).not.toHaveAttribute('data-range-start')
    rerender(<DatePicker range value={[new Date(2024, 6, 1), new Date(2024, 6, 3)]} />)
    expect(day(1)).toHaveAttribute('data-range-start', 'true')
    expect(day(3)).toHaveAttribute('data-range-end', 'true')
  })

  it('does not select days outside min / max but keeps them focusable', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <DatePicker
        defaultValue={new Date(2024, 6, 10)}
        min={new Date(2024, 6, 5)}
        max={new Date(2024, 6, 20)}
        onChange={onChange}
      />,
    )
    expect(day(4)).toHaveAttribute('aria-disabled', 'true')
    await user.click(day(4))
    await user.click(day(21))
    expect(onChange).not.toHaveBeenCalled()
    await user.click(day(5))
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('accepts localized labels', () => {
    render(
      <DatePicker
        range
        defaultValue={[new Date(2024, 6, 1), new Date(2024, 6, 3)]}
        titleLabel="日付を選択"
        previousMonthLabel="前の月"
        nextMonthLabel="次の月"
        startDateLabel="開始日"
        endDateLabel="終了日"
        inRangeLabel="期間内"
      />,
    )
    expect(screen.getByText('日付を選択')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '前の月' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '次の月' })).toBeInTheDocument()
    expect(day(2)).toHaveAccessibleName('期間内, Tuesday, July 2, 2024')
  })

  it('follows a controlled value set from outside into view', () => {
    const { rerender } = render(<DatePicker value={new Date(2024, 6, 4)} />)
    expect(screen.getByRole('grid', { name: 'July 2024' })).toBeInTheDocument()
    rerender(<DatePicker value={new Date(2025, 0, 9)} />)
    expect(screen.getByRole('grid', { name: 'January 2025' })).toBeInTheDocument()
  })

  it('forwards a ref', () => {
    const ref = createRef<HTMLDivElement>()
    render(<DatePicker ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('has no axe violations', async () => {
    const { container } = render(<DatePicker value={new Date(2024, 6, 4)} />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('has no axe violations in range mode', async () => {
    const { container } = render(
      <DatePicker range value={[new Date(2024, 6, 4), new Date(2024, 6, 9)]} />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('DatePicker year selection', () => {
  const menu = () => screen.getByRole('button', { name: 'July 2024' })

  it('swaps the grid for a year picker from the month menu button', async () => {
    const user = userEvent.setup()
    render(<DatePicker value={new Date(2024, 6, 15)} />)
    expect(menu()).toHaveAttribute('aria-expanded', 'false')
    await user.click(menu())
    expect(menu()).toHaveAttribute('aria-expanded', 'true')
    const list = screen.getByRole('listbox', { name: 'Select year' })
    expect(menu()).toHaveAttribute('aria-controls', list.id)
    expect(screen.queryByRole('grid')).not.toBeInTheDocument()
    // Compose hides the month arrows while the year picker is shown.
    expect(screen.queryByRole('button', { name: 'Next month' })).not.toBeInTheDocument()
    // Compose default year range 1900–2100; focus lands on the displayed year.
    const options = within(list).getAllByRole('option')
    expect(options[0]).toHaveTextContent('1900')
    expect(options.at(-1)).toHaveTextContent('2100')
    const current = screen.getByRole('option', { name: '2024' })
    expect(current).toHaveAttribute('aria-selected', 'true')
    expect(current).toHaveFocus()
  }, 20_000) // 201 options make role queries slow in jsdom

  it('picks a year, keeps the month and returns to the calendar', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <DatePicker
        defaultValue={new Date(2024, 6, 15)}
        min={new Date(2015, 0, 1)}
        onChange={onChange}
      />,
    )
    await user.click(menu())
    await user.click(screen.getByRole('option', { name: '2019' }))
    expect(screen.getByRole('grid', { name: 'July 2019' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'July 2019' })).toHaveFocus()
    // Changing the displayed year does not change the value.
    expect(onChange).not.toHaveBeenCalled()
  })

  it('moves through years with the keyboard (3 columns)', async () => {
    const user = userEvent.setup()
    render(<DatePicker value={new Date(2024, 6, 15)} />)
    await user.click(menu())
    await user.keyboard('{ArrowRight}')
    expect(document.activeElement).toHaveTextContent('2025')
    await user.keyboard('{ArrowDown}')
    expect(document.activeElement).toHaveTextContent('2028')
    await user.keyboard('{ArrowUp}{ArrowUp}{ArrowLeft}')
    expect(document.activeElement).toHaveTextContent('2021')
    await user.keyboard('{Enter}')
    expect(screen.getByRole('grid', { name: 'July 2021' })).toBeInTheDocument()
  })

  it('bounds years and month arrows by min / max', async () => {
    const user = userEvent.setup()
    render(
      <DatePicker
        defaultValue={new Date(2024, 6, 15)}
        min={new Date(2023, 3, 10)}
        max={new Date(2024, 7, 20)}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Next month' }))
    expect(screen.getByRole('button', { name: 'Next month' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'August 2024' }))
    const years = within(screen.getByRole('listbox')).getAllByRole('option')
    expect(years.map((y) => y.textContent)).toEqual(['2023', '2024'])
    await user.click(screen.getByRole('option', { name: '2023' }))
    expect(screen.getByRole('grid', { name: 'August 2023' })).toBeInTheDocument()
    for (let i = 0; i < 4; i++) {
      await user.click(screen.getByRole('button', { name: 'Previous month' }))
    }
    expect(screen.getByRole('grid', { name: 'April 2023' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous month' })).toBeDisabled()
  })

  it('clamps the month into range when the picked year cannot show it', async () => {
    const user = userEvent.setup()
    render(
      <DatePicker
        defaultValue={new Date(2024, 0, 15)}
        min={new Date(2023, 5, 1)}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'January 2024' }))
    await user.click(screen.getByRole('option', { name: '2023' }))
    expect(screen.getByRole('grid', { name: 'June 2023' })).toBeInTheDocument()
  })

  it('has no axe violations with the year picker open', async () => {
    const user = userEvent.setup()
    // A narrowed year range keeps axe fast (the default is 201 years).
    const { container } = render(
      <DatePicker
        value={new Date(2024, 6, 15)}
        min={new Date(2020, 0, 1)}
        max={new Date(2030, 11, 31)}
      />,
    )
    await user.click(menu())
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('DatePicker keyboard grid', () => {
  const focused = () => document.activeElement as HTMLElement

  it('is a single Tab stop starting on the selected day', async () => {
    const user = userEvent.setup()
    render(<DatePicker value={new Date(2024, 6, 15)} />)
    const tabbable = within(screen.getByRole('grid'))
      .getAllByRole('gridcell')
      .filter((el) => el.tabIndex === 0)
    expect(tabbable).toHaveLength(1)
    expect(tabbable[0]).toBe(day(15))
    await user.tab() // month / year menu
    await user.tab() // previous month
    await user.tab() // next month
    await user.tab() // grid
    expect(focused()).toBe(day(15))
    await user.tab()
    expect(document.body).toHaveFocus() // left the grid in one step
  })

  it('falls back to today, then the 1st, when the selection is not in view', async () => {
    const user = userEvent.setup()
    render(<DatePicker defaultValue={null} />)
    const tabbable = () =>
      within(screen.getByRole('grid'))
        .getAllByRole('gridcell')
        .filter((el) => el.tabIndex === 0)
    expect(tabbable()).toHaveLength(1)
    expect(tabbable()[0]).toHaveAttribute('aria-current', 'date')
    await user.click(screen.getByRole('button', { name: 'Next month' }))
    expect(tabbable()).toHaveLength(1)
    expect(tabbable()[0].textContent).toBe('1')
  })

  it('moves by day and week with the arrow keys, paging at month edges', async () => {
    const user = userEvent.setup()
    render(<DatePicker value={new Date(2024, 6, 15)} />)
    day(15).focus()
    await user.keyboard('{ArrowRight}')
    expect(focused()).toHaveAccessibleName('Tuesday, July 16, 2024')
    await user.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(focused()).toHaveAccessibleName('Sunday, July 14, 2024')
    await user.keyboard('{ArrowDown}')
    expect(focused()).toHaveAccessibleName('Sunday, July 21, 2024')
    await user.keyboard('{ArrowUp}{ArrowUp}{ArrowUp}')
    expect(focused()).toHaveAccessibleName('Sunday, June 30, 2024')
    expect(screen.getByRole('grid', { name: 'June 2024' })).toBeInTheDocument()
    expect(focused().tabIndex).toBe(0)
  })

  it('pages months with PageUp/PageDown and years with Shift', async () => {
    const user = userEvent.setup()
    render(<DatePicker value={new Date(2024, 0, 31)} />)
    day(31).focus()
    await user.keyboard('{PageDown}')
    // Clamped to the last day of February (leap year).
    expect(focused()).toHaveAccessibleName('Thursday, February 29, 2024')
    await user.keyboard('{PageUp}')
    expect(focused()).toHaveAccessibleName('Monday, January 29, 2024')
    await user.keyboard('{Shift>}{PageDown}{/Shift}')
    expect(focused()).toHaveAccessibleName('Wednesday, January 29, 2025')
    await user.keyboard('{Shift>}{PageUp}{PageUp}{/Shift}')
    expect(focused()).toHaveAccessibleName('Sunday, January 29, 2023')
  })

  it('moves to the first / last day of the month with Home / End', async () => {
    const user = userEvent.setup()
    render(<DatePicker value={new Date(2024, 6, 15)} />)
    day(15).focus()
    await user.keyboard('{End}')
    expect(focused()).toHaveAccessibleName('Wednesday, July 31, 2024')
    await user.keyboard('{Home}')
    expect(focused()).toHaveAccessibleName('Monday, July 1, 2024')
  })

  it('selects with Enter and Space', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DatePicker defaultValue={new Date(2024, 6, 15)} onChange={onChange} />)
    day(15).focus()
    await user.keyboard('{ArrowRight}{Enter}')
    expect(onChange).toHaveBeenLastCalledWith(new Date(2024, 6, 16))
    await user.keyboard('{ArrowRight} ')
    expect(onChange).toHaveBeenLastCalledWith(new Date(2024, 6, 17))
    expect(day(17)).toHaveAttribute('aria-selected', 'true')
  })

  it('mirrors left / right in RTL', async () => {
    const user = userEvent.setup()
    render(
      <div dir="rtl" style={{ direction: 'rtl' }}>
        <DatePicker value={new Date(2024, 6, 15)} />
      </div>,
    )
    day(15).focus()
    await user.keyboard('{ArrowLeft}')
    expect(focused()).toHaveAccessibleName('Tuesday, July 16, 2024')
  })
})
