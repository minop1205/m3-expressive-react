import { useState, type MouseEvent } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { Menu, MenuItem, SUBMENU_HOVER_DELAY_MS, type MenuAnchorPosition } from './Menu'

function FileMenu({ onPdf = () => {}, dir }: { onPdf?: () => void; dir?: 'rtl' }) {
  return (
    <div dir={dir}>
      <Menu trigger={<button>File</button>} aria-label="File">
        <MenuItem>New</MenuItem>
        <MenuItem
          submenu={
            <>
              <MenuItem onClick={onPdf}>PDF</MenuItem>
              <MenuItem>PNG</MenuItem>
            </>
          }
        >
          Export
        </MenuItem>
        <MenuItem>Close</MenuItem>
      </Menu>
    </div>
  )
}

const item = (name: string) => screen.getByRole('menuitem', { name })

async function openToExport(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'File' }))
  await user.keyboard('{ArrowDown}')
  expect(item('Export')).toHaveFocus()
}

describe('Menu submenus (B34, #436)', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('wires the parent item to its submenu (APG)', async () => {
    const user = userEvent.setup()
    render(<FileMenu />)
    await user.click(screen.getByRole('button', { name: 'File' }))
    const exportItem = item('Export')
    expect(exportItem).toHaveAttribute('aria-haspopup', 'menu')
    expect(exportItem).toHaveAttribute('aria-expanded', 'false')
    const submenu = document.getElementById(exportItem.getAttribute('aria-controls')!)!
    expect(submenu).toHaveAttribute('role', 'menu')
    expect(submenu).toHaveAttribute('aria-labelledby', exportItem.id)
  })

  it('ArrowRight opens the submenu and focuses its first item; ArrowLeft returns', async () => {
    const user = userEvent.setup()
    render(<FileMenu />)
    await openToExport(user)
    await user.keyboard('{ArrowRight}')
    expect(item('Export')).toHaveAttribute('aria-expanded', 'true')
    expect(item('PDF')).toHaveFocus()
    // Arrow keys move within the submenu only.
    await user.keyboard('{ArrowDown}')
    expect(item('PNG')).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(item('PDF')).toHaveFocus()
    await user.keyboard('{ArrowLeft}')
    expect(item('Export')).toHaveAttribute('aria-expanded', 'false')
    expect(item('Export')).toHaveFocus()
    expect(screen.getByRole('button', { name: 'File' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('Enter opens the submenu; Escape closes only the submenu', async () => {
    const user = userEvent.setup()
    render(<FileMenu />)
    await openToExport(user)
    await user.keyboard('{Enter}')
    expect(item('PDF')).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(item('Export')).toHaveFocus()
    expect(screen.getByRole('button', { name: 'File' })).toHaveAttribute('aria-expanded', 'true')
    await user.keyboard('{Escape}')
    expect(screen.getByRole('button', { name: 'File' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('button', { name: 'File' })).toHaveFocus()
  })

  it('mirrors the arrow keys in RTL', async () => {
    const user = userEvent.setup()
    render(<FileMenu dir="rtl" />)
    // jsdom has no layout direction: report RTL from the computed style.
    const real = window.getComputedStyle
    vi.spyOn(window, 'getComputedStyle').mockImplementation((el, pseudo) => {
      const style = real(el, pseudo)
      return el instanceof Element && el.closest('[dir="rtl"]')
        ? ({
            ...style,
            direction: 'rtl',
            getPropertyValue: style.getPropertyValue.bind(style),
          } as CSSStyleDeclaration)
        : style
    })
    await openToExport(user)
    await user.keyboard('{ArrowRight}')
    expect(item('Export')).toHaveAttribute('aria-expanded', 'false')
    await user.keyboard('{ArrowLeft}')
    expect(item('PDF')).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(item('Export')).toHaveFocus()
    expect(item('Export')).toHaveAttribute('aria-expanded', 'false')
  })

  it('activating a submenu item closes the whole menu and returns focus to the trigger', async () => {
    const user = userEvent.setup()
    const onPdf = vi.fn()
    render(<FileMenu onPdf={onPdf} />)
    await openToExport(user)
    await user.keyboard('{ArrowRight}{Enter}')
    expect(onPdf).toHaveBeenCalled()
    const trigger = screen.getByRole('button', { name: 'File' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveFocus()
    expect(screen.getByRole('menuitem', { name: 'Export', hidden: true })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })

  it('a click opens the submenu without closing the menu', async () => {
    const user = userEvent.setup()
    render(<FileMenu />)
    await user.click(screen.getByRole('button', { name: 'File' }))
    await user.click(item('Export'))
    expect(item('Export')).toHaveAttribute('aria-expanded', 'true')
    expect(item('PDF')).toHaveFocus()
    expect(screen.getByRole('button', { name: 'File' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('Tab from a submenu closes the whole menu', async () => {
    const user = userEvent.setup()
    render(<FileMenu />)
    await openToExport(user)
    await user.keyboard('{ArrowRight}')
    await user.tab()
    expect(screen.getByRole('button', { name: 'File' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('opens and closes on hover after the hover-intent delay', async () => {
    vi.useFakeTimers()
    render(<FileMenu />)
    fireEvent.click(screen.getByRole('button', { name: 'File' }))
    const host = item('Export')
    fireEvent.mouseEnter(host)
    act(() => vi.advanceTimersByTime(SUBMENU_HOVER_DELAY_MS - 1))
    expect(item('Export')).toHaveAttribute('aria-expanded', 'false')
    act(() => vi.advanceTimersByTime(1))
    expect(item('Export')).toHaveAttribute('aria-expanded', 'true')
    // Hover opening does not move focus.
    expect(item('PDF')).not.toHaveFocus()
    // Leaving and coming back within the delay keeps it open.
    fireEvent.mouseLeave(host)
    act(() => vi.advanceTimersByTime(SUBMENU_HOVER_DELAY_MS / 2))
    fireEvent.mouseEnter(host)
    act(() => vi.advanceTimersByTime(SUBMENU_HOVER_DELAY_MS))
    expect(item('Export')).toHaveAttribute('aria-expanded', 'true')
    fireEvent.mouseLeave(host)
    act(() => vi.advanceTimersByTime(SUBMENU_HOVER_DELAY_MS))
    expect(item('Export')).toHaveAttribute('aria-expanded', 'false')
  })

  it('the parent menu typeahead ignores submenu items', async () => {
    const user = userEvent.setup()
    render(<FileMenu />)
    await user.click(screen.getByRole('button', { name: 'File' }))
    await user.keyboard('p') // "PDF" lives in the submenu
    expect(item('New')).toHaveFocus()
  })

  it('has no axe violations with an open submenu', async () => {
    const user = userEvent.setup()
    const { container } = render(<FileMenu />)
    await openToExport(user)
    await user.keyboard('{ArrowRight}')
    expect(await axe(container)).toHaveNoViolations()
  })
})

function ContextMenuExample() {
  const [position, setPosition] = useState<MenuAnchorPosition | null>(null)
  const onContextMenu = (event: MouseEvent<HTMLElement>) => {
    event.preventDefault()
    setPosition({ top: event.clientY, left: event.clientX })
  }
  return (
    <>
      <button onContextMenu={onContextMenu}>Photo</button>
      <Menu
        aria-label="Photo actions"
        open={position !== null}
        onOpenChange={(open) => !open && setPosition(null)}
        anchorPosition={position ?? undefined}
      >
        <MenuItem>Copy</MenuItem>
        <MenuItem>Download</MenuItem>
      </Menu>
    </>
  )
}

describe('Menu anchorPosition (context menu, B34)', () => {
  it('opens at the pointer on contextmenu and focuses the first item', async () => {
    const user = userEvent.setup()
    render(<ContextMenuExample />)
    const target = screen.getByRole('button', { name: 'Photo' })
    target.focus()
    fireEvent.contextMenu(target, { clientX: 120, clientY: 80 })
    const menu = screen.getByRole('menu', { name: 'Photo actions' })
    expect(menu).toHaveAttribute('data-open')
    expect(menu).toHaveAttribute('data-anchor', 'position')
    expect(menu.style.top).toBe('80px')
    expect(menu.style.left).toBe('120px')
    expect(item('Copy')).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(menu).not.toHaveAttribute('data-open')
    // No trigger: focus returns to the element focused before opening.
    expect(target).toHaveFocus()
  })

  it('has no axe violations when open', async () => {
    const { container } = render(<ContextMenuExample />)
    fireEvent.contextMenu(screen.getByRole('button', { name: 'Photo' }), {
      clientX: 10,
      clientY: 10,
    })
    expect(await axe(container)).toHaveNoViolations()
  })
})
