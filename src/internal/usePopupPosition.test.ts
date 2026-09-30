import { describe, expect, it } from 'vitest'
import { computePopupPosition, resolvePopupSide } from './usePopupPosition'

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
})
