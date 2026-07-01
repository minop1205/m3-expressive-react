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
})
