import { createRef, useState } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { List, ListItem } from '../List'
import { SwipeToDismiss, type SwipeDismissDirection } from './SwipeToDismiss'

const WIDTH = 300

// jsdom PointerEvents drop clientX; MouseEvent-typed pointer events carry it.
// Event.timeStamp follows the (fake) clock, so `advance` controls velocity.
function pointer(el: HTMLElement, type: string, clientX: number, clientY = 0) {
  fireEvent(el, new MouseEvent(type, { clientX, clientY, bubbles: true }))
}
function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}
/** Drag in `steps` moves spread over `ms`, then optionally rest, then release. */
function swipe(
  el: HTMLElement,
  from: number,
  to: number,
  { ms = 800, steps = 8, restMs = 0 }: { ms?: number; steps?: number; restMs?: number } = {},
) {
  pointer(el, 'pointerdown', from)
  for (let i = 1; i <= steps; i++) {
    advance(ms / steps)
    pointer(el, 'pointermove', from + ((to - from) * i) / steps)
  }
  if (restMs) advance(restMs)
  pointer(el, 'pointerup', to)
}
const contentOf = (text: string) => screen.getByText(text).parentElement as HTMLElement

let transitionMs = 0
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date', 'performance'] })
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(WIDTH)
  transitionMs = 0
  const real = window.getComputedStyle.bind(window)
  vi.spyOn(window, 'getComputedStyle').mockImplementation((el, pseudo) => {
    const style = real(el, pseudo)
    if (!transitionMs) return style
    return new Proxy(style, {
      get: (target, prop) =>
        prop === 'transitionDuration'
          ? `${transitionMs / 1000}s`
          : prop === 'transitionDelay'
            ? '0s'
            : Reflect.get(target, prop),
    })
  })
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  document.documentElement.removeAttribute('dir')
})

describe('SwipeToDismiss', () => {
  it('renders content and background', () => {
    render(
      <SwipeToDismiss background={<span>bg</span>}>
        <span>content</span>
      </SwipeToDismiss>,
    )
    expect(screen.getByText('content')).toBeInTheDocument()
    expect(screen.getByText('bg')).toBeInTheDocument()
  })

  describe('gesture', () => {
    it('does not move within the 8px touch slop, and nested buttons still get clicks', () => {
      const onClick = vi.fn()
      render(
        <SwipeToDismiss>
          <span>row</span>
          <button onClick={onClick}>action</button>
        </SwipeToDismiss>,
      )
      const button = screen.getByRole('button', { name: 'action' })
      pointer(button, 'pointerdown', 100)
      pointer(button, 'pointermove', 106)
      expect(contentOf('row').style.transform).toBe('translateX(0px)')
      pointer(button, 'pointerup', 106)
      fireEvent.click(button)
      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('subtracts the slop once dragging starts and suppresses the click after a drag', () => {
      const onClick = vi.fn()
      render(
        <SwipeToDismiss>
          <span>row</span>
          <button onClick={onClick}>action</button>
        </SwipeToDismiss>,
      )
      const button = screen.getByRole('button', { name: 'action' })
      pointer(button, 'pointerdown', 100)
      pointer(button, 'pointermove', 130)
      expect(contentOf('row').style.transform).toBe('translateX(22px)')
      pointer(button, 'pointerup', 130)
      fireEvent.click(button)
      expect(onClick).not.toHaveBeenCalled()
    })

    it('dismisses a slow drag past the 56px positional threshold (startToEnd)', () => {
      const onDismiss = vi.fn()
      render(
        <SwipeToDismiss onDismiss={onDismiss}>
          <span>row</span>
        </SwipeToDismiss>,
      )
      swipe(contentOf('row'), 0, 80) // 80px over 800ms ≈ 90px/s (< 125)
      expect(onDismiss).toHaveBeenCalledWith('startToEnd')
    })

    it('settles a slow drag below the threshold', () => {
      const onDismiss = vi.fn()
      render(
        <SwipeToDismiss onDismiss={onDismiss}>
          <span>row</span>
        </SwipeToDismiss>,
      )
      swipe(contentOf('row'), 0, 40, { ms: 800 })
      expect(onDismiss).not.toHaveBeenCalled()
      expect(contentOf('row').style.transform).toBe('translateX(0px)')
    })

    it('dismisses a short fast fling (≥125px/s)', () => {
      const onDismiss = vi.fn()
      render(
        <SwipeToDismiss onDismiss={onDismiss}>
          <span>row</span>
        </SwipeToDismiss>,
      )
      swipe(contentOf('row'), 100, 60, { ms: 40, steps: 4 }) // 1000px/s leftwards
      expect(onDismiss).toHaveBeenCalledWith('endToStart')
    })

    it('judges the threshold in the direction of motion (moving back settles)', () => {
      const onDismiss = vi.fn()
      render(
        <SwipeToDismiss onDismiss={onDismiss}>
          <span>row</span>
        </SwipeToDismiss>,
      )
      const el = contentOf('row')
      pointer(el, 'pointerdown', 0)
      for (let x = 20; x <= 120; x += 20) {
        advance(100)
        pointer(el, 'pointermove', x)
      }
      // Slowly back to 100 (drag offset ≈ 92px, still > 56) …
      for (let x = 115; x >= 100; x -= 5) {
        advance(100)
        pointer(el, 'pointermove', x)
      }
      pointer(el, 'pointerup', 100)
      expect(onDismiss).not.toHaveBeenCalled()
    })

    it('snaps to the nearest anchor when released still', () => {
      const onDismiss = vi.fn()
      render(
        <SwipeToDismiss onDismiss={onDismiss}>
          <span>row</span>
        </SwipeToDismiss>,
      )
      swipe(contentOf('row'), 0, 100, { restMs: 200 }) // 92px of 300 → back
      expect(onDismiss).not.toHaveBeenCalled()
      swipe(contentOf('row'), 0, 200, { restMs: 200 }) // 192px of 300 → out
      expect(onDismiss).toHaveBeenCalledWith('startToEnd')
    })

    it('respects a disabled direction', () => {
      const onDismiss = vi.fn()
      render(
        <SwipeToDismiss onDismiss={onDismiss} enableEndToStart={false}>
          <span>row</span>
        </SwipeToDismiss>,
      )
      swipe(contentOf('row'), 100, 0, { ms: 50 })
      expect(onDismiss).not.toHaveBeenCalled()
      expect(contentOf('row').style.transform).toBe('translateX(0px)')
    })

    it('mirrors directions in RTL', () => {
      document.documentElement.setAttribute('dir', 'rtl')
      const onDismiss = vi.fn()
      render(
        <div dir="rtl" style={{ direction: 'rtl' }}>
          <SwipeToDismiss onDismiss={onDismiss} enableStartToEnd={false}>
            <span>row</span>
          </SwipeToDismiss>
        </div>,
      )
      // Rightwards in RTL = end→start (allowed); leftwards = start→end (disabled).
      swipe(contentOf('row'), 100, 20, { ms: 50 })
      expect(onDismiss).not.toHaveBeenCalled()
      swipe(contentOf('row'), 0, 80)
      expect(onDismiss).toHaveBeenCalledWith('endToStart')
      expect(contentOf('row').style.transform).toBe('translateX(100%)')
    })
  })

  describe('stale presses and dismissed content (#417)', () => {
    /** A mouse pointer event with an explicit `buttons` state. */
    function mouse(el: HTMLElement, type: string, clientX: number, buttons: number) {
      const event = new MouseEvent(type, { clientX, buttons, bubbles: true })
      Object.defineProperty(event, 'pointerType', { value: 'mouse' })
      fireEvent(el, event)
    }

    it('drops a mouse press released outside the row instead of dragging on hover', () => {
      render(
        <SwipeToDismiss>
          <span>row</span>
        </SwipeToDismiss>,
      )
      const content = contentOf('row')
      mouse(content, 'pointerdown', 100, 1)
      // The button is released outside: no pointerup reaches the row.
      mouse(content, 'pointermove', 160, 0)
      expect(content.style.transform).toBe('translateX(0px)')
      expect(content).not.toHaveAttribute('data-dragging')
    })

    it('still drags while the mouse button is held', () => {
      render(
        <SwipeToDismiss>
          <span>row</span>
        </SwipeToDismiss>,
      )
      const content = contentOf('row')
      mouse(content, 'pointerdown', 100, 1)
      mouse(content, 'pointermove', 130, 1)
      expect(content.style.transform).toBe('translateX(22px)')
    })

    it('makes dismissed content inert and restores it when settled back', () => {
      const { rerender } = render(
        <SwipeToDismiss dismissed="startToEnd">
          <span>row</span>
          <button>action</button>
        </SwipeToDismiss>,
      )
      expect(contentOf('row')).toHaveAttribute('inert')
      rerender(
        <SwipeToDismiss dismissed={null}>
          <span>row</span>
          <button>action</button>
        </SwipeToDismiss>,
      )
      expect(contentOf('row')).not.toHaveAttribute('inert')
    })
  })

  describe('lifecycle', () => {
    it('fires onDismissedChange at release and onDismiss after the exit transition', () => {
      transitionMs = 300
      const onDismiss = vi.fn()
      const onDismissedChange = vi.fn()
      render(
        <SwipeToDismiss onDismiss={onDismiss} onDismissedChange={onDismissedChange}>
          <span>row</span>
        </SwipeToDismiss>,
      )
      swipe(contentOf('row'), 0, 80)
      expect(onDismissedChange).toHaveBeenCalledWith('startToEnd')
      expect(onDismiss).not.toHaveBeenCalled()
      expect(contentOf('row').style.transform).toBe('translateX(100%)')
      fireEvent.transitionEnd(contentOf('row'), { propertyName: 'transform' })
      expect(onDismiss).toHaveBeenCalledTimes(1)
      expect(onDismiss).toHaveBeenCalledWith('startToEnd')
    })

    it('falls back to a timer when no transitionend arrives', () => {
      transitionMs = 300
      const onDismiss = vi.fn()
      render(
        <SwipeToDismiss onDismiss={onDismiss}>
          <span>row</span>
        </SwipeToDismiss>,
      )
      swipe(contentOf('row'), 0, 80)
      advance(299)
      expect(onDismiss).not.toHaveBeenCalled()
      advance(100)
      expect(onDismiss).toHaveBeenCalledTimes(1)
    })

    it('disables gestures after dismissal (no second onDismiss)', () => {
      const onDismiss = vi.fn()
      render(
        <SwipeToDismiss onDismiss={onDismiss}>
          <span>row</span>
        </SwipeToDismiss>,
      )
      swipe(contentOf('row'), 0, 80)
      swipe(contentOf('row'), 80, 0, { ms: 50 })
      expect(onDismiss).toHaveBeenCalledTimes(1)
      expect(contentOf('row').style.transform).toBe('translateX(100%)')
    })

    it('dismisses programmatically and resets via the controlled `dismissed` prop', () => {
      const onDismiss = vi.fn()
      function Controlled() {
        const [dismissed, setDismissed] = useState<SwipeDismissDirection | null>(null)
        return (
          <>
            <button onClick={() => setDismissed('endToStart')}>delete</button>
            <button onClick={() => setDismissed(null)}>undo</button>
            <SwipeToDismiss dismissed={dismissed} onDismissedChange={setDismissed} onDismiss={onDismiss}>
              <span>row</span>
            </SwipeToDismiss>
          </>
        )
      }
      render(<Controlled />)
      fireEvent.click(screen.getByText('delete'))
      expect(contentOf('row').style.transform).toBe('translateX(-100%)')
      expect(onDismiss).toHaveBeenCalledWith('endToStart')
      fireEvent.click(screen.getByText('undo'))
      expect(contentOf('row').style.transform).toBe('translateX(0px)')
      // Gestures work again after the reset.
      swipe(contentOf('row'), 0, 80)
      expect(onDismiss).toHaveBeenLastCalledWith('startToEnd')
    })

    it('lets a controlled parent veto a swipe dismissal', () => {
      const onDismiss = vi.fn()
      render(
        <SwipeToDismiss dismissed={null} onDismiss={onDismiss}>
          <span>row</span>
        </SwipeToDismiss>,
      )
      swipe(contentOf('row'), 0, 80)
      expect(onDismiss).not.toHaveBeenCalled()
      expect(contentOf('row').style.transform).toBe('translateX(0px)')
    })

    it('supports an uncontrolled initial dismissed state', () => {
      render(
        <SwipeToDismiss defaultDismissed="startToEnd">
          <span>row</span>
        </SwipeToDismiss>,
      )
      expect(contentOf('row').style.transform).toBe('translateX(100%)')
      expect(contentOf('row').parentElement).toHaveAttribute('data-dismissed', 'startToEnd')
    })
  })

  describe('backgrounds and styling hooks', () => {
    it('shows the background for the current swipe direction', () => {
      render(
        <SwipeToDismiss
          background={<span>common</span>}
          startToEndBackground={<span>archive</span>}
          endToStartBackground={<span>delete</span>}
        >
          <span>row</span>
        </SwipeToDismiss>,
      )
      const el = contentOf('row')
      const root = el.parentElement as HTMLElement
      expect(screen.getByText('common')).toBeInTheDocument()
      pointer(el, 'pointerdown', 100)
      advance(100)
      pointer(el, 'pointermove', 158) // 50px
      expect(screen.getByText('archive')).toBeInTheDocument()
      expect(screen.queryByText('delete')).toBeNull()
      expect(root).toHaveAttribute('data-direction', 'startToEnd')
      expect(root).toHaveAttribute('data-target', 'settled')
      expect(root).toHaveAttribute('data-dragging')
      expect(root.style.getPropertyValue('--md-swipe-to-dismiss-progress')).toBe(String(50 / WIDTH))
      advance(100)
      pointer(el, 'pointermove', 258) // 150px = 50% → closest anchor flips
      expect(root).toHaveAttribute('data-target', 'startToEnd')
      advance(100)
      pointer(el, 'pointermove', 42) // -66px
      expect(screen.getByText('delete')).toBeInTheDocument()
      expect(root).toHaveAttribute('data-direction', 'endToStart')
      pointer(el, 'pointerup', 42)
      expect(root).toHaveAttribute('data-dismissed', 'endToStart')
      expect(root.style.getPropertyValue('--md-swipe-to-dismiss-progress')).toBe('1')
    })

    it('falls back to `background` for a direction without its own', () => {
      render(
        <SwipeToDismiss background={<span>common</span>} endToStartBackground={<span>delete</span>}>
          <span>row</span>
        </SwipeToDismiss>,
      )
      const el = contentOf('row')
      pointer(el, 'pointerdown', 100)
      pointer(el, 'pointermove', 140)
      expect(screen.getByText('common')).toBeInTheDocument()
    })
  })

  describe('inside a List', () => {
    it('renders the <li> itself and the nested ListItem as a <div>', () => {
      render(
        <List>
          <SwipeToDismiss data-testid="swipe">
            <ListItem headline="Swipe" />
          </SwipeToDismiss>
          <ListItem headline="Plain" />
        </List>,
      )
      const list = screen.getByRole('list')
      const items = screen.getAllByRole('listitem')
      expect(items).toHaveLength(2)
      expect(items[0]).toBe(screen.getByTestId('swipe'))
      expect(items[0].tagName).toBe('LI')
      expect(items[0].parentElement).toBe(list)
      expect(screen.getByText('Swipe').closest('li')).toBe(items[0])
      expect(screen.getByText('Swipe').closest('[data-lines]')?.tagName).toBe('DIV')
      expect(screen.getByText('Plain').closest('[data-lines]')?.tagName).toBe('LI')
    })

    it('keeps a clickable ListItem clickable and valid', async () => {
      vi.useRealTimers()
      const onClick = vi.fn()
      const { container } = render(
        <List>
          <SwipeToDismiss>
            <ListItem headline="Open" onClick={onClick} />
          </SwipeToDismiss>
        </List>,
      )
      fireEvent.click(screen.getByRole('button', { name: 'Open' }))
      expect(onClick).toHaveBeenCalledTimes(1)
      expect(await axe(container)).toHaveNoViolations()
    })

    it('keeps an actionable ListItem with trailing controls valid (B5)', async () => {
      vi.useRealTimers()
      const { container } = render(
        <List>
          <SwipeToDismiss>
            <ListItem
              headline="Mail"
              onClick={() => {}}
              trailing={
                <button type="button" aria-label="Archive">
                  A
                </button>
              }
            />
          </SwipeToDismiss>
        </List>,
      )
      const li = container.querySelector('ul > li')!
      expect(li.querySelector('[data-lines]')?.tagName).toBe('DIV')
      expect(screen.getByRole('button', { name: 'Mail' }).contains(
        screen.getByRole('button', { name: 'Archive' }),
      )).toBe(false)
      expect(await axe(container)).toHaveNoViolations()
    })

    it('stays a <div> outside a List', () => {
      render(
        <SwipeToDismiss data-testid="swipe">
          <span>row</span>
        </SwipeToDismiss>,
      )
      expect(screen.getByTestId('swipe').tagName).toBe('DIV')
    })
  })

  it('forwards a ref', () => {
    const ref = createRef<HTMLDivElement>()
    render(
      <SwipeToDismiss ref={ref}>
        <span>row</span>
      </SwipeToDismiss>,
    )
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('has no axe violations', async () => {
    vi.useRealTimers()
    const { container } = render(
      <List>
        <SwipeToDismiss background={<span>bg</span>}>
          <ListItem headline="row" />
        </SwipeToDismiss>
      </List>,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
