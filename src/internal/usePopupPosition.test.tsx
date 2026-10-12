import { useRef } from 'react'
import { render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  computePopupPosition,
  resolvePopupSide,
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

  it('does nothing while closed', () => {
    const { getByTestId } = setup({ open: false, side: 'bottom' })
    expect(getByTestId('popup').style.top).toBe('')
  })
})
