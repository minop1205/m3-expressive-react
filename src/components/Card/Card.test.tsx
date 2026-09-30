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

  describe('nested interactive content (CD1)', () => {
    it('Enter / Space on a nested button fire only the button', async () => {
      const user = userEvent.setup()
      const onCard = vi.fn()
      const onButton = vi.fn()
      render(
        <Card onClick={onCard} aria-label="Card">
          <button type="button" onClick={onButton}>
            Action
          </button>
        </Card>,
      )
      screen.getByRole('button', { name: 'Action' }).focus()
      await user.keyboard('{Enter}')
      await user.keyboard(' ')
      expect(onButton).toHaveBeenCalledTimes(2)
      expect(onCard).not.toHaveBeenCalled()
    })

    it('typing into a nested input keeps spaces and does not fire the card', async () => {
      const user = userEvent.setup()
      const onCard = vi.fn()
      render(
        <Card onClick={onCard} aria-label="Card">
          <input aria-label="Note" />
        </Card>,
      )
      const input = screen.getByRole('textbox', { name: 'Note' })
      await user.type(input, 'a b{Enter}')
      expect(input).toHaveValue('a b')
      expect(onCard).not.toHaveBeenCalled()
    })

    it('a click on a nested button does not also activate the card', async () => {
      const user = userEvent.setup()
      const onCard = vi.fn()
      const onButton = vi.fn()
      render(
        <Card onClick={onCard} aria-label="Card">
          <button type="button" onClick={onButton}>
            <span>Action</span>
          </button>
          <span>Body</span>
        </Card>,
      )
      await user.click(screen.getByText('Action'))
      expect(onButton).toHaveBeenCalledTimes(1)
      expect(onCard).not.toHaveBeenCalled()
      // Non-interactive content still activates the card.
      await user.click(screen.getByText('Body'))
      expect(onCard).toHaveBeenCalledTimes(1)
    })
  })

  it('applies the dragged state', () => {
    const { container } = render(<Card dragged>x</Card>)
    expect(container.firstChild).toHaveAttribute('data-dragged', 'true')
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
