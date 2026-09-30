import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { FabMenu, FabMenuItem } from './FabMenu'

const add = <span aria-hidden="true">＋</span>

function Example(props: Partial<React.ComponentProps<typeof FabMenu>> = {}) {
  return (
    <FabMenu icon={add} ariaLabel="Create" {...props}>
      <FabMenuItem icon={<span aria-hidden="true">✎</span>}>Note</FabMenuItem>
      <FabMenuItem icon={<span aria-hidden="true">⏰</span>}>Reminder</FabMenuItem>
    </FabMenu>
  )
}

describe('FabMenu', () => {
  it('renders a collapsed FAB', () => {
    render(<Example />)
    const fab = screen.getByRole('button', { name: 'Create' })
    expect(fab).toHaveAttribute('aria-expanded', 'false')
  })

  it('opens on click and shows the items', async () => {
    const user = userEvent.setup()
    render(<Example />)
    await user.click(screen.getByRole('button', { name: 'Create' }))
    expect(screen.getByRole('button', { name: 'Close menu' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('menuitem', { name: 'Note' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Reminder' })).toBeInTheDocument()
  })

  it('fires an item onClick and closes the menu', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    const onOpenChange = vi.fn()
    render(
      <FabMenu icon={add} ariaLabel="Create" onOpenChange={onOpenChange} defaultOpen>
        <FabMenuItem onClick={onClick}>Note</FabMenuItem>
      </FabMenu>,
    )
    await user.click(screen.getByRole('menuitem', { name: 'Note' }))
    expect(onClick).toHaveBeenCalled()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('closes on Escape', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(<Example defaultOpen onOpenChange={onOpenChange} />)
    await user.keyboard('{Escape}')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('forwards a ref', () => {
    const ref = createRef<HTMLDivElement>()
    render(
      <FabMenu ref={ref} icon={add} ariaLabel="Create">
        <FabMenuItem>Note</FabMenuItem>
      </FabMenu>,
    )
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('has no axe violations (open)', async () => {
    const { container } = render(<Example defaultOpen />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('has no axe violations (closed)', async () => {
    const { container } = render(<Example />)
    expect(await axe(container)).toHaveNoViolations()
  })

  describe('focus and keyboard', () => {
    function Page(props: Partial<React.ComponentProps<typeof FabMenu>> = {}) {
      return (
        <>
          <button type="button">Before</button>
          <FabMenu icon={add} ariaLabel="Create" {...props}>
            <FabMenuItem>Note</FabMenuItem>
            <FabMenuItem>Reminder</FabMenuItem>
            <FabMenuItem>Image</FabMenuItem>
          </FabMenu>
          <button type="button">After</button>
        </>
      )
    }

    it('hides closed items from the a11y tree and the Tab order (#201)', async () => {
      const user = userEvent.setup()
      render(<Page />)
      expect(screen.queryAllByRole('menuitem')).toHaveLength(0)
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
      const menu = screen.getByRole('menu', { hidden: true })
      // jsdom does not implement inert's focus blocking; assert the attribute
      // plus the roving tabindex that keeps items out of the Tab order.
      expect(menu).toHaveAttribute('inert')
      expect(menu).toHaveAttribute('aria-hidden', 'true')
      for (const item of screen.getAllByRole('menuitem', { hidden: true })) {
        expect(item).toHaveAttribute('tabindex', '-1')
      }
      await user.tab()
      expect(screen.getByRole('button', { name: 'Before' })).toHaveFocus()
      await user.tab()
      expect(screen.getByRole('button', { name: 'Create' })).toHaveFocus()
      await user.tab()
      expect(screen.getByRole('button', { name: 'After' })).toHaveFocus()
    })

    it('exposes the items and drops inert when open', async () => {
      const user = userEvent.setup()
      render(<Page />)
      await user.click(screen.getByRole('button', { name: 'Create' }))
      const menu = screen.getByRole('menu', { name: 'Create' })
      expect(menu).not.toHaveAttribute('inert')
      expect(menu).not.toHaveAttribute('aria-hidden')
      expect(screen.getAllByRole('menuitem')).toHaveLength(3)
    })

    it('keeps focus on the toggle when opening, then Tab reaches the top item first (#202)', async () => {
      const user = userEvent.setup()
      render(<Page />)
      await user.tab()
      await user.tab()
      await user.keyboard('{Enter}')
      const toggle = screen.getByRole('button', { name: 'Close menu' })
      expect(toggle).toHaveFocus()
      await user.tab()
      expect(screen.getByRole('menuitem', { name: 'Note' })).toHaveFocus()
    })

    it('ArrowDown / ArrowUp from the open toggle reach the top / bottom item', async () => {
      const user = userEvent.setup()
      render(<Page defaultOpen />)
      const toggle = screen.getByRole('button', { name: 'Close menu' })
      toggle.focus()
      await user.keyboard('{ArrowDown}')
      expect(screen.getByRole('menuitem', { name: 'Note' })).toHaveFocus()
      toggle.focus()
      await user.keyboard('{ArrowUp}')
      expect(screen.getByRole('menuitem', { name: 'Image' })).toHaveFocus()
    })

    it('cycles the items with ArrowUp / ArrowDown (wrap) and Home / End', async () => {
      const user = userEvent.setup()
      render(<Page defaultOpen />)
      screen.getByRole('menuitem', { name: 'Note' }).focus()
      await user.keyboard('{ArrowDown}')
      expect(screen.getByRole('menuitem', { name: 'Reminder' })).toHaveFocus()
      await user.keyboard('{ArrowDown}{ArrowDown}')
      expect(screen.getByRole('menuitem', { name: 'Note' })).toHaveFocus()
      await user.keyboard('{ArrowUp}')
      expect(screen.getByRole('menuitem', { name: 'Image' })).toHaveFocus()
      await user.keyboard('{Home}')
      expect(screen.getByRole('menuitem', { name: 'Note' })).toHaveFocus()
      await user.keyboard('{End}')
      expect(screen.getByRole('menuitem', { name: 'Image' })).toHaveFocus()
    })

    it('Shift+Tab from an item returns to the toggle and keeps the menu open', async () => {
      const user = userEvent.setup()
      render(<Page defaultOpen />)
      screen.getByRole('menuitem', { name: 'Note' }).focus()
      await user.tab({ shift: true })
      const toggle = screen.getByRole('button', { name: 'Close menu' })
      expect(toggle).toHaveFocus()
      expect(toggle).toHaveAttribute('aria-expanded', 'true')
    })

    it('Tab from an item closes the menu and leaves the component', async () => {
      const user = userEvent.setup()
      const onOpenChange = vi.fn()
      render(<Page defaultOpen onOpenChange={onOpenChange} />)
      screen.getByRole('menuitem', { name: 'Reminder' }).focus()
      await user.tab()
      expect(onOpenChange).toHaveBeenCalledWith(false)
      expect(screen.getByRole('button', { name: 'After' })).toHaveFocus()
    })

    it('Escape closes and returns focus to the toggle (#202)', async () => {
      const user = userEvent.setup()
      render(<Page defaultOpen />)
      screen.getByRole('menuitem', { name: 'Reminder' }).focus()
      await user.keyboard('{Escape}')
      const toggle = screen.getByRole('button', { name: 'Create' })
      expect(toggle).toHaveAttribute('aria-expanded', 'false')
      expect(toggle).toHaveFocus()
    })

    it('selecting an item closes and returns focus to the toggle (#202)', async () => {
      const user = userEvent.setup()
      const onClick = vi.fn()
      render(
        <FabMenu icon={add} ariaLabel="Create" defaultOpen>
          <FabMenuItem onClick={onClick}>Note</FabMenuItem>
        </FabMenu>,
      )
      screen.getByRole('menuitem', { name: 'Note' }).focus()
      await user.keyboard('{Enter}')
      expect(onClick).toHaveBeenCalledTimes(1)
      const toggle = screen.getByRole('button', { name: 'Create' })
      expect(toggle).toHaveAttribute('aria-expanded', 'false')
      expect(toggle).toHaveFocus()
    })

    it('moves focus to the toggle when a controlled menu closes under a focused item', () => {
      const { rerender } = render(<Page open />)
      screen.getByRole('menuitem', { name: 'Image' }).focus()
      rerender(<Page open={false} />)
      expect(screen.getByRole('button', { name: 'Create' })).toHaveFocus()
    })
  })
})
