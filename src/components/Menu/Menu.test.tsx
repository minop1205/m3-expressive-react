import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { Menu, MenuItem } from './Menu'

function Example({ onSelect = () => {} }: { onSelect?: () => void }) {
  return (
    <Menu trigger={<button>Open</button>} aria-label="Actions">
      <MenuItem onClick={onSelect}>Copy</MenuItem>
      <MenuItem disabled>Archive</MenuItem>
    </Menu>
  )
}

describe('Menu', () => {
  it('toggles open from the trigger and sets aria-expanded', async () => {
    const user = userEvent.setup()
    render(<Example />)
    const trigger = screen.getByRole('button', { name: 'Open' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await user.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('menuitem', { name: 'Copy' })).toBeVisible()
  })

  it('selects an item and closes', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<Example onSelect={onSelect} />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    await user.click(screen.getByRole('menuitem', { name: 'Copy' }))
    expect(onSelect).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Open' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('closes on Escape', async () => {
    const user = userEvent.setup()
    render(<Example />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    await user.keyboard('{Escape}')
    expect(screen.getByRole('button', { name: 'Open' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('has no axe violations when open', async () => {
    const user = userEvent.setup()
    const { container } = render(<Example />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    expect(await axe(container)).toHaveNoViolations()
  })
})
