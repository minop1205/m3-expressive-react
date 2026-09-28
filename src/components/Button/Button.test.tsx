import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { Button } from './Button'

describe('Button', () => {
  it('renders a button with its label', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('applies variant and size data attributes', () => {
    render(
      <Button variant="outlined" size="lg">
        Hi
      </Button>,
    )
    const btn = screen.getByRole('button')
    expect(btn).toHaveAttribute('data-variant', 'outlined')
    expect(btn).toHaveAttribute('data-size', 'lg')
  })

  it('fires onClick when activated', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Go</Button>)
    await user.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('activates on keyboard (Enter)', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Go</Button>)
    screen.getByRole('button').focus()
    await user.keyboard('{Enter}')
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renders leading and trailing icons', () => {
    render(
      <Button startIcon={<span data-testid="lead" />} endIcon={<span data-testid="trail" />}>
        Go
      </Button>,
    )
    expect(screen.getByTestId('lead')).toBeInTheDocument()
    expect(screen.getByTestId('trail')).toBeInTheDocument()
  })

  it('does not fire when disabled', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        Nope
      </Button>,
    )
    const btn = screen.getByRole('button')
    expect(btn).toBeDisabled()
    await user.click(btn)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('is not a toggle by default (no aria-pressed)', () => {
    render(<Button>Plain</Button>)
    expect(screen.getByRole('button')).not.toHaveAttribute('aria-pressed')
  })

  it('toggles selection and exposes aria-pressed (uncontrolled)', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <Button toggle onChange={onChange}>
        Bold
      </Button>,
    )
    const btn = screen.getByRole('button', { pressed: false })
    await user.click(btn)
    expect(screen.getByRole('button', { pressed: true })).toBeInTheDocument()
    expect(onChange).toHaveBeenCalledWith(expect.any(Object), true)
  })

  it('respects a controlled selected value', () => {
    render(
      <Button toggle selected>
        On
      </Button>,
    )
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button')).toHaveAttribute('data-selected', 'true')
  })

  it('keeps the resting shape for non-toggle buttons', () => {
    render(<Button shape="square">Plain</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('data-shape-state', 'square')
  })

  it('swaps the shape when a toggle button is selected (round → square)', async () => {
    const user = userEvent.setup()
    render(<Button toggle>Bold</Button>)
    const btn = screen.getByRole('button')
    expect(btn).toHaveAttribute('data-shape-state', 'round')
    await user.click(btn)
    expect(btn).toHaveAttribute('data-shape-state', 'square')
  })

  it('swaps a square toggle button to round when selected', () => {
    render(
      <Button toggle selected shape="square">
        Bold
      </Button>,
    )
    expect(screen.getByRole('button')).toHaveAttribute('data-shape-state', 'round')
  })

  it('does not change state when controlled selected is fixed', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <Button toggle selected={false} onChange={onChange}>
        Bold
      </Button>,
    )
    const btn = screen.getByRole('button')
    await user.click(btn)
    expect(onChange).toHaveBeenCalledWith(expect.any(Object), true)
    expect(btn).toHaveAttribute('aria-pressed', 'false')
    expect(btn).toHaveAttribute('data-shape-state', 'round')
  })

  it('forwards a ref to the underlying button', () => {
    const ref = { current: null as HTMLButtonElement | null }
    render(<Button ref={ref}>Ref</Button>)
    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
  })

  it('has no axe violations', async () => {
    const { container } = render(<Button>Accessible</Button>)
    expect(await axe(container)).toHaveNoViolations()
  })
})
