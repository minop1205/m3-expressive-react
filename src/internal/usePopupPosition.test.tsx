import { useRef } from 'react'
import { render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  computePopupPosition,
  resolvePopupSide,
  RESIZE_HIDE_DELAY_MS,
  usePopupPosition,
  type UsePopupPositionOptions,
} from './usePopupPosition'

const viewport = { width: 800, height: 600 }

function anchorAt(left: number, top: number, width = 40, height = 40) {
  return { left, top, width, height, right: left + width, bottom: top + height }
}

describe('resolvePopupSide', () => {
  it('keeps the preferred side when it fits', () => {
    expect(resolvePopupSide(anchorAt(0, 300), 100, 600, 'top')).toBe('top')
    expect(resolvePopupSide(anchorAt(0, 300), 100, 600, 'bottom')).toBe('bottom')
  })

  it('flips when the preferred side is too small and the other side is roomier', () => {
    expect(resolvePopupSide(anchorAt(0, 20), 100, 600, 'top')).toBe('bottom')
    expect(resolvePopupSide(anchorAt(0, 540), 100, 600, 'bottom')).toBe('top')
  })

  it('stays put when neither side fits but the preferred one is roomier', () => {
    expect(resolvePopupSide(anchorAt(0, 350), 500, 600, 'top')).toBe('top')
  })

  it('accounts for the gap and the edge margin', () => {
    // 60px above: fits 50 + 4 gap, but not with an 8px margin.
    expect(resolvePopupSide(anchorAt(0, 60), 50, 600, 'top', 4, 0)).toBe('top')
    expect(resolvePopupSide(anchorAt(0, 60), 50, 600, 'top', 4, 8)).toBe('bottom')
  })
})

describe('computePopupPosition', () => {
  it('centers the popup above the anchor with the gap', () => {
    const pos = computePopupPosition(anchorAt(380, 300), { width: 120, height: 24 }, viewport, {
      side: 'top',
      gap: 4,
    })
    expect(pos).toEqual({ side: 'top', top: 300 - 4 - 24, left: 380 + 20 - 60 })
  })

  it('flips below and clamps horizontally at the viewport edge', () => {
    const pos = computePopupPosition(anchorAt(0, 4), { width: 120, height: 24 }, viewport, {
      side: 'top',
      gap: 4,
      margin: 8,
    })
    expect(pos).toEqual({ side: 'bottom', top: 48, left: 8 })
  })

  it('clamps at the right edge', () => {
    const pos = computePopupPosition(anchorAt(780, 300, 20), { width: 200, height: 24 }, viewport, {
      side: 'bottom',
      margin: 8,
    })
    expect(pos.left).toBe(800 - 200 - 8)
  })

  it('clamps vertically when the popup fits on neither side', () => {
    const pos = computePopupPosition(anchorAt(100, 280), { width: 100, height: 400 }, viewport, {
      side: 'bottom',
      margin: 8,
    })
    expect(pos.top).toBe(600 - 400 - 8)
  })

  it('aligns start / end, mirrored in RTL', () => {
    const anchor = anchorAt(300, 300, 100)
    const popup = { width: 150, height: 50 }
    expect(computePopupPosition(anchor, popup, viewport, { side: 'bottom', align: 'start' }).left).toBe(300)
    expect(computePopupPosition(anchor, popup, viewport, { side: 'bottom', align: 'end' }).left).toBe(250)
    expect(
      computePopupPosition(anchor, popup, viewport, { side: 'bottom', align: 'start', rtl: true }).left,
    ).toBe(250)
  })

  it('pins the popup to the anchor without flip or clamp when avoidCollisions is false', () => {
    // A tall popup below an anchor near the bottom-right corner stays below
    // and start-aligned, even though it overflows the viewport.
    const pos = computePopupPosition(anchorAt(700, 500, 90), { width: 200, height: 240 }, viewport, {
      side: 'bottom',
      align: 'start',
      gap: 2,
      margin: 8,
      avoidCollisions: false,
    })
    expect(pos).toEqual({ side: 'bottom', top: 542, left: 700 })
  })
})

describe('side placements and four-corner alignment (B38)', () => {
  const popup = { width: 120, height: 40 }

  it('places left / right beside the anchor, vertically centered', () => {
    const anchor = anchorAt(300, 300)
    expect(computePopupPosition(anchor, popup, viewport, { side: 'left', gap: 4 })).toEqual({
      side: 'left',
      top: 300,
      left: 300 - 4 - 120,
    })
    expect(computePopupPosition(anchor, popup, viewport, { side: 'right', gap: 4 })).toEqual({
      side: 'right',
      top: 300,
      left: 344,
    })
  })

  it('maps start / end to left / right, mirrored in RTL', () => {
    const anchor = anchorAt(300, 300)
    expect(computePopupPosition(anchor, popup, viewport, { side: 'start' }).side).toBe('left')
    expect(computePopupPosition(anchor, popup, viewport, { side: 'end' }).side).toBe('right')
    expect(computePopupPosition(anchor, popup, viewport, { side: 'start', rtl: true }).side).toBe(
      'right',
    )
    expect(computePopupPosition(anchor, popup, viewport, { side: 'end', rtl: true }).side).toBe(
      'left',
    )
  })

  it('flips left / right when the preferred side is too small and clamps vertically', () => {
    expect(
      computePopupPosition(anchorAt(20, 300), popup, viewport, { side: 'left', margin: 8 }).side,
    ).toBe('right')
    expect(
      computePopupPosition(anchorAt(740, 300), popup, viewport, { side: 'right', margin: 8 }).side,
    ).toBe('left')
    expect(
      computePopupPosition(anchorAt(300, 0, 40, 20), popup, viewport, { side: 'right', margin: 8 })
        .top,
    ).toBe(8)
  })

  it('flips a start / end alignment with flipAlign, else keeps it and clamps', () => {
    const nearRight = anchorAt(740, 300)
    const options = { side: 'bottom', align: 'start', margin: 8 } as const
    expect(computePopupPosition(nearRight, popup, viewport, options).left).toBe(800 - 120 - 8)
    expect(
      computePopupPosition(nearRight, popup, viewport, { ...options, flipAlign: true }).left,
    ).toBe(780 - 120)
    // End-aligned near the left edge flips to start-aligned.
    expect(
      computePopupPosition(anchorAt(20, 300), popup, viewport, {
        ...options,
        align: 'end',
        flipAlign: true,
      }).left,
    ).toBe(20)
  })

  it('centers when neither alignment fits', () => {
    const wide = { width: 500, height: 40 }
    expect(
      computePopupPosition(anchorAt(380, 300), wide, viewport, {
        side: 'bottom',
        align: 'start',
        flipAlign: true,
      }).left,
    ).toBe(400 - 250)
  })
})

describe('computePopupPosition (edge-aligned inline sides, #436)', () => {
  const popup = { width: 150, height: 120 }

  it('places the popup after the anchor, top edges aligned', () => {
    const pos = computePopupPosition(anchorAt(100, 200, 200, 48), popup, viewport, {
      side: 'end',
      inlineAlign: 'start',
      gap: 0,
      margin: 8,
    })
    expect(pos).toEqual({ side: 'right', top: 200, left: 300 })
  })

  it('mirrors end to the left in RTL', () => {
    const pos = computePopupPosition(anchorAt(400, 200, 200, 48), popup, viewport, {
      side: 'end',
      inlineAlign: 'start',
      gap: 2,
      rtl: true,
    })
    expect(pos).toEqual({ side: 'left', top: 200, left: 400 - 2 - 150 })
  })

  it('flips to the other side when it does not fit and clamps vertically', () => {
    // 100px right of the anchor < 150 → left of it; clamped above the bottom edge.
    const pos = computePopupPosition(anchorAt(500, 560, 200, 40), popup, viewport, {
      side: 'end',
      inlineAlign: 'start',
      gap: 0,
      margin: 8,
    })
    expect(pos).toEqual({ side: 'left', top: 600 - 120 - 8, left: 350 })
  })
})

describe('usePopupPosition', () => {
  type HarnessProps = Omit<UsePopupPositionOptions, 'anchorRef' | 'popupRef'>

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function Harness(props: HarnessProps) {
    const anchorRef = useRef<HTMLButtonElement>(null)
    const popupRef = useRef<HTMLDivElement>(null)
    const side = usePopupPosition({ ...props, anchorRef, popupRef })
    return (
      <>
        <button ref={anchorRef}>anchor</button>
        <div ref={popupRef} data-testid="popup" data-side={side} />
      </>
    )
  }

  function setup(props: HarnessProps, anchor = anchorAt(100, 500, 200, 40)) {
    vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(800)
    vi.spyOn(document.documentElement, 'clientHeight', 'get').mockReturnValue(600)
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(150)
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(120)
    vi.spyOn(HTMLButtonElement.prototype, 'getBoundingClientRect').mockReturnValue(
      anchor as DOMRect,
    )
    return render(<Harness {...props} />)
  }

  it('writes the flipped, clamped position and the room on the side used', () => {
    const { getByTestId } = setup({ open: true, side: 'bottom', align: 'start', gap: 4, margin: 8 })
    const popup = getByTestId('popup')
    // 56px below the anchor can't fit 120 + 4 → flipped above.
    expect(popup.dataset.side).toBe('top')
    expect(popup.style.top).toBe(`${500 - 4 - 120}px`)
    expect(popup.style.left).toBe('100px')
    expect(popup.style.getPropertyValue('--_popup-available-height')).toBe(`${500 - 4 - 8}px`)
  })

  it('pins to the anchor and matches its width without collision handling', () => {
    const { getByTestId } = setup({
      open: true,
      side: 'bottom',
      align: 'start',
      gap: 2,
      avoidCollisions: false,
      matchAnchorWidth: true,
    })
    const popup = getByTestId('popup')
    expect(popup.dataset.side).toBe('bottom')
    expect(popup.style.top).toBe('542px')
    expect(popup.style.width).toBe('200px')
    expect(popup.style.getPropertyValue('--_popup-available-height')).toBe('58px')
  })

  it('hides the popup while its anchor is fully outside the viewport (#430)', () => {
    // Anchor scrolled 300px above the viewport: clamping alone would leave the
    // popup floating at the top edge with no visible trigger.
    const { getByTestId } = setup({ open: true, side: 'bottom', margin: 8 }, anchorAt(100, -300, 200, 40))
    const popup = getByTestId('popup')
    expect(popup.style.visibility).toBe('hidden')
  })

  it('keeps the popup visible while the anchor is (partly) in the viewport (#430)', () => {
    const { getByTestId } = setup({ open: true, side: 'bottom', margin: 8 }, anchorAt(100, -20, 200, 40))
    expect(getByTestId('popup').style.visibility).toBe('')
  })

  it('keeps a focused popup focusable while its anchor is outside the viewport', () => {
    // visibility: hidden would make the browser blur the focused element and
    // trip close-on-focus-out (DatePickerField / SearchBar / Tooltip).
    function FocusHarness() {
      const anchorRef = useRef<HTMLButtonElement>(null)
      const popupRef = useRef<HTMLDivElement>(null)
      usePopupPosition({ open: true, side: 'bottom', anchorRef, popupRef })
      return (
        <>
          <button ref={anchorRef}>anchor</button>
          <div ref={popupRef} data-testid="popup">
            <button>inside</button>
          </div>
        </>
      )
    }
    let anchor = anchorAt(100, 100, 200, 40)
    vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(800)
    vi.spyOn(document.documentElement, 'clientHeight', 'get').mockReturnValue(600)
    vi.spyOn(HTMLButtonElement.prototype, 'getBoundingClientRect').mockImplementation(
      () => anchor as DOMRect,
    )
    const { getByTestId, getByText } = render(<FocusHarness />)
    const popup = getByTestId('popup')
    getByText('inside').focus()

    anchor = anchorAt(100, -300, 200, 40)
    window.dispatchEvent(new Event('scroll'))
    expect(popup.style.visibility).toBe('')
    expect(popup.style.opacity).toBe('0')
    expect(popup.style.pointerEvents).toBe('none')
    expect(document.activeElement).toBe(getByText('inside'))

    anchor = anchorAt(100, 100, 200, 40)
    window.dispatchEvent(new Event('scroll'))
    expect(popup.style.opacity).toBe('')
    expect(popup.style.pointerEvents).toBe('')

    // Without focus inside, it leaves the accessibility tree as before.
    getByText('inside').blur()
    anchor = anchorAt(100, -300, 200, 40)
    window.dispatchEvent(new Event('scroll'))
    expect(popup.style.visibility).toBe('hidden')
    expect(popup.style.opacity).toBe('')
  })

  describe('transient viewport resizes', () => {
    afterEach(() => {
      vi.useRealTimers()
    })

    function setupResizable(focusInside: boolean) {
      vi.useFakeTimers()
      function ResizeHarness() {
        const anchorRef = useRef<HTMLButtonElement>(null)
        const popupRef = useRef<HTMLDivElement>(null)
        usePopupPosition({ open: true, side: 'bottom', margin: 8, anchorRef, popupRef })
        return (
          <>
            <button ref={anchorRef}>anchor</button>
            <div ref={popupRef} data-testid="popup">
              <button>inside</button>
            </div>
          </>
        )
      }
      const viewport = { width: 1200, height: 800 }
      let anchor = anchorAt(550, 40, 100, 40)
      vi.spyOn(document.documentElement, 'clientWidth', 'get').mockImplementation(
        () => viewport.width,
      )
      vi.spyOn(document.documentElement, 'clientHeight', 'get').mockImplementation(
        () => viewport.height,
      )
      vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(112)
      vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(260)
      vi.spyOn(HTMLButtonElement.prototype, 'getBoundingClientRect').mockImplementation(
        () => anchor as DOMRect,
      )
      const utils = render(<ResizeHarness />)
      if (focusInside) utils.getByText('inside').focus()
      const resize = (width: number, height: number) => {
        viewport.width = width
        viewport.height = height
        window.dispatchEvent(new Event('resize'))
      }
      const moveAnchor = (top: number) => {
        anchor = anchorAt(550, top, 100, 40)
      }
      return { ...utils, popup: utils.getByTestId('popup'), resize, moveAnchor }
    }

    const snapshot = (popup: HTMLElement) => popup.getAttribute('style')

    it.each([
      ['with focus inside', true],
      ['without focus inside', false],
    ])(
      'leaves the popup untouched through a 1×1 viewport blip (full-page screenshot) %s',
      (_, focusInside) => {
        const { popup, resize } = setupResizable(focusInside)
        const before = snapshot(popup)
        expect(popup.style.top).toBe('84px')

        // Chrome's full-page capture: 1×1, then the full page, then back.
        resize(1, 1)
        expect(snapshot(popup)).toBe(before)
        resize(1200, 880)
        resize(1200, 800)
        vi.advanceTimersByTime(1000)
        // Never hidden, faded or re-clamped: no style write at all, so no
        // opacity transition restarts under the capture.
        expect(snapshot(popup)).toBe(before)
        expect(popup.style.opacity).toBe('')
        expect(popup.style.visibility).toBe('')
      },
    )

    it('hides the popup once a resize keeps the anchor out of view', () => {
      const { popup, resize } = setupResizable(false)
      resize(1200, 30)
      expect(popup.style.visibility).toBe('')
      vi.advanceTimersByTime(RESIZE_HIDE_DELAY_MS - 1)
      expect(popup.style.visibility).toBe('')
      vi.advanceTimersByTime(1)
      expect(popup.style.visibility).toBe('hidden')

      // And it comes back as soon as the anchor is in view again.
      resize(1200, 800)
      expect(popup.style.visibility).toBe('')
    })

    it('still hides at once when a scroll moves the anchor out of view', () => {
      const { popup, moveAnchor } = setupResizable(false)
      moveAnchor(-300)
      window.dispatchEvent(new Event('scroll'))
      expect(popup.style.visibility).toBe('hidden')
    })
  })

  it('clears the hidden state when the popup closes (#430)', () => {
    const { getByTestId, rerender } = setup(
      { open: true, side: 'bottom' },
      anchorAt(100, 700, 200, 40),
    )
    const popup = getByTestId('popup')
    expect(popup.style.visibility).toBe('hidden')
    rerender(<Harness open={false} side="bottom" />)
    expect(popup.style.visibility).toBe('')
  })

  it('positions against a virtual anchor rect (context menu point)', () => {
    const point = () => ({ top: 100, bottom: 100, left: 300, right: 300, width: 0, height: 0 })
    const { getByTestId } = setup({
      open: true,
      side: 'bottom',
      align: 'start',
      gap: 0,
      margin: 8,
      getAnchorRect: point,
    })
    const popup = getByTestId('popup')
    expect(popup.dataset.side).toBe('bottom')
    expect(popup.style.top).toBe('100px')
    expect(popup.style.left).toBe('300px')
  })

  it('does nothing while closed', () => {
    const { getByTestId } = setup({ open: false, side: 'bottom' })
    expect(getByTestId('popup').style.top).toBe('')
  })
})
