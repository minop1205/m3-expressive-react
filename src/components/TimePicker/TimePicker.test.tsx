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
    await user.click(screen.getByRole('button', { name: 'Switch to keyboard input' }))
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

  it('clamps typed hour to 1–12', () => {
    const onChange = vi.fn()
    render(<TimePicker mode="input" value={{ hour: 10, minute: 0 }} onChange={onChange} />)
    fireEvent.change(screen.getByRole('textbox', { name: 'Hour' }), {
      target: { value: '20' },
    })
    // Clamped to 12h max; 12 AM = midnight (hour 0).
    expect(onChange).toHaveBeenCalledWith({ hour: 0, minute: 0 })
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
