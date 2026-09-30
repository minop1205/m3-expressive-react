import { createRef } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { Card, CardActionArea, CardActions } from './Card'
import { resetDevWarnings } from '../../internal/devWarning'
import rippleStyles from '../../primitives/Ripple/Ripple.module.css'

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

  it('applies the dragged state with the 0.16 state layer (static and clickable)', () => {
    const { container, rerender } = render(<Card dragged>x</Card>)
    expect(container.firstChild).toHaveAttribute('data-dragged', 'true')
    const layer = () => container.querySelector(`.${rippleStyles.stateLayer}`)
    expect(layer()).toHaveClass(rippleStyles.dragged)
    rerender(
      <Card dragged onClick={() => {}}>
        x
      </Card>,
    )
    expect(layer()).toHaveClass(rippleStyles.dragged)
    // Not dragged: a static card has no state layer at all.
    rerender(<Card>x</Card>)
    expect(layer()).toBeNull()
  })

  it('a press on a nested control does not ripple the card (#299)', () => {
    const { container } = render(
      <Card onClick={() => {}} aria-label="Card">
        <button type="button">Action</button>
        <span>Body</span>
      </Card>,
    )
    const ripples = () => container.querySelectorAll(`.${rippleStyles.ripple}`).length
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Action' }), { button: 0 })
    expect(ripples()).toBe(0)
    fireEvent.pointerDown(screen.getByText('Body'), { button: 0 })
    expect(ripples()).toBe(1)
  })

  describe('link card (B5, #217)', () => {
    it('renders an <a href> that activates on Enter only', async () => {
      const user = userEvent.setup()
      const onClick = vi.fn((e: { preventDefault: () => void }) => e.preventDefault())
      render(
        <Card href="/articles/42" target="_blank" rel="noopener" onClick={onClick}>
          Article
        </Card>,
      )
      const link = screen.getByRole('link', { name: 'Article' })
      expect(link.tagName).toBe('A')
      expect(link).toHaveAttribute('href', '/articles/42')
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener')
      expect(link).toHaveAttribute('data-interactive', 'true')
      link.focus()
      await user.keyboard(' ')
      expect(onClick).not.toHaveBeenCalled()
      await user.keyboard('{Enter}')
      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('a disabled link card has no href and is aria-disabled', () => {
      render(
        <Card href="/x" disabled>
          Gone
        </Card>,
      )
      const link = screen.getByRole('link', { name: 'Gone' })
      expect(link).not.toHaveAttribute('href')
      expect(link).toHaveAttribute('aria-disabled', 'true')
    })
  })

  describe('CardActionArea / CardActions (B5, #301)', () => {
    it('renders a button action area and sibling actions without nesting', async () => {
      const user = userEvent.setup()
      const onOpen = vi.fn()
      const onShare = vi.fn()
      render(
        <Card variant="outlined">
          <CardActionArea onClick={onOpen}>
            <h3>Title</h3>
            <p>Body</p>
          </CardActionArea>
          <CardActions>
            <button type="button" onClick={onShare}>
              Share
            </button>
          </CardActions>
        </Card>,
      )
      const area = screen.getByRole('button', { name: 'Title Body' })
      const share = screen.getByRole('button', { name: 'Share' })
      expect(area.contains(share)).toBe(false)
      await user.click(area)
      area.focus()
      await user.keyboard('{Enter}')
      await user.keyboard(' ')
      expect(onOpen).toHaveBeenCalledTimes(3)
      await user.click(share)
      expect(onShare).toHaveBeenCalledTimes(1)
      expect(onOpen).toHaveBeenCalledTimes(3)
    })

    it('renders a link action area with href', () => {
      render(
        <Card>
          <CardActionArea href="/a">Read</CardActionArea>
        </Card>,
      )
      expect(screen.getByRole('link', { name: 'Read' })).toHaveAttribute('href', '/a')
    })

    it('a disabled action area is not focusable and does not fire', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 })
      const onClick = vi.fn()
      render(
        <CardActionArea disabled onClick={onClick}>
          Off
        </CardActionArea>,
      )
      const area = screen.getByRole('button', { name: 'Off' })
      expect(area).not.toHaveAttribute('tabindex')
      expect(area).toHaveAttribute('aria-disabled', 'true')
      await user.click(area)
      expect(onClick).not.toHaveBeenCalled()
    })

    it('has no axe violations (action area + actions)', async () => {
      const { container } = render(
        <div>
          <Card>
            <CardActionArea onClick={() => {}}>
              <h3>Title</h3>
            </CardActionArea>
            <CardActions>
              <button type="button">Share</button>
            </CardActions>
          </Card>
          <Card href="/x">Link card</Card>
        </div>,
      )
      expect(await axe(container)).toHaveNoViolations()
    })

    it('warns in development when a clickable card holds a control', () => {
      resetDevWarnings()
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      render(
        <Card onClick={() => {}} aria-label="Card">
          <a href="/nested-warning">Nested link</a>
        </Card>,
      )
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('CardActionArea'))
      warn.mockRestore()
    })
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
