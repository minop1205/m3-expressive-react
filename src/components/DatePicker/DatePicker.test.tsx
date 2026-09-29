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
