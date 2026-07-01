import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { Card } from './Card'

describe('Card', () => {
  it('renders its children', () => {
    render(<Card>Hello</Card>)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('applies the variant data attribute', () => {
    const { container } = render(<Card variant="outlined">x</Card>)
    expect(container.firstChild).toHaveAttribute('data-variant', 'outlined')
  })

  it('is a plain container (no button role) without onClick', () => {
    render(<Card>x</Card>)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('becomes interactive when onClick is provided', () => {
    render(<Card onClick={() => {}}>x</Card>)
    const card = screen.getByRole('button')
    expect(card).toHaveAttribute('tabindex', '0')
    expect(card).toHaveAttribute('data-interactive', 'true')
  })

  it('fires onClick on pointer and keyboard (Enter/Space)', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Card onClick={onClick}>x</Card>)
    const card = screen.getByRole('button')
    await user.click(card)
    card.focus()
    await user.keyboard('{Enter}')
    await user.keyboard(' ')
    expect(onClick).toHaveBeenCalledTimes(3)
  })

  it('does not fire onClick when disabled', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    const onClick = vi.fn()
    render(
      <Card onClick={onClick} disabled>
        x
      </Card>,
    )
    await user.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('forwards a ref', () => {
    const ref = createRef<HTMLDivElement>()
    render(<Card ref={ref}>x</Card>)
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('has no axe violations (static and interactive)', async () => {
    const { container } = render(
      <div>
        <Card>Static</Card>
        <Card onClick={() => {}} aria-label="Open">
          Interactive
        </Card>
      </div>,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
