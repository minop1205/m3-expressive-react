import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { Menu, MenuItem } from './Menu'

function Example({
  onSelect = () => {},
  onArchive = () => {},
}: {
  onSelect?: () => void
  onArchive?: () => void
}) {
  return (
    <>
      <Menu trigger={<button>Open</button>} aria-label="Actions">
        <MenuItem onClick={onSelect}>Copy</MenuItem>
        <MenuItem>Share</MenuItem>
        <MenuItem disabled onClick={onArchive}>
          Archive
        </MenuItem>
      </Menu>
      <button>After</button>
    </>
  )
}

const item = (name: string) => screen.getByRole('menuitem', { name })

describe('Menu', () => {
  it('toggles open from the trigger and sets aria-expanded', async () => {
    const user = userEvent.setup()
    render(<Example />)
    const trigger = screen.getByRole('button', { name: 'Open' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await user.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(item('Copy')).toBeVisible()
  })

  it('selects an item, closes, and returns focus to the trigger', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<Example onSelect={onSelect} />)
    const trigger = screen.getByRole('button', { name: 'Open' })
    await user.click(trigger)
    await user.click(item('Copy'))
    expect(onSelect).toHaveBeenCalled()
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveFocus()
  })

  it('closes on Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup()
    render(<Example />)
    const trigger = screen.getByRole('button', { name: 'Open' })
    await user.click(trigger)
    await user.keyboard('{Escape}')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveFocus()
  })

  it('focuses the first item when opened (click / Enter / ArrowDown)', async () => {
    const user = userEvent.setup()
    render(<Example />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    expect(item('Copy')).toHaveFocus()
  })

  it('opens focusing the last item on ArrowUp', async () => {
    const user = userEvent.setup()
    render(<Example />)
    screen.getByRole('button', { name: 'Open' }).focus()
    await user.keyboard('{ArrowUp}')
    expect(item('Archive')).toHaveFocus()
  })

  it('moves focus with ArrowDown/ArrowUp and wraps', async () => {
    const user = userEvent.setup()
    render(<Example />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    await user.keyboard('{ArrowDown}')
    expect(item('Share')).toHaveFocus()
    await user.keyboard('{ArrowDown}{ArrowDown}')
    expect(item('Copy')).toHaveFocus() // wrapped past Archive
    await user.keyboard('{ArrowUp}')
    expect(item('Archive')).toHaveFocus() // wraps backwards
  })

  it('jumps with Home and End', async () => {
    const user = userEvent.setup()
    render(<Example />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    await user.keyboard('{End}')
    expect(item('Archive')).toHaveFocus()
    await user.keyboard('{Home}')
    expect(item('Copy')).toHaveFocus()
  })

  it('moves focus by typeahead', async () => {
    // Advance the clock past the buffer-reset window on every read so each
    // keypress counts as a fresh single-character search.
    let clock = 0
    const nowSpy = vi.spyOn(Date, 'now').mockImplementation(() => (clock += 1000))
    const user = userEvent.setup()
    render(<Example />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    await user.keyboard('s')
    expect(item('Share')).toHaveFocus()
    await user.keyboard('a')
    expect(item('Archive')).toHaveFocus()
    nowSpy.mockRestore()
  })

  it('accumulates a typeahead buffer for rapid keys', async () => {
    const user = userEvent.setup()
    render(<Example />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    await user.keyboard('sh')
    expect(item('Share')).toHaveFocus()
  })

  it('closes on Tab and does not trap focus', async () => {
    const user = userEvent.setup()
    render(<Example />)
    const trigger = screen.getByRole('button', { name: 'Open' })
    await user.click(trigger)
    await user.tab()
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('keeps items out of the page Tab order (roving tabindex)', async () => {
    const user = userEvent.setup()
    render(<Example />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    for (const name of ['Copy', 'Share', 'Archive']) {
      expect(item(name)).toHaveAttribute('tabindex', '-1')
    }
  })

  it('disabled items are focusable but inert', async () => {
    const user = userEvent.setup()
    const onArchive = vi.fn()
    render(<Example onArchive={onArchive} />)
    const trigger = screen.getByRole('button', { name: 'Open' })
    await user.click(trigger)
    await user.keyboard('{ArrowUp}') // wraps to last item = Archive
    const archive = item('Archive')
    expect(archive).toHaveFocus()
    expect(archive).toHaveAttribute('aria-disabled', 'true')
    await user.keyboard('{Enter}')
    expect(onArchive).not.toHaveBeenCalled()
    expect(trigger).toHaveAttribute('aria-expanded', 'true') // still open
  })

  it('has no axe violations when open', async () => {
    const user = userEvent.setup()
    const { container } = render(<Example />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    expect(await axe(container)).toHaveNoViolations()
  })
})
