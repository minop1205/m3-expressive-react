import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { Fab } from './Fab'

const Icon = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z" />
  </svg>
)

describe('Fab', () => {
  it('renders an accessible button via aria-label', () => {
    render(<Fab icon={Icon} aria-label="Add" />)
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument()
  })

  it('applies color and size data attributes', () => {
    render(<Fab icon={Icon} aria-label="x" color="tertiary" size="large" />)
    const btn = screen.getByRole('button')
    expect(btn).toHaveAttribute('data-color', 'tertiary')
    expect(btn).toHaveAttribute('data-size', 'large')
  })

  it('defaults to the tonal primary color set', () => {
    render(<Fab icon={Icon} aria-label="x" />)
    const btn = screen.getByRole('button')
    expect(btn).toHaveAttribute('data-color', 'primary')
    expect(btn).toHaveAttribute('data-tonal', 'true')
  })

  it('omits data-tonal for the high-emphasis palette (tonal={false})', () => {
    render(<Fab icon={Icon} aria-label="x" color="secondary" tonal={false} />)
    const btn = screen.getByRole('button')
    expect(btn).toHaveAttribute('data-color', 'secondary')
    expect(btn).not.toHaveAttribute('data-tonal')
  })

  it('fires onClick when activated', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Fab icon={Icon} aria-label="x" onClick={onClick} />)
    await user.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renders as Extended FAB with a label', () => {
    render(<Fab icon={Icon} label="Create" />)
    const btn = screen.getByRole('button', { name: 'Create' })
    expect(btn).toHaveAttribute('data-extended', 'true')
    expect(btn).toHaveTextContent('Create')
  })

  it('does not fire when disabled', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    const onClick = vi.fn()
    render(<Fab icon={Icon} aria-label="x" disabled onClick={onClick} />)
    await user.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('forwards a ref', () => {
    const ref = { current: null as HTMLButtonElement | null }
    render(<Fab ref={ref} icon={Icon} aria-label="x" />)
    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
  })

  it('has no axe violations', async () => {
    const { container } = render(<Fab icon={Icon} aria-label="Add" />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('has no axe violations (extended)', async () => {
    const { container } = render(<Fab icon={Icon} label="Create" />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('morphs from the expanded prop, keeping the accessible name', () => {
    const { rerender } = render(<Fab icon={Icon} label="Create" expanded={false} />)
    const btn = screen.getByRole('button', { name: 'Create' })
    expect(btn).toHaveAttribute('data-morph', 'true')
    expect(btn).not.toHaveAttribute('data-extended')
    expect(btn.style.getPropertyValue('--_ext')).toBe('0')
    expect(btn.style.getPropertyValue('--_label-o')).toBe('0')
    rerender(<Fab icon={Icon} label="Create" expanded />)
    // The springs animate toward 1; the collapsed name must stay readable.
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument()
  })

  it('removes the shadow with disableElevation', () => {
    render(<Fab icon={Icon} aria-label="x" disableElevation />)
    expect(screen.getByRole('button')).toHaveAttribute('data-disable-elevation', 'true')
  })

  it('renders the morph DOM without inline morph values for followContainer', () => {
    render(<Fab icon={Icon} label="Create" followContainer />)
    const btn = screen.getByRole('button', { name: 'Create' })
    expect(btn).toHaveAttribute('data-morph', 'true')
    // No inline --_ext / --_label-o: the CSS falls back to the inherited --_t.
    expect(btn.style.getPropertyValue('--_ext')).toBe('')
    expect(btn.style.getPropertyValue('--_label-o')).toBe('')
  })

  it('ignores expanded for the morph machinery while followContainer is set', () => {
    render(<Fab icon={Icon} label="Create" followContainer expanded />)
    const btn = screen.getByRole('button', { name: 'Create' })
    expect(btn).toHaveAttribute('data-morph', 'true')
    expect(btn.style.getPropertyValue('--_ext')).toBe('')
    expect(btn.style.getPropertyValue('--_label-o')).toBe('')
  })

  it('stays a static Extended FAB when expanded is omitted', () => {
    render(<Fab icon={Icon} label="Create" />)
    const btn = screen.getByRole('button', { name: 'Create' })
    expect(btn).toHaveAttribute('data-extended', 'true')
    expect(btn.style.getPropertyValue('--_ext')).toBe('')
  })
})
