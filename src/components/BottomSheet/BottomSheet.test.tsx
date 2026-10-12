import { createRef, useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { BottomSheet } from './BottomSheet'

describe('BottomSheet', () => {
  it('renders a modal dialog with its content', () => {
    render(
      <BottomSheet open aria-label="Actions">
        <p>Sheet content</p>
      </BottomSheet>,
    )
    const dialog = screen.getByRole('dialog', { name: 'Actions' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByText('Sheet content')).toBeInTheDocument()
  })

  it('closes on Escape', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <BottomSheet open onClose={onClose} aria-label="s">
        x
      </BottomSheet>,
    )
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('can hide the drag handle', () => {
    const { container, rerender } = render(
      <BottomSheet open aria-label="s" showDragHandle>
        x
      </BottomSheet>,
    )
    expect(container.querySelector('[class*="dragHandle"]')).toBeInTheDocument()
    rerender(
      <BottomSheet open aria-label="s" showDragHandle={false}>
        x
      </BottomSheet>,
    )
    expect(container.querySelector('[class*="dragHandle"]')).not.toBeInTheDocument()
  })

  it('forwards a ref', () => {
    const ref = createRef<HTMLDivElement>()
    render(
      <BottomSheet ref={ref} open aria-label="s">
        x
      </BottomSheet>,
    )
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('has no axe violations', async () => {
    const { container } = render(
      <BottomSheet open aria-label="Options">
        <p>Content</p>
      </BottomSheet>,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})

function SheetHarness() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}>Open sheet</button>
      <button>Outside</button>
      <BottomSheet open={open} onClose={() => setOpen(false)} aria-label="Options">
        <button>First</button>
        <button>Last</button>
      </BottomSheet>
    </>
  )
}

describe('BottomSheet modal behavior (useModal)', () => {
  it('moves focus in on open (drag handle is first) and restores it on close', async () => {
    const user = userEvent.setup()
    render(<SheetHarness />)
    const trigger = screen.getByRole('button', { name: 'Open sheet' })
    await user.click(trigger)
    expect(screen.getByRole('button', { name: 'Drag handle' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(trigger).toHaveFocus()
  })

  it('wraps Tab inside the sheet', async () => {
    const user = userEvent.setup()
    render(<SheetHarness />)
    await user.click(screen.getByRole('button', { name: 'Open sheet' }))
    await user.tab() // Drag handle -> First
    await user.tab() // -> Last
    await user.tab() // wraps -> Drag handle
    expect(screen.getByRole('button', { name: 'Drag handle' })).toHaveFocus()
  })

  it('locks scroll and inerts the background while open', async () => {
    const user = userEvent.setup()
    render(<SheetHarness />)
    const outside = screen.getByRole('button', { name: 'Outside' })
    await user.click(screen.getByRole('button', { name: 'Open sheet' }))
    expect(document.body.style.overflow).toBe('hidden')
    expect(outside.closest('[inert]')).not.toBeNull()
    await user.keyboard('{Escape}')
    expect(document.body.style.overflow).not.toBe('hidden')
    expect(outside.closest('[inert]')).toBeNull()
  })
})

describe('BottomSheet accessible name', () => {
  it('falls back to a generic name', () => {
    render(<BottomSheet open>Body</BottomSheet>)
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Bottom sheet')
  })

  it('prefers a consumer aria-label', () => {
    render(<BottomSheet open aria-label="Share options">Body</BottomSheet>)
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Share options')
  })
})

/** jsdom drops props passed to fireEvent.pointer*; construct events manually. */
function firePointer(el: Element, type: string, props: Record<string, unknown>) {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.assign(event, props)
  fireEvent(el, event)
}

/**
 * jsdom has no layout: give the sheet a 400px height in an 800px container,
 * so the partial detent rests at translateY(200px).
 */
function stubSizes(sheetHeight = 400, fullHeight = 800) {
  const sheet = (screen.queryByRole('dialog') ?? screen.getByRole('region')) as HTMLElement
  Object.defineProperty(sheet, 'offsetHeight', { value: sheetHeight, configurable: true })
  Object.defineProperty(sheet.parentElement as HTMLElement, 'clientHeight', {
    value: fullHeight,
    configurable: true,
  })
  return sheet
}

describe('BottomSheet drag handle', () => {
  it('is an accessible button that dismisses on click (skipPartiallyExpanded)', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <BottomSheet open onClose={onClose} skipPartiallyExpanded>
        Body
      </BottomSheet>,
    )
    const handle = screen.getByRole('button', { name: 'Close' })
    await user.click(handle)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('dismisses via keyboard on the handle (skipPartiallyExpanded)', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <BottomSheet open onClose={onClose} skipPartiallyExpanded>
        Body
      </BottomSheet>,
    )
    screen.getByRole('button', { name: 'Close' }).focus()
    await user.keyboard('{Enter}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('dismisses when dragged past the distance threshold', () => {
    const onClose = vi.fn()
    render(
      <BottomSheet open onClose={onClose}>
        Body
      </BottomSheet>,
    )
    const handle = screen.getByRole('button', { name: 'Drag handle' })
    stubSizes()
    firePointer(handle, 'pointerdown', { pointerId: 1, clientY: 300 })
    firePointer(handle, 'pointermove', { pointerId: 1, clientY: 400 })
    firePointer(handle, 'pointerup', { pointerId: 1, clientY: 400 })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('settles back after a short slow drag and suppresses the trailing click', () => {
    // Space the velocity samples 200ms apart so the synthetic drag is "slow".
    let clock = 0
    const nowSpy = vi.spyOn(Date, 'now').mockImplementation(() => (clock += 200))
    const onClose = vi.fn()
    render(
      <BottomSheet open onClose={onClose}>
        Body
      </BottomSheet>,
    )
    const handle = screen.getByRole('button', { name: 'Drag handle' })
    const sheet = stubSizes()
    firePointer(handle, 'pointerdown', { pointerId: 1, clientY: 300 })
    firePointer(handle, 'pointermove', { pointerId: 1, clientY: 320 })
    firePointer(handle, 'pointerup', { pointerId: 1, clientY: 320 })
    expect(onClose).not.toHaveBeenCalled()
    expect(sheet.style.transform).toBe('')
    // The click event that follows a real drag must not dismiss.
    fireEvent.click(handle)
    expect(onClose).not.toHaveBeenCalled()
    nowSpy.mockRestore()
  })

  /** A settable Date.now (React itself also reads the clock per event). */
  function mockClock() {
    const clock = { now: 0 }
    const spy = vi.spyOn(Date, 'now').mockImplementation(() => clock.now)
    return { clock, restore: () => spy.mockRestore() }
  }

  it('dismisses on a fresh short fling (#433)', () => {
    // down @0, move 30px @32, release @40: ~750px/s at release.
    const onClose = vi.fn()
    render(
      <BottomSheet open onClose={onClose}>
        Body
      </BottomSheet>,
    )
    const handle = screen.getByRole('button', { name: 'Drag handle' })
    stubSizes()
    const { clock, restore } = mockClock()
    firePointer(handle, 'pointerdown', { pointerId: 1, clientY: 300 })
    clock.now = 32
    firePointer(handle, 'pointermove', { pointerId: 1, clientY: 330 })
    clock.now = 40
    firePointer(handle, 'pointerup', { pointerId: 1, clientY: 330 })
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onClose.mock.calls[0][1]).toBe('drag')
    restore()
  })

  it('ignores a stale fling: flick, hold still, then release (#433)', () => {
    // Same 30px flick in 32ms, but the release comes 1s later.
    const onClose = vi.fn()
    render(
      <BottomSheet open onClose={onClose}>
        Body
      </BottomSheet>,
    )
    const handle = screen.getByRole('button', { name: 'Drag handle' })
    stubSizes()
    const { clock, restore } = mockClock()
    firePointer(handle, 'pointerdown', { pointerId: 1, clientY: 300 })
    clock.now = 32
    firePointer(handle, 'pointermove', { pointerId: 1, clientY: 330 })
    clock.now = 1032
    firePointer(handle, 'pointerup', { pointerId: 1, clientY: 330 })
    expect(onClose).not.toHaveBeenCalled()
    restore()
  })

  it('pointercancel after a drag does not swallow the next activation (#433)', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <BottomSheet open onClose={onClose} skipPartiallyExpanded>
        Body
      </BottomSheet>,
    )
    const handle = screen.getByRole('button', { name: 'Close' })
    stubSizes()
    firePointer(handle, 'pointerdown', { pointerId: 1, clientY: 300 })
    firePointer(handle, 'pointermove', { pointerId: 1, clientY: 400 })
    firePointer(handle, 'pointercancel', { pointerId: 1, clientY: 400 })
    expect(onClose).not.toHaveBeenCalled()
    handle.focus()
    await user.keyboard('{Enter}')
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onClose.mock.calls[0][1]).toBe('closeButton')
  })

  it('a new pointerdown clears a leftover drag flag', () => {
    const onClose = vi.fn()
    render(
      <BottomSheet open onClose={onClose} skipPartiallyExpanded>
        Body
      </BottomSheet>,
    )
    const handle = screen.getByRole('button', { name: 'Close' })
    // A drag whose trailing click never arrives (e.g. released off the handle).
    firePointer(handle, 'pointerdown', { pointerId: 1, clientY: 300 })
    firePointer(handle, 'pointermove', { pointerId: 1, clientY: 320 })
    firePointer(handle, 'pointerup', { pointerId: 1, clientY: 320 })
    onClose.mockClear()
    // A later tap: down + up in place, then its click.
    firePointer(handle, 'pointerdown', { pointerId: 2, clientY: 300 })
    firePointer(handle, 'pointerup', { pointerId: 2, clientY: 300 })
    fireEvent.click(handle)
    expect(onClose).toHaveBeenCalledWith(expect.anything(), 'closeButton')
  })
})

describe('BottomSheet onClose reason (#407)', () => {
  it('reports escapeKeyDown, backdropClick and closeButton', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const { container } = render(
      <BottomSheet open onClose={onClose} skipPartiallyExpanded>
        Body
      </BottomSheet>,
    )
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenLastCalledWith(expect.any(KeyboardEvent), 'escapeKeyDown')
    fireEvent.click(container.querySelector('[aria-hidden="true"]') as Element)
    expect(onClose).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'click' }), 'backdropClick')
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'click' }), 'closeButton')
  })
})

describe('BottomSheet detents (#437)', () => {
  const rootOf = (sheet: HTMLElement) => sheet.parentElement as HTMLElement

  it('opens partially expanded and the handle toggles partial / expanded', async () => {
    const user = userEvent.setup()
    const onExpandedChange = vi.fn()
    render(
      <BottomSheet open onExpandedChange={onExpandedChange}>
        Body
      </BottomSheet>,
    )
    const sheet = screen.getByRole('dialog')
    const handle = screen.getByRole('button', { name: 'Drag handle' })
    expect(rootOf(sheet)).toHaveAttribute('data-detent', 'partial')
    expect(handle).toHaveAttribute('aria-expanded', 'false')
    await user.click(handle)
    expect(rootOf(sheet)).toHaveAttribute('data-detent', 'expanded')
    expect(handle).toHaveAttribute('aria-expanded', 'true')
    expect(onExpandedChange).toHaveBeenLastCalledWith(true)
    await user.keyboard('{Enter}')
    expect(rootOf(sheet)).toHaveAttribute('data-detent', 'partial')
    expect(onExpandedChange).toHaveBeenLastCalledWith(false)
    await user.keyboard(' ')
    expect(handle).toHaveAttribute('aria-expanded', 'true')
  })

  it('supports a controlled expanded prop', async () => {
    const user = userEvent.setup()
    const onExpandedChange = vi.fn()
    const { rerender } = render(
      <BottomSheet open expanded={false} onExpandedChange={onExpandedChange}>
        Body
      </BottomSheet>,
    )
    const handle = screen.getByRole('button', { name: 'Drag handle' })
    await user.click(handle)
    expect(onExpandedChange).toHaveBeenCalledWith(true)
    expect(handle).toHaveAttribute('aria-expanded', 'false')
    rerender(
      <BottomSheet open expanded onExpandedChange={onExpandedChange}>
        Body
      </BottomSheet>,
    )
    expect(handle).toHaveAttribute('aria-expanded', 'true')
  })

  it('skipPartiallyExpanded always opens expanded, without aria-expanded', () => {
    render(
      <BottomSheet open skipPartiallyExpanded defaultExpanded={false}>
        Body
      </BottomSheet>,
    )
    const sheet = screen.getByRole('dialog')
    expect(rootOf(sheet)).toHaveAttribute('data-detent', 'expanded')
    expect(screen.getByRole('button', { name: 'Close' })).not.toHaveAttribute('aria-expanded')
  })

  it('an uncontrolled sheet reopens at its initial detent', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<BottomSheet open>Body</BottomSheet>)
    await user.click(screen.getByRole('button', { name: 'Drag handle' }))
    const sheet = screen.getByRole('dialog')
    expect(rootOf(sheet)).toHaveAttribute('data-detent', 'expanded')
    rerender(<BottomSheet open={false}>Body</BottomSheet>)
    rerender(<BottomSheet open>Body</BottomSheet>)
    expect(rootOf(sheet)).toHaveAttribute('data-detent', 'partial')
  })

  /** Slow drag: 200ms between samples keeps the velocity under the threshold. */
  function slowDrag(handle: Element, from: number, to: number) {
    let clock = 0
    const spy = vi.spyOn(Date, 'now').mockImplementation(() => (clock += 200))
    firePointer(handle, 'pointerdown', { pointerId: 1, clientY: from })
    firePointer(handle, 'pointermove', { pointerId: 1, clientY: to })
    firePointer(handle, 'pointerup', { pointerId: 1, clientY: to })
    spy.mockRestore()
  }

  it('drags up from partial to expanded, and down from expanded to partial', () => {
    const onClose = vi.fn()
    render(
      <BottomSheet open onClose={onClose}>
        Body
      </BottomSheet>,
    )
    const sheet = stubSizes() // partial rests at 200px of a 400px sheet
    const handle = screen.getByRole('button', { name: 'Drag handle' })
    slowDrag(handle, 500, 400) // -100px: past the 56px threshold
    expect(rootOf(sheet)).toHaveAttribute('data-detent', 'expanded')
    slowDrag(handle, 400, 480) // +80px: past 56, short of partial (200)
    expect(rootOf(sheet)).toHaveAttribute('data-detent', 'partial')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('a slow drag from expanded past the partial detent dismisses', () => {
    const onClose = vi.fn()
    render(
      <BottomSheet open defaultExpanded onClose={onClose}>
        Body
      </BottomSheet>,
    )
    stubSizes()
    slowDrag(screen.getByRole('button', { name: 'Drag handle' }), 300, 550)
    expect(onClose).toHaveBeenCalledWith(expect.anything(), 'drag')
  })

  it('a downward fling from expanded settles at partial, not hidden', () => {
    const onClose = vi.fn()
    render(
      <BottomSheet open defaultExpanded onClose={onClose}>
        Body
      </BottomSheet>,
    )
    const sheet = stubSizes()
    const handle = screen.getByRole('button', { name: 'Drag handle' })
    const clock = { now: 0 }
    const spy = vi.spyOn(Date, 'now').mockImplementation(() => clock.now)
    firePointer(handle, 'pointerdown', { pointerId: 1, clientY: 300 })
    clock.now = 32
    firePointer(handle, 'pointermove', { pointerId: 1, clientY: 330 })
    clock.now = 40
    firePointer(handle, 'pointerup', { pointerId: 1, clientY: 330 })
    spy.mockRestore()
    expect(onClose).not.toHaveBeenCalled()
    expect(rootOf(sheet)).toHaveAttribute('data-detent', 'partial')
  })

  it('has no axe violations when expanded', async () => {
    const { container } = render(
      <BottomSheet open defaultExpanded aria-label="Options">
        <p>Content</p>
      </BottomSheet>,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})

function StandardHarness({ onClose }: { onClose?: () => void }) {
  return (
    <div style={{ position: 'relative', height: 600 }}>
      <button>Page action</button>
      <BottomSheet variant="standard" open onClose={onClose} aria-label="Now playing">
        <button>Play</button>
      </BottomSheet>
    </div>
  )
}

describe('BottomSheet variant="standard" (#437)', () => {
  it('is a non-modal region without a scrim', () => {
    const { container } = render(<StandardHarness />)
    const sheet = screen.getByRole('region', { name: 'Now playing' })
    expect(sheet).not.toHaveAttribute('aria-modal')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(container.querySelector('[class*="scrim"]')).toBeNull()
    expect(sheet.parentElement).toHaveAttribute('data-variant', 'standard')
  })

  it('does not trap focus, inert the page or lock scroll', async () => {
    const user = userEvent.setup()
    render(<StandardHarness />)
    const pageAction = screen.getByRole('button', { name: 'Page action' })
    expect(pageAction.closest('[inert]')).toBeNull()
    expect(document.body.style.overflow).not.toBe('hidden')
    // Focus is not moved into the sheet, and Tab leaves it normally.
    expect(document.body).toHaveFocus()
    await user.tab()
    expect(pageAction).toHaveFocus()
    await user.tab()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Play' })).toHaveFocus()
    await user.tab()
    expect(document.body).toHaveFocus()
  })

  it('closes on Escape only while focus is inside the sheet', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<StandardHarness onClose={onClose} />)
    screen.getByRole('button', { name: 'Page action' }).focus()
    await user.keyboard('{Escape}')
    expect(onClose).not.toHaveBeenCalled()
    screen.getByRole('button', { name: 'Play' }).focus()
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledWith(expect.anything(), 'escapeKeyDown')
  })

  it('has detents too', async () => {
    const user = userEvent.setup()
    render(<StandardHarness />)
    const handle = screen.getByRole('button', { name: 'Drag handle' })
    await user.click(handle)
    expect(handle).toHaveAttribute('aria-expanded', 'true')
  })

  it('has no axe violations', async () => {
    const { container } = render(<StandardHarness />)
    expect(await axe(container)).toHaveNoViolations()
  })
})
