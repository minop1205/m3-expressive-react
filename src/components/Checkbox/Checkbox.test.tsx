import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { Checkbox } from './Checkbox'

describe('Checkbox', () => {
  it('renders a checkbox role element', () => {
    render(<Checkbox aria-label="Toggle" />)
    expect(screen.getByRole('checkbox')).toBeInTheDocument()
  })

  it('defaults to unchecked', () => {
    render(<Checkbox aria-label="Toggle" />)
    expect(screen.getByRole('checkbox')).not.toBeChecked()
  })

  it('respects defaultChecked', () => {
    render(<Checkbox aria-label="Toggle" defaultChecked />)
    expect(screen.getByRole('checkbox')).toBeChecked()
  })

  it('toggles on click (uncontrolled)', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Checkbox aria-label="Toggle" onChange={onChange} />)
    const input = screen.getByRole('checkbox')

    await user.click(input)
    expect(input).toBeChecked()
    expect(onChange).toHaveBeenCalledWith(true, expect.any(Object))

    await user.click(input)
    expect(input).not.toBeChecked()
    expect(onChange).toHaveBeenCalledWith(false, expect.any(Object))
  })

  it('works as controlled component', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { rerender } = render(
      <Checkbox aria-label="Toggle" checked={false} onChange={onChange} />,
    )
    const input = screen.getByRole('checkbox')

    await user.click(input)
    expect(onChange).toHaveBeenCalledWith(true, expect.any(Object))
    // Still unchecked because controlled
    expect(input).not.toBeChecked()

    // Parent updates
    rerender(<Checkbox aria-label="Toggle" checked onChange={onChange} />)
    expect(input).toBeChecked()
  })

  it('does not fire onChange when disabled', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    const onChange = vi.fn()
    render(<Checkbox aria-label="Toggle" disabled onChange={onChange} />)
    await user.click(screen.getByRole('checkbox'))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('forwards a ref', () => {
    const ref = { current: null as HTMLInputElement | null }
    render(<Checkbox ref={ref} aria-label="Toggle" />)
    expect(ref.current).toBeInstanceOf(HTMLInputElement)
  })

  it('renders indeterminate visual state', () => {
    const { container } = render(
      <Checkbox aria-label="Toggle" indeterminate />,
    )
    expect(container.querySelector('rect')).toBeInTheDocument()
  })

  it('has no axe violations (unchecked)', async () => {
    const { container } = render(<Checkbox aria-label="Toggle" />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('has no axe violations (checked)', async () => {
    const { container } = render(<Checkbox aria-label="Toggle" checked />)
    expect(await axe(container)).toHaveNoViolations()
  })
})
