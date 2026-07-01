import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { axe } from 'vitest-axe'
import { Tooltip } from './Tooltip'

describe('Tooltip', () => {
  it('shows on hover and links via aria-describedby', async () => {
    const user = userEvent.setup()
    render(
      <Tooltip text="Helpful hint">
        <button>Trigger</button>
      </Tooltip>,
    )
    const trigger = screen.getByRole('button', { name: 'Trigger' })
    expect(trigger).not.toHaveAttribute('aria-describedby')

    await user.hover(trigger)
    const tip = screen.getByRole('tooltip')
    expect(tip).toHaveTextContent('Helpful hint')
    expect(trigger).toHaveAttribute('aria-describedby', tip.id)

    await user.unhover(trigger)
    expect(trigger).not.toHaveAttribute('aria-describedby')
  })

  it('shows on focus and hides on Escape', async () => {
    const user = userEvent.setup()
    render(
      <Tooltip text="Hint">
        <button>Trigger</button>
      </Tooltip>,
    )
    const trigger = screen.getByRole('button')
    await user.tab()
    expect(trigger).toHaveFocus()
    expect(trigger).toHaveAttribute('aria-describedby')
    await user.keyboard('{Escape}')
    expect(trigger).not.toHaveAttribute('aria-describedby')
  })

  it('renders rich content (subhead + action)', async () => {
    const user = userEvent.setup()
    render(
      <Tooltip variant="rich" subhead="Title" text="Body" action={<button>Act</button>}>
        <button>Trigger</button>
      </Tooltip>,
    )
    await user.hover(screen.getByRole('button', { name: 'Trigger' }))
    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByText('Body')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Act' })).toBeInTheDocument()
  })

  it('preserves the trigger existing handlers', async () => {
    const user = userEvent.setup()
    let entered = false
    render(
      <Tooltip text="Hint">
        <button onMouseEnter={() => (entered = true)}>Trigger</button>
      </Tooltip>,
    )
    await user.hover(screen.getByRole('button'))
    expect(entered).toBe(true)
  })

  it('has no axe violations', async () => {
    const { container } = render(
      <Tooltip text="Hint">
        <button>Trigger</button>
      </Tooltip>,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
