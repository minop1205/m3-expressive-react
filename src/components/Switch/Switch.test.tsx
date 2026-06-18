import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { Switch } from './Switch'

describe('Switch', () => {
  it('renders a switch role element', () => {
    render(<Switch aria-label="Toggle" />)
    expect(screen.getByRole('switch')).toBeInTheDocument()
  })

  it('defaults to unselected', () => {
    render(<Switch aria-label="Toggle" />)
    expect(screen.getByRole('switch')).not.toBeChecked()
  })

  it('respects defaultSelected', () => {
    render(<Switch aria-label="Toggle" defaultSelected />)
    expect(screen.getByRole('switch')).toBeChecked()
  })

  it('toggles on click (uncontrolled)', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Switch aria-label="Toggle" onChange={onChange} />)
    const input = screen.getByRole('switch')

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
      <Switch aria-label="Toggle" selected={false} onChange={onChange} />,
    )
    const input = screen.getByRole('switch')

    await user.click(input)
    expect(onChange).toHaveBeenCalledWith(true, expect.any(Object))
    // Still unchecked because controlled
    expect(input).not.toBeChecked()

    // Parent updates
    rerender(<Switch aria-label="Toggle" selected onChange={onChange} />)
    expect(input).toBeChecked()
  })

  it('does not fire onChange when disabled', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    const onChange = vi.fn()
    render(<Switch aria-label="Toggle" disabled onChange={onChange} />)
    await user.click(screen.getByRole('switch'))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('forwards a ref', () => {
    const ref = { current: null as HTMLInputElement | null }
    render(<Switch ref={ref} aria-label="Toggle" />)
    expect(ref.current).toBeInstanceOf(HTMLInputElement)
  })

  it('renders both icons when icons prop is set', () => {
    const { container } = render(
      <Switch
        aria-label="Toggle"
        selected
        icons
        selectedIcon={<span data-testid="sel-icon" />}
        unselectedIcon={<span data-testid="unsel-icon" />}
      />,
    )
    // Both icons are always in the DOM; visibility toggled via CSS opacity
    expect(container.querySelector('[data-testid="sel-icon"]')).toBeInTheDocument()
    expect(container.querySelector('[data-testid="unsel-icon"]')).toBeInTheDocument()
  })

  it('renders only selected icon when selectedIcon is set without icons prop', () => {
    const { container } = render(
      <Switch
        aria-label="Toggle"
        selected
        selectedIcon={<span data-testid="sel-icon" />}
      />,
    )
    expect(container.querySelector('[data-testid="sel-icon"]')).toBeInTheDocument()
  })

  it('has no axe violations (unselected)', async () => {
    const { container } = render(<Switch aria-label="Toggle" />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('has no axe violations (selected)', async () => {
    const { container } = render(<Switch aria-label="Toggle" selected />)
    expect(await axe(container)).toHaveNoViolations()
  })
})
