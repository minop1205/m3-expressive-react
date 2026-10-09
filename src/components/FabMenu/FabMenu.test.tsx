import { createRef } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
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
    expect(screen.getByRole('button', { name: 'Create' })).toHaveAttribute('aria-expanded', 'true')
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

  it('keeps the toggle name constant and exposes the state via aria-expanded (#203)', async () => {
    const user = userEvent.setup()
    render(<Example />)
    const toggle = screen.getByRole('button', { name: 'Create' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await user.click(toggle)
    expect(toggle).toHaveAccessibleName('Create')
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await user.click(toggle)
    expect(toggle).toHaveAccessibleName('Create')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })

  it('ignores the deprecated closeAriaLabel with a one-time dev warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { unmount } = render(<Example defaultOpen closeAriaLabel="Close menu" />)
    expect(screen.getByRole('button', { name: 'Create' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.queryByRole('button', { name: 'Close menu' })).not.toBeInTheDocument()
    unmount()
    render(<Example closeAriaLabel="Close" />)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0][0]).toMatch(/closeAriaLabel/)
    warn.mockRestore()
  })

  it('gives every item its own slot, flattening Fragments (#205)', () => {
    render(
      <FabMenu icon={add} ariaLabel="Create" defaultOpen>
        <>
          <FabMenuItem>Note</FabMenuItem>
          <FabMenuItem>Reminder</FabMenuItem>
        </>
        <FabMenuItem>Image</FabMenuItem>
        <>
          <>
            <FabMenuItem>Voice</FabMenuItem>
          </>
        </>
        {false}
        {null}
      </FabMenu>,
    )
    const menu = screen.getByRole('menu')
    expect(menu.children).toHaveLength(4)
    for (const slot of Array.from(menu.children)) {
      expect(slot.querySelectorAll('[role="menuitem"]')).toHaveLength(1)
    }
    expect(screen.getAllByRole('menuitem').map((el) => el.textContent)).toEqual([
      'Note',
      'Reminder',
      'Image',
      'Voice',
    ])
  })

  it('staggers items bottom-first when opening and top-first when closing (#207)', () => {
    render(
      <FabMenu icon={add} ariaLabel="Create" defaultOpen>
        <FabMenuItem>A</FabMenuItem>
        <FabMenuItem>B</FabMenuItem>
        <FabMenuItem>C</FabMenuItem>
        <FabMenuItem>D</FabMenuItem>
      </FabMenu>,
    )
    const slots = Array.from(screen.getByRole('menu').children) as HTMLElement[]
    const ms = (el: HTMLElement, name: string) => parseFloat(el.style.getPropertyValue(name))
    const enter = slots.map((el) => ms(el, '--_enter-delay'))
    const exit = slots.map((el) => ms(el, '--_exit-delay'))
    // Enter: the bottom (last) item first; exit: the top (first) item first.
    expect(enter[3]).toBeLessThan(enter[2])
    expect(enter[2]).toBeLessThan(enter[1])
    expect(exit[0]).toBe(0)
    expect(exit[0]).toBeLessThan(exit[1])
    expect(exit[1]).toBeLessThan(exit[2])
    expect(exit[2]).toBeLessThan(exit[3])
  })

  it('applies size and tonal (#208)', () => {
    const { container, rerender } = render(<Example />)
    const root = container.firstElementChild as HTMLElement
    expect(root).toHaveAttribute('data-size', 'regular')
    expect(root).toHaveAttribute('data-tonal', 'true')
    rerender(<Example size="large" tonal={false} color="secondary" />)
    expect(root).toHaveAttribute('data-size', 'large')
    expect(root).not.toHaveAttribute('data-tonal')
    expect(root).toHaveAttribute('data-color', 'secondary')
  })

  it('has no axe violations (open, large, high-emphasis)', async () => {
    const { container } = render(<Example defaultOpen size="large" tonal={false} />)
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
      const toggle = screen.getByRole('button', { name: 'Create' })
      expect(toggle).toHaveFocus()
      await user.tab()
      expect(screen.getByRole('menuitem', { name: 'Note' })).toHaveFocus()
    })

    it('ArrowDown / ArrowUp from the open toggle reach the top / bottom item', async () => {
      const user = userEvent.setup()
      render(<Page defaultOpen />)
      const toggle = screen.getByRole('button', { name: 'Create' })
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
      const toggle = screen.getByRole('button', { name: 'Create' })
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

  describe('typeahead and outside press (#430)', () => {
    function Fruits() {
      return (
        <FabMenu icon={add} ariaLabel="Create" defaultOpen>
          <FabMenuItem>Apple</FabMenuItem>
          <FabMenuItem>Avocado</FabMenuItem>
          <FabMenuItem>Banana</FabMenuItem>
        </FabMenu>
      )
    }

    it('moves focus by typeahead, cycling on a repeated letter', async () => {
      const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1_000_000)
      try {
        const user = userEvent.setup()
        render(<Fruits />)
        screen.getByRole('menuitem', { name: 'Apple' }).focus()
        await user.keyboard('b')
        expect(screen.getByRole('menuitem', { name: 'Banana' })).toHaveFocus()
        nowSpy.mockReturnValue(2_000_000)
        await user.keyboard('a')
        expect(screen.getByRole('menuitem', { name: 'Apple' })).toHaveFocus()
        await user.keyboard('a')
        expect(screen.getByRole('menuitem', { name: 'Avocado' })).toHaveFocus()
      } finally {
        nowSpy.mockRestore()
      }
    })

    it('closes on an outside pointerdown', () => {
      render(<Fruits />)
      const toggle = screen.getByRole('button', { name: 'Create' })
      expect(toggle).toHaveAttribute('aria-expanded', 'true')
      fireEvent.pointerDown(document.body)
      expect(toggle).toHaveAttribute('aria-expanded', 'false')
    })
  })
})
