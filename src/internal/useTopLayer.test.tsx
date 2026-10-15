import { useRef, useState } from 'react'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { installPopoverMock, type PopoverMock } from '../test/popover'
import { Dialog } from '../components/Dialog'
import { Menu, MenuItem } from '../components/Menu'
import { BottomSheet } from '../components/BottomSheet'
import { SideSheet } from '../components/SideSheet'
import { NavigationDrawer } from '../components/NavigationDrawer'
import { NavigationRail, NavigationRailItem } from '../components/NavigationRail'
import { DatePicker } from '../components/DatePicker'
import { TimePicker } from '../components/TimePicker'
import { SnackbarProvider, useSnackbar, type UseSnackbarResult } from '../components/Snackbar'
import { useModalTopLayer, visibilityExitTime } from './useTopLayer'

/*
 * Ruling B45: open modal surfaces are drawn in the top layer, in show order
 * (later = on top), and the Snackbar host is kept above them.
 */

let popover: PopoverMock
beforeEach(() => {
  popover = installPopoverMock()
})
afterEach(() => {
  popover.restore()
  vi.useRealTimers()
})

const dialogRoot = () => screen.getByRole('dialog').parentElement as HTMLElement
const menuPopup = () => screen.getByRole('menu')

function MenuThenDialog({ keepMenuOpen = false }: { keepMenuOpen?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(keepMenuOpen)
  const [dialogOpen, setDialogOpen] = useState(false)
  return (
    <>
      <Menu
        trigger={<button type="button">Actions</button>}
        aria-label="Actions"
        open={menuOpen}
        onOpenChange={(next) => {
          if (!keepMenuOpen) setMenuOpen(next)
        }}
      >
        <MenuItem onClick={() => setDialogOpen(true)}>Delete…</MenuItem>
      </Menu>
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="Delete file?">
        Body
      </Dialog>
    </>
  )
}

describe('top layer (B45)', () => {
  it('paints a dialog opened from a menu item above the menu (show order)', async () => {
    const user = userEvent.setup()
    render(<MenuThenDialog keepMenuOpen />)
    const menu = menuPopup()
    expect(popover.topLayer()).toEqual([menu])

    await user.click(screen.getByRole('menuitem', { name: 'Delete…' }))
    const root = dialogRoot()
    expect(root).toHaveAttribute('popover', 'manual')
    expect(popover.topLayer()).toEqual([menu, root])
    expect(popover.showCalls.indexOf(root)).toBeGreaterThan(popover.showCalls.indexOf(menu))
  })

  it('leaves only the dialog in the top layer when the menu closes on select', async () => {
    const user = userEvent.setup()
    render(<MenuThenDialog />)
    await user.click(screen.getByRole('button', { name: 'Actions' }))
    await user.click(screen.getByRole('menuitem', { name: 'Delete…' }))
    expect(popover.topLayer()).toEqual([dialogRoot()])
  })

  it('paints a menu opened inside a dialog above the dialog', async () => {
    const user = userEvent.setup()
    render(
      <Dialog open title="Options">
        <Menu trigger={<button type="button">More</button>} aria-label="More">
          <MenuItem>Rename</MenuItem>
        </Menu>
      </Dialog>,
    )
    const root = dialogRoot()
    await user.click(screen.getByRole('button', { name: 'More' }))
    expect(popover.topLayer()).toEqual([root, menuPopup()])
  })

  it('re-raises a dialog reopened after a later popup was shown', () => {
    const { rerender } = render(<Dialog open={false} title="A" />)
    const root = screen.getByRole('dialog', { hidden: true }).parentElement as HTMLElement
    rerender(<Dialog open title="A" />)
    expect(popover.topLayer()).toEqual([root])
    rerender(<Dialog open={false} title="A" />)
    // jsdom resolves no transition durations here: it leaves at once.
    expect(popover.topLayer()).toEqual([])
    rerender(<Dialog open title="A" />)
    expect(popover.topLayer()).toEqual([root])
    expect(popover.showCalls.filter((el) => el === root)).toHaveLength(2)
  })

  it('keeps the dialog in the DOM where it was rendered (theme tokens inherit)', () => {
    render(
      <div data-testid="theme">
        <Dialog open title="Inline" />
      </div>,
    )
    expect(screen.getByTestId('theme')).toContainElement(dialogRoot())
  })

  it('promotes each modal surface while open, and not the inline variants', () => {
    const { unmount } = render(
      <>
        <BottomSheet open aria-label="Share">
          Body
        </BottomSheet>
        <SideSheet variant="modal" open headline="Filters">
          Body
        </SideSheet>
        <NavigationDrawer variant="modal" open aria-label="Main">
          Body
        </NavigationDrawer>
        <DatePicker open onClose={() => {}} />
        <TimePicker open onClose={() => {}} />
        <BottomSheet variant="standard" open aria-label="Inline">
          Body
        </BottomSheet>
        <SideSheet open headline="Standard">
          Body
        </SideSheet>
      </>,
    )
    const dialogs = screen.getAllByRole('dialog')
    expect(dialogs).toHaveLength(5)
    const shown = popover.topLayer()
    // Each root wraps its role="dialog" surface (the scrim is a sibling).
    for (const surface of dialogs) {
      expect(shown.some((root) => root.contains(surface))).toBe(true)
    }
    expect(shown).toHaveLength(5)
    expect(shown.some((el) => el.contains(screen.getByRole('region', { name: 'Inline' })))).toBe(
      false,
    )
    unmount()
    expect(popover.topLayer()).toEqual([])
  })

  it('promotes the modal rail scrim, then its surface pinned to the root rect', () => {
    function Rail({ open }: { open: boolean }) {
      return (
        <NavigationRail
          aria-label="Mail"
          modal
          variant={open ? 'expanded' : 'collapsed'}
          defaultValue="a"
        >
          <NavigationRailItem value="a" icon={<svg />} label="Alpha" />
        </NavigationRail>
      )
    }
    const { rerender } = render(<Rail open={false} />)
    expect(popover.topLayer()).toEqual([])
    rerender(<Rail open />)
    const surface = screen.getByRole('dialog')
    const root = surface.parentElement as HTMLElement
    const scrim = root.firstElementChild as HTMLElement
    expect(popover.topLayer()).toEqual([scrim, surface])
    // The root keeps the collapsed rail's place in the page.
    expect(root).not.toHaveAttribute('popover')
    expect(surface.style.getPropertyValue('--_top-layer-top')).toBe('0px')
    expect(surface.style.getPropertyValue('--_top-layer-left')).toBe('0px')
    expect(surface.style.getPropertyValue('--_top-layer-right')).toBe('auto')
    rerender(<Rail open={false} />)
    expect(popover.topLayer()).toEqual([])
  })

  it('stays in the top layer for the delayed-visibility exit, then leaves', () => {
    vi.useFakeTimers()
    function Overlay({ open }: { open: boolean }) {
      const ref = useRef<HTMLDivElement>(null)
      useModalTopLayer(open, [ref])
      return (
        <div
          ref={ref}
          data-testid="overlay"
          // Longhands: jsdom doesn't expand the `transition` shorthand.
          style={{
            transitionProperty: 'opacity, visibility',
            transitionDuration: '0.2s, 0s',
            transitionDelay: open ? '0s' : '0s, 300ms',
          }}
        />
      )
    }
    const { rerender } = render(<Overlay open />)
    const el = screen.getByTestId('overlay')
    expect(visibilityExitTime(el)).toBe(0)
    expect(popover.topLayer()).toEqual([el])
    rerender(<Overlay open={false} />)
    expect(visibilityExitTime(el)).toBe(300)
    act(() => vi.advanceTimersByTime(299))
    expect(popover.topLayer()).toEqual([el])
    act(() => vi.advanceTimersByTime(1))
    expect(popover.topLayer()).toEqual([])
    // Reopened during the exit: stays, re-raised.
    rerender(<Overlay open />)
    rerender(<Overlay open={false} />)
    rerender(<Overlay open />)
    act(() => vi.advanceTimersByTime(400))
    expect(popover.topLayer()).toEqual([el])
  })

  it('falls back to the z-index layer without the Popover API', () => {
    popover.restore()
    render(<Dialog open title="Fallback" />)
    expect(dialogRoot()).not.toHaveAttribute('popover')
    expect(screen.getByRole('dialog')).toBeVisible()
  })

  it('has no axe violations with the dialog in the top layer', async () => {
    const { container } = render(<Dialog open title="Accessible" />)
    expect(dialogRoot()).toHaveAttribute('popover', 'manual')
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('Snackbar above modals (B45)', () => {
  let api: UseSnackbarResult
  function Grab() {
    api = useSnackbar()
    return null
  }
  const host = () => screen.getByRole('status').parentElement as HTMLElement

  it('shows the host in the top layer only while a snackbar shows', () => {
    vi.useFakeTimers()
    render(
      <SnackbarProvider>
        <Grab />
      </SnackbarProvider>,
    )
    expect(popover.topLayer()).toEqual([])
    act(() => {
      void api.show('Saved')
    })
    expect(popover.topLayer()).toEqual([host()])
    act(() => api.close())
    act(() => vi.advanceTimersByTime(200))
    expect(popover.topLayer()).toEqual([])
  })

  it('re-raises the host above a modal opened while a snackbar shows', () => {
    const { rerender } = render(
      <SnackbarProvider>
        <Grab />
        <Dialog open={false} title="Later" />
      </SnackbarProvider>,
    )
    act(() => {
      void api.show('Archived')
    })
    rerender(
      <SnackbarProvider>
        <Grab />
        <Dialog open title="Later" />
      </SnackbarProvider>,
    )
    expect(popover.topLayer()).toEqual([dialogRoot(), host()])
    expect(popover.showCalls.lastIndexOf(host())).toBeGreaterThan(
      popover.showCalls.indexOf(dialogRoot()),
    )
  })

  it('shows a snackbar raised while a modal is open above it', () => {
    render(
      <SnackbarProvider>
        <Grab />
        <Dialog open title="Open" />
      </SnackbarProvider>,
    )
    act(() => {
      void api.show('Copied')
    })
    expect(popover.topLayer()).toEqual([dialogRoot(), host()])
  })
})
