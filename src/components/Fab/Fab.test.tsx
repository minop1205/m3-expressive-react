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

  it('fires onPress when activated', async () => {
    const user = userEvent.setup()
    const onPress = vi.fn()
    render(<Fab icon={Icon} aria-label="x" onPress={onPress} />)
    await user.click(screen.getByRole('button'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('renders as Extended FAB with a label', () => {
    render(<Fab icon={Icon} label="Create" />)
    const btn = screen.getByRole('button', { name: 'Create' })
    expect(btn).toHaveAttribute('data-extended', 'true')
    expect(btn).toHaveTextContent('Create')
  })

  it('does not fire when disabled', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    const onPress = vi.fn()
    render(<Fab icon={Icon} aria-label="x" disabled onPress={onPress} />)
    await user.click(screen.getByRole('button'))
    expect(onPress).not.toHaveBeenCalled()
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
})
