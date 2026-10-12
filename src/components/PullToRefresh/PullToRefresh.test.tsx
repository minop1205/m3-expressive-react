import { createRef, useState } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { PullToRefresh, pullDistanceFraction } from './PullToRefresh'

// jsdom PointerEvents drop clientX / clientY; MouseEvent-typed pointer events
// carry them (and no pointerType, which the component treats as a mouse).
function pointer(el: Element, type: string, clientY: number, clientX = 0) {
  fireEvent(el, new MouseEvent(type, { clientX, clientY, bubbles: true }))
}
/** Pull from y=0 down by `dy` px (raw finger distance), then release. */
function pull(el: Element, dy: number, { release = true, steps = 5 } = {}) {
  pointer(el, 'pointerdown', 0)
  for (let i = 1; i <= steps; i++) pointer(el, 'pointermove', (dy * i) / steps)
  if (release) pointer(el, 'pointerup', dy)
}
function touch(el: Element, type: string, clientY: number) {
  const t = { clientX: 0, clientY, identifier: 0, target: el }
  const list = type === 'touchend' ? [] : [t]
  fireEvent(el, new TouchEvent(type, { bubbles: true, cancelable: true, touches: list as unknown as Touch[] }))
}

const rootOf = () => screen.getByTestId('ptr')
const indicatorOf = () => rootOf().querySelector('[aria-hidden="true"] > div') as HTMLElement
const translateY = () => parseFloat(indicatorOf().style.transform.replace('translateY(', ''))

let reducedMotion = false
beforeEach(() => {
  reducedMotion = false
  vi.stubGlobal(
    'matchMedia',
    (query: string) =>
      ({
        matches: query.includes('reduce') ? reducedMotion : false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }) as unknown as MediaQueryList,
  )
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function Ptr(props: Parameters<typeof PullToRefresh>[0]) {
  return (
    <PullToRefresh data-testid="ptr" style={{ height: 300 }} {...props}>
      <p>content</p>
      <button type="button">action</button>
    </PullToRefresh>
  )
}

describe('pullDistanceFraction (Compose calculateVerticalOffset)', () => {
  it('is linear at half the finger speed up to the threshold', () => {
    expect(pullDistanceFraction(0, 80)).toBe(0)
    expect(pullDistanceFraction(80, 80)).toBe(0.5)
    expect(pullDistanceFraction(160, 80)).toBe(1)
  })

  it('applies the non-linear tension past the threshold, capped at 2', () => {
    // adjusted 120 → overshoot 0.5 → 0.5 - 0.0625
    expect(pullDistanceFraction(240, 80)).toBeCloseTo(1.4375)
    expect(pullDistanceFraction(480, 80)).toBe(2)
    expect(pullDistanceFraction(10_000, 80)).toBe(2)
  })
})

describe('PullToRefresh', () => {
  it('renders the content inside the scroll container and forwards the ref', () => {
    const ref = createRef<HTMLDivElement>()
    render(<Ptr ref={ref} />)
    expect(ref.current).toBe(rootOf())
    expect(rootOf()).toContainElement(screen.getByText('content'))
    expect(rootOf()).toHaveAttribute('data-indicator', 'loading')
    expect(rootOf()).not.toHaveAttribute('aria-busy')
  })

  describe('gesture thresholds', () => {
    it('ignores moves within the 8px touch slop (clicks still reach the content)', () => {
      const onClick = vi.fn()
      render(
        <PullToRefresh data-testid="ptr">
          <button type="button" onClick={onClick}>
            action
          </button>
        </PullToRefresh>,
      )
      const button = screen.getByText('action')
      pull(button, 6)
      expect(rootOf()).not.toHaveAttribute('data-pulling')
      fireEvent.click(button)
      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('follows the finger at half speed and reports the progress', () => {
      render(<Ptr />)
      // 8px slop + 80px → adjusted 40 → fraction 0.5
      pull(rootOf(), 88, { release: false })
      expect(rootOf()).toHaveAttribute('data-pulling')
      expect(rootOf().style.getPropertyValue('--md-pull-to-refresh-progress')).toBe('0.5')
      // fraction · 80 (max distance) − 48 (container)
      expect(translateY()).toBe(0.5 * 80 - 48)
      const progress = indicatorOf().querySelector('[role="progressbar"]')
      expect(progress).toHaveAttribute('aria-valuenow', '0.5')
    })

    it('does not refresh when released at or below the threshold', () => {
      const onRefresh = vi.fn()
      render(<Ptr onRefresh={onRefresh} />)
      pull(rootOf(), 8 + 160) // adjusted exactly 80 = threshold
      expect(onRefresh).not.toHaveBeenCalled()
      expect(rootOf()).not.toHaveAttribute('data-pulling')
      expect(translateY()).toBe(-48)
    })

    it('refreshes when released past the threshold', () => {
      const onRefresh = vi.fn()
      render(<Ptr onRefresh={onRefresh} />)
      pull(rootOf(), 8 + 170)
      expect(onRefresh).toHaveBeenCalledTimes(1)
    })

    it('honors a custom threshold', () => {
      const onRefresh = vi.fn()
      render(<Ptr onRefresh={onRefresh} threshold={40} />)
      pull(rootOf(), 8 + 90) // adjusted 45 > 40
      expect(onRefresh).toHaveBeenCalledTimes(1)
    })

    it('swallows the click that ends a real pull', () => {
      const onClick = vi.fn()
      render(
        <PullToRefresh data-testid="ptr">
          <button type="button" onClick={onClick}>
            action
          </button>
        </PullToRefresh>,
      )
      const button = screen.getByText('action')
      pull(button, 100)
      fireEvent.click(button)
      expect(onClick).not.toHaveBeenCalled()
    })

    it('does not start when the container is scrolled down', () => {
      const onRefresh = vi.fn()
      render(<Ptr onRefresh={onRefresh} />)
      rootOf().scrollTop = 20
      pull(rootOf(), 300)
      expect(onRefresh).not.toHaveBeenCalled()
      expect(rootOf()).not.toHaveAttribute('data-pulling')
    })

    it('does not start inside a nested scroller that is not at its top', () => {
      const onRefresh = vi.fn()
      render(
        <PullToRefresh data-testid="ptr" onRefresh={onRefresh}>
          <div data-testid="inner" style={{ overflow: 'auto', height: 50 }}>
            <p>inner</p>
          </div>
        </PullToRefresh>,
      )
      screen.getByTestId('inner').scrollTop = 30
      pull(screen.getByText('inner'), 300)
      expect(onRefresh).not.toHaveBeenCalled()
    })

    it('gives an upward drag back to scrolling', () => {
      render(<Ptr />)
      pointer(rootOf(), 'pointerdown', 100)
      pointer(rootOf(), 'pointermove', 80)
      pointer(rootOf(), 'pointermove', 200)
      expect(rootOf()).not.toHaveAttribute('data-pulling')
    })

    it('does not refresh on pointercancel', () => {
      const onRefresh = vi.fn()
      render(<Ptr onRefresh={onRefresh} />)
      pull(rootOf(), 300, { release: false })
      pointer(rootOf(), 'pointercancel', 300)
      expect(onRefresh).not.toHaveBeenCalled()
      expect(rootOf()).not.toHaveAttribute('data-pulling')
    })

    it('pulls with touch and prevents the native scroll while pulling', () => {
      const onRefresh = vi.fn()
      render(<Ptr onRefresh={onRefresh} />)
      const root = rootOf()
      touch(root, 'touchstart', 0)
      const move = new TouchEvent('touchmove', {
        bubbles: true,
        cancelable: true,
        touches: [{ clientX: 0, clientY: 200, identifier: 0, target: root }] as unknown as Touch[],
      })
      fireEvent(root, move)
      expect(move.defaultPrevented).toBe(true)
      expect(root).toHaveAttribute('data-pulling')
      touch(root, 'touchend', 200)
      expect(onRefresh).toHaveBeenCalledTimes(1)
    })
  })

  describe('refreshing', () => {
    it('shows the indeterminate indicator at the threshold with aria-busy and an announcement', () => {
      render(<Ptr refreshing />)
      expect(rootOf()).toHaveAttribute('aria-busy', 'true')
      expect(rootOf()).toHaveAttribute('data-refreshing')
      expect(translateY()).toBe(80 - 48)
      expect(screen.getByRole('status')).toHaveTextContent('Refreshing')
      const bars = indicatorOf().querySelectorAll('[role="progressbar"]')
      expect([...bars].some((bar) => !bar.hasAttribute('aria-valuenow'))).toBe(true)
    })

    it('keeps the live region outside the busy container', () => {
      render(<Ptr refreshing refreshingLabel="Loading new mail" />)
      const status = screen.getByRole('status')
      expect(status).toHaveTextContent('Loading new mail')
      expect(rootOf()).not.toContainElement(status)
    })

    it('ignores pulls while refreshing', () => {
      const onRefresh = vi.fn()
      render(<Ptr refreshing onRefresh={onRefresh} />)
      pull(rootOf(), 300)
      expect(onRefresh).not.toHaveBeenCalled()
      expect(rootOf()).not.toHaveAttribute('data-pulling')
    })

    it('controlled: follows the refreshing prop', () => {
      function Controlled() {
        const [refreshing, setRefreshing] = useState(false)
        return (
          <>
            <Ptr refreshing={refreshing} onRefresh={() => setRefreshing(true)} />
            <button type="button" onClick={() => setRefreshing(false)}>
              done
            </button>
          </>
        )
      }
      render(<Controlled />)
      expect(screen.getByRole('status')).toHaveTextContent('')
      pull(rootOf(), 300)
      expect(rootOf()).toHaveAttribute('aria-busy', 'true')
      fireEvent.click(screen.getByText('done'))
      expect(rootOf()).not.toHaveAttribute('aria-busy')
      expect(translateY()).toBe(-48)
    })

    it('uncontrolled: spins until the promise returned by onRefresh settles', async () => {
      let resolve!: () => void
      const onRefresh = vi.fn(() => new Promise<void>((r) => (resolve = r)))
      render(<Ptr onRefresh={onRefresh} />)
      pull(rootOf(), 300)
      expect(rootOf()).toHaveAttribute('aria-busy', 'true')
      await act(async () => resolve())
      expect(rootOf()).not.toHaveAttribute('aria-busy')
    })

    it('uncontrolled: a rejected promise also ends the refresh', async () => {
      let reject!: (e: Error) => void
      render(<Ptr onRefresh={() => new Promise<void>((_, r) => (reject = r))} />)
      pull(rootOf(), 300)
      await act(async () => reject(new Error('offline')))
      expect(rootOf()).not.toHaveAttribute('aria-busy')
    })
  })

  describe('disabled', () => {
    it('does not pull or refresh', () => {
      const onRefresh = vi.fn()
      render(<Ptr disabled onRefresh={onRefresh} />)
      expect(rootOf()).toHaveAttribute('data-disabled')
      pull(rootOf(), 300)
      expect(onRefresh).not.toHaveBeenCalled()
      expect(rootOf()).not.toHaveAttribute('data-pulling')
    })

    it('still shows a refresh in progress', () => {
      render(<Ptr disabled refreshing />)
      expect(rootOf()).toHaveAttribute('aria-busy', 'true')
    })
  })

  describe('reduced motion', () => {
    it('keeps the indicator at its resting position and fades it with the pull', () => {
      reducedMotion = true
      const onRefresh = vi.fn()
      render(<Ptr onRefresh={onRefresh} />)
      expect(indicatorOf().style.opacity).toBe('0')
      pull(rootOf(), 88, { release: false })
      expect(translateY()).toBe(80 - 48)
      expect(indicatorOf().style.opacity).toBe('0.5')
      pointer(rootOf(), 'pointermove', 400)
      expect(translateY()).toBe(80 - 48)
      expect(indicatorOf().style.opacity).toBe('1')
      pointer(rootOf(), 'pointerup', 400)
      expect(onRefresh).toHaveBeenCalledTimes(1)
      expect(indicatorOf().style.opacity).toBe('0')
    })

    it('shows the refreshing indicator in place, fully opaque', () => {
      reducedMotion = true
      render(<Ptr refreshing />)
      expect(translateY()).toBe(80 - 48)
      expect(indicatorOf().style.opacity).toBe('1')
    })
  })

  describe('circular indicator', () => {
    it('uses the 40dp container', () => {
      render(<Ptr indicator="circular" refreshing />)
      expect(rootOf()).toHaveAttribute('data-indicator', 'circular')
      expect(translateY()).toBe(80 - 40)
    })

    it('dims the arrow below the threshold', () => {
      render(<Ptr indicator="circular" />)
      pull(rootOf(), 100, { release: false })
      expect(indicatorOf().querySelector('svg')).toHaveAttribute('data-dim', 'true')
      pointer(rootOf(), 'pointermove', 300)
      expect(indicatorOf().querySelector('svg')).not.toHaveAttribute('data-dim')
    })
  })

  describe('a11y', () => {
    it('has no axe violations at rest', async () => {
      const { container } = render(<Ptr />)
      expect(await axe(container)).toHaveNoViolations()
    })

    it('has no axe violations while refreshing (circular)', async () => {
      const { container } = render(<Ptr refreshing indicator="circular" />)
      expect(await axe(container)).toHaveNoViolations()
    })
  })
})
