import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { DatePicker } from './DatePicker'

describe('DatePicker', () => {
  it('shows the selected date in the headline', () => {
    render(<DatePicker value={new Date(2024, 6, 4)} locale="en-US" />)
    expect(screen.getByText(/Jul 4/)).toBeInTheDocument()
  })

  it('renders the days of the month as buttons', () => {
    render(<DatePicker value={new Date(2024, 6, 15)} />)
    expect(screen.getByRole('button', { name: '15' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '15' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('selects a day on click (uncontrolled)', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DatePicker defaultValue={new Date(2024, 6, 1)} onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: '20' }))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0][0].getDate()).toBe(20)
  })

  it('navigates months', async () => {
    const user = userEvent.setup()
    render(<DatePicker value={new Date(2024, 6, 15)} locale="en-US" />)
    expect(screen.getByText('July 2024')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next month' }))
    expect(screen.getByText('August 2024')).toBeInTheDocument()
  })

  it('selects a start then end in range mode and highlights the span', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DatePicker range value={[new Date(2024, 6, 1), null]} onChange={onChange} />)
    // First selecting the end (after the existing start) completes the range.
    await user.click(screen.getByRole('button', { name: '10' }))
    expect(onChange).toHaveBeenCalledWith([expect.any(Date), expect.any(Date)])
    const [start, end] = onChange.mock.calls[0][0]
    expect(start.getDate()).toBe(1)
    expect(end.getDate()).toBe(10)
  })

  it('marks in-range days when both ends are set', () => {
    render(<DatePicker range value={[new Date(2024, 6, 1), new Date(2024, 6, 10)]} />)
    expect(screen.getByRole('button', { name: '5' })).toHaveAttribute('data-in-range', 'true')
    expect(screen.getByRole('button', { name: '1' })).toHaveAttribute('data-selected', 'true')
    expect(screen.getByRole('button', { name: '10' })).toHaveAttribute('data-selected', 'true')
  })

  it('always lays out six weeks so the height never jumps', () => {
    // June 2026 needs only five rows; February 2026 (starts Sunday) only four.
    for (const month of [new Date(2026, 5, 10), new Date(2026, 1, 10)]) {
      const { container, unmount } = render(<DatePicker value={month} />)
      const grid = container.querySelector('[aria-label]:not(button)') as HTMLElement
      expect(grid.children.length).toBe(7 + 6 * 7)
      unmount()
    }
  })

  it('starts the week on the locale first day', () => {
    const weekdayRow = (locale: string) => {
      const { container, unmount } = render(
        <DatePicker value={new Date(2026, 5, 1)} locale={locale} />,
      )
      const grid = container.querySelector('[aria-label]:not(button)') as HTMLElement
      const text = Array.from(grid.children)
        .slice(0, 7)
        .map((el) => el.textContent)
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
      const { container, unmount } = render(
        <DatePicker value={new Date(2026, 5, 10)} locale={locale} />,
      )
      const grid = container.querySelector('[aria-label]:not(button)') as HTMLElement
      const cells = Array.from(grid.children).slice(7)
      const index = cells.findIndex((el) => el.textContent === '1')
      unmount()
      return index
    }
    expect(cellIndex('en-GB')).toBe(0)
    expect(cellIndex('en-US')).toBe(1)
  })

  it('draws the range band only once both ends are chosen', () => {
    const { rerender } = render(<DatePicker range value={[new Date(2024, 6, 1), null]} />)
    expect(screen.getByRole('button', { name: '1' })).not.toHaveAttribute('data-range-start')
    rerender(<DatePicker range value={[new Date(2024, 6, 1), new Date(2024, 6, 3)]} />)
    expect(screen.getByRole('button', { name: '1' })).toHaveAttribute('data-range-start', 'true')
    expect(screen.getByRole('button', { name: '3' })).toHaveAttribute('data-range-end', 'true')
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
})
