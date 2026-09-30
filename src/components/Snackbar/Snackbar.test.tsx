import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { Snackbar } from './Snackbar'

describe('Snackbar', () => {
  it('renders the message as a status region', () => {
    render(<Snackbar message="Saved" />)
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('Saved')
  })

  it('renders an action button and fires its onClick', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Snackbar message="Archived" action={{ label: 'Undo', onClick }} />)
    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renders a dismiss button when onDismiss is set', async () => {
    const user = userEvent.setup()
    const onDismiss = vi.fn()
    render(<Snackbar message="Sent" onDismiss={onDismiss} />)
    await user.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
    expect(onDismiss.mock.calls[0][1]).toBe('dismiss')
  })

  it('localizes the dismiss button via dismissLabel', () => {
    render(<Snackbar message="Sent" onDismiss={() => {}} dismissLabel="閉じる" />)
    expect(screen.getByRole('button', { name: '閉じる' })).toBeInTheDocument()
  })

  it('dismisses with Escape when focus is inside', async () => {
    const user = userEvent.setup()
    const onDismiss = vi.fn()
    render(
      <Snackbar message="Sent" action={{ label: 'Undo' }} onDismiss={onDismiss} />,
    )
    await user.keyboard('{Escape}')
    expect(onDismiss).not.toHaveBeenCalled()
    screen.getByRole('button', { name: 'Undo' }).focus()
    await user.keyboard('{Escape}')
    expect(onDismiss).toHaveBeenCalledTimes(1)
    expect(onDismiss.mock.calls[0][1]).toBe('escapeKeyDown')
  })

  it('lets an onKeyDown handler opt out of Escape dismissal', async () => {
    const user = userEvent.setup()
    const onDismiss = vi.fn()
    render(
      <Snackbar
        message="Sent"
        onDismiss={onDismiss}
        onKeyDown={(e) => e.preventDefault()}
      />,
    )
    screen.getByRole('button', { name: 'Dismiss' }).focus()
    await user.keyboard('{Escape}')
    expect(onDismiss).not.toHaveBeenCalled()
  })

  it('renders the action and dismiss with the shared button primitives', () => {
    render(<Snackbar message="x" action={{ label: 'Undo' }} onDismiss={() => {}} />)
    const action = screen.getByRole('button', { name: 'Undo' })
    const dismiss = screen.getByRole('button', { name: 'Dismiss' })
    expect(action).toHaveAttribute('data-variant', 'text')
    expect(action).toHaveAttribute('data-size', 'sm')
    expect(dismiss).toHaveAttribute('data-variant', 'standard')
    expect(dismiss).toHaveAttribute('data-size', 'sm')
  })

  it('lays the action out on its own line only when actionOnNewLine is set', () => {
    const { rerender } = render(
      <Snackbar data-testid="s" message="x" action={{ label: 'Long action' }} />,
    )
    expect(screen.getByTestId('s')).toHaveAttribute('data-layout', 'one-row')
    rerender(
      <Snackbar data-testid="s" message="x" action={{ label: 'Long action' }} actionOnNewLine />,
    )
    expect(screen.getByTestId('s')).toHaveAttribute('data-layout', 'new-line')
    // Without an action there is nothing to move to a new line.
    rerender(<Snackbar data-testid="s" message="x" actionOnNewLine />)
    expect(screen.getByTestId('s')).toHaveAttribute('data-layout', 'one-row')
  })

  it('marks the dismiss action for the flush trailing-edge layout', () => {
    const { rerender } = render(<Snackbar data-testid="s" message="x" />)
    expect(screen.getByTestId('s')).not.toHaveAttribute('data-dismiss-action')
    rerender(<Snackbar data-testid="s" message="x" onDismiss={() => {}} />)
    expect(screen.getByTestId('s')).toHaveAttribute('data-dismiss-action', 'true')
  })

  it('lets a surrounding host override the live-region role', () => {
    render(<Snackbar data-testid="s" message="x" role={undefined} aria-live={undefined} />)
    expect(screen.getByTestId('s')).not.toHaveAttribute('role')
    expect(screen.getByTestId('s')).not.toHaveAttribute('aria-live')
  })

  it('accepts a custom action node', () => {
    render(
      <Snackbar message="x" action={<a href="/undo">Undo link</a>} />,
    )
    expect(screen.getByRole('link', { name: 'Undo link' })).toBeInTheDocument()
  })

  it('forwards a ref', () => {
    const ref = createRef<HTMLDivElement>()
    render(<Snackbar ref={ref} message="x" />)
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('has no axe violations', async () => {
    const { container } = render(
      <Snackbar message="Saved" action={{ label: 'Undo' }} onDismiss={() => {}} />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('has no axe violations with the action on a new line', async () => {
    const { container } = render(
      <Snackbar message="Saved" action={{ label: 'Open album' }} actionOnNewLine onDismiss={() => {}} />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
