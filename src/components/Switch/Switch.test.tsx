import { describe, it, expect, vi } from 'vitest'
import type { KeyboardEvent } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { Switch } from './Switch'
import styles from './Switch.module.css'

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

  it('has no axe violations (icons)', async () => {
    const { container } = render(<Switch aria-label="Toggle" selected icons />)
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('Switch keyboard', () => {
  it('toggles on Space', async () => {
    const user = userEvent.setup()
    render(<Switch aria-label="Toggle" />)
    const input = screen.getByRole('switch')

    await user.tab()
    expect(input).toHaveFocus()

    await user.keyboard(' ')
    expect(input).toBeChecked()

    await user.keyboard(' ')
    expect(input).not.toBeChecked()
  })

  it('toggles on Enter (APG switch pattern — unlike a native checkbox)', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Switch aria-label="Toggle" onChange={onChange} />)
    const input = screen.getByRole('switch')

    await user.tab()
    await user.keyboard('{Enter}')
    expect(input).toBeChecked()
    expect(onChange).toHaveBeenCalledWith(true, expect.any(Object))

    await user.keyboard('{Enter}')
    expect(input).not.toBeChecked()
    expect(onChange).toHaveBeenCalledWith(false, expect.any(Object))
  })

  it('calls a user-supplied onKeyDown and respects preventDefault on Enter', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const onKeyDown = vi.fn((event: KeyboardEvent<HTMLInputElement>) =>
      event.preventDefault(),
    )
    render(<Switch aria-label="Toggle" onChange={onChange} onKeyDown={onKeyDown} />)

    await user.tab()
    await user.keyboard('{Enter}')
    expect(onKeyDown).toHaveBeenCalled()
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByRole('switch')).not.toBeChecked()
  })
})

describe('Switch form submission', () => {
  function formData() {
    return new FormData(screen.getByTestId('form') as HTMLFormElement)
  }

  it('submits the default value "on" when selected', () => {
    render(
      <form data-testid="form">
        <Switch aria-label="Wifi" name="wifi" defaultSelected />
      </form>,
    )
    expect(formData().get('wifi')).toBe('on')
  })

  it('submits a custom value when selected', () => {
    render(
      <form data-testid="form">
        <Switch aria-label="Wifi" name="wifi" value="enabled" defaultSelected />
      </form>,
    )
    expect(formData().get('wifi')).toBe('enabled')
  })

  it('submits nothing when unselected', () => {
    render(
      <form data-testid="form">
        <Switch aria-label="Wifi" name="wifi" />
      </form>,
    )
    expect(formData().has('wifi')).toBe(false)
  })
})

describe('Switch icon visibility logic', () => {
  function handle(container: HTMLElement) {
    return container.getElementsByClassName(styles.handle)[0]
  }

  it('keeps the 16dp handle when the only icon is hidden (selectedIcon, unselected)', () => {
    const { container } = render(
      <Switch aria-label="Toggle" selectedIcon={<span data-testid="sel-icon" />} />,
    )
    expect(handle(container)).not.toHaveClass(styles.withIcon)
  })

  it('grows the handle when the selected icon shows', () => {
    const { container } = render(
      <Switch aria-label="Toggle" selected selectedIcon={<span data-testid="sel-icon" />} />,
    )
    expect(handle(container)).toHaveClass(styles.withIcon)
  })

  it('grows the handle in both states with icons (built-in icons included)', () => {
    const { container, rerender } = render(<Switch aria-label="Toggle" icons />)
    // Unselected with `icons`: the built-in Close icon shows, so the handle
    // is 24dp (spec anatomy: 24dp in any state with an icon)
    expect(handle(container)).toHaveClass(styles.withIcon)

    rerender(<Switch aria-label="Toggle" icons selected />)
    expect(handle(container)).toHaveClass(styles.withIcon)
  })

  it('renders no icons by default', () => {
    const { container } = render(<Switch aria-label="Toggle" selected />)
    expect(container.getElementsByClassName(styles.icons).length).toBe(0)
    expect(handle(container)).not.toHaveClass(styles.withIcon)
  })
})
