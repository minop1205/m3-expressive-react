import { createRef } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { DatePickerField } from './DatePickerField'

describe('DatePickerField', () => {
  it('renders a labelled text field', () => {
    render(<DatePickerField label="Birthday" />)
    expect(screen.getByRole('textbox', { name: 'Birthday' })).toBeInTheDocument()
  })

  it('opens the calendar dropdown from the toggle', async () => {
    const user = userEvent.setup()
    render(<DatePickerField />)
    const toggle = screen.getByRole('button', { name: 'Open calendar' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
  })

  it('selects a date from the calendar and closes', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DatePickerField defaultValue={new Date(2024, 6, 1)} onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: 'Open calendar' }))
    await user.click(screen.getByRole('button', { name: '12' }))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0][0].getDate()).toBe(12)
    expect(screen.getByRole('button', { name: 'Open calendar' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('parses a typed date', () => {
    const onChange = vi.fn()
    render(<DatePickerField onChange={onChange} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '2024-07-04' } })
    expect(onChange).toHaveBeenCalled()
    const last = onChange.mock.calls.at(-1)?.[0] as Date
    expect(last.getFullYear()).toBe(2024)
  })

  it('forwards a ref', () => {
    const ref = createRef<HTMLDivElement>()
    render(<DatePickerField ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('has no axe violations', async () => {
    const { container } = render(<DatePickerField label="Date" />)
    expect(await axe(container)).toHaveNoViolations()
  })
})
