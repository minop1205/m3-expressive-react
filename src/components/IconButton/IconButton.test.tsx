import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { IconButton } from './IconButton'

const Icon = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z" />
  </svg>
)

describe('IconButton', () => {
  it('renders an accessible icon-only button via aria-label', () => {
    render(<IconButton icon={Icon} aria-label="Add" />)
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument()
  })

  it('applies variant/size/width data attributes', () => {
    render(<IconButton icon={Icon} aria-label="x" variant="outlined" size="lg" width="wide" />)
    const btn = screen.getByRole('button')
    expect(btn).toHaveAttribute('data-variant', 'outlined')
    expect(btn).toHaveAttribute('data-size', 'lg')
    expect(btn).toHaveAttribute('data-width', 'wide')
  })

  it('is not a toggle by default (no aria-pressed)', () => {
    render(<IconButton icon={Icon} aria-label="x" />)
    expect(screen.getByRole('button')).not.toHaveAttribute('aria-pressed')
  })

  it('fires onClick when activated', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<IconButton icon={Icon} aria-label="x" onClick={onClick} />)
    await user.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('toggles selection and exposes aria-pressed (uncontrolled)', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<IconButton icon={Icon} aria-label="Fav" toggle onChange={onChange} />)
    const btn = screen.getByRole('button')
    expect(btn).toHaveAttribute('aria-pressed', 'false')
    await user.click(btn)
    expect(btn).toHaveAttribute('aria-pressed', 'true')
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('respects controlled selected and swaps the aria-label', () => {
    render(
      <IconButton
        icon={Icon}
        toggle
        selected
        aria-label="Add to favorites"
        selectedAriaLabel="Remove from favorites"
      />,
    )
    const btn = screen.getByRole('button', { name: 'Remove from favorites' })
    expect(btn).toHaveAttribute('aria-pressed', 'true')
  })

  it('does not toggle when disabled', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    const onChange = vi.fn()
    render(<IconButton icon={Icon} aria-label="x" toggle disabled onChange={onChange} />)
    await user.click(screen.getByRole('button'))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('forwards a ref', () => {
    const ref = { current: null as HTMLButtonElement | null }
    render(<IconButton ref={ref} icon={Icon} aria-label="x" />)
    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
  })

  it('has no axe violations (incl. toggle)', async () => {
    const { container } = render(
      <IconButton icon={Icon} aria-label="Favorite" toggle selected />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
