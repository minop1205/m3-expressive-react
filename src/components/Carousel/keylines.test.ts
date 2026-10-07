import { describe, expect, it } from 'vitest'
import {
  createStrategy,
  getKeylineListForScrollOffset,
  heroKeylineList,
  itemBox,
  itemTrack,
  itemTransforms,
  itemTransformsAt,
  maxScrollOffset,
  multiBrowseKeylineList,
  revealScrollOffset,
  snapScrollOffset,
  type KeylineList,
  type Strategy,
} from './keylines'

const nonAnchor = (k: KeylineList) => k.filter((x) => !x.isAnchor).map((x) => +x.size.toFixed(2))

function strategy(keylines: KeylineList, available: number, spacing = 8): Strategy {
  const s = createStrategy(keylines, available, spacing, 0, 0)
  if (!s) throw new Error('invalid strategy')
  return s
}

/** Visible boxes (viewport coords) of every item at a scroll offset. */
function boxes(s: Strategy, count: number, offset: number) {
  const keylines = getKeylineListForScrollOffset(s, offset, maxScrollOffset(s, count))
  return Array.from({ length: count }, (_, i) => {
    const b = itemBox(s, keylines, i, offset)
    const start = i * (s.itemMainAxisSize + s.itemSpacing) - offset + b.start
    return { start, size: b.size, contentStart: b.contentStart }
  })
}

describe('multiBrowseKeylineList (Compose Keylines.kt)', () => {
  it('fits large items exactly when they fill the space with one small item', () => {
    // 588 = 2 × 260 + 52 + 2 × 8 → cost 0, no medium item.
    expect(nonAnchor(multiBrowseKeylineList(588, 260, 8, 7))).toEqual([260, 260, 52])
  })

  it('arranges large + medium + small with small clamped to 40–56dp', () => {
    const sizes = nonAnchor(multiBrowseKeylineList(328, 200, 8, 7))
    expect(sizes).toHaveLength(3)
    const [large, medium, small] = sizes
    expect(small).toBeGreaterThanOrEqual(40)
    expect(small).toBeLessThanOrEqual(56)
    expect(large).toBeGreaterThan(medium)
    expect(medium).toBeGreaterThan(small)
    // Fills the available width exactly (sizes + spacing).
    expect(large + medium + small + 2 * 8).toBeCloseTo(328, 1)
  })

  it('drops small / medium keylines beyond the item count', () => {
    expect(nonAnchor(multiBrowseKeylineList(588, 260, 8, 2))).toEqual([290, 290])
    // A single item still gets a focal keyline.
    expect(multiBrowseKeylineList(588, 260, 8, 1).some((k) => k.isFocal)).toBe(true)
  })

  it('returns no keylines for an unmeasured container', () => {
    expect(multiBrowseKeylineList(0, 260, 8, 7)).toEqual([])
  })
})

describe('heroKeylineList (centered hero)', () => {
  it('centers one large item between two small items by default', () => {
    const k = heroKeylineList(588, undefined, 8, 7, true)
    expect(nonAnchor(k)).toEqual([40, 492, 40])
    const large = k.find((x) => x.isFocal)!
    expect(large.offset).toBeCloseTo(588 / 2)
  })

  it('stays start-aligned with fewer than three items', () => {
    const k = heroKeylineList(588, undefined, 8, 2, true)
    const large = k.find((x) => x.isFocal)!
    expect(large.offset - large.size / 2).toBeCloseTo(0)
  })
})

describe('Strategy + item masks', () => {
  const W = 588
  const count = 7
  const s = strategy(multiBrowseKeylineList(W, 260, 8, count), W)

  it('lays every item out at the large size and masks it (never wider than large)', () => {
    for (const offset of [0, 37, 120, 268, 500, 900, maxScrollOffset(s, count)]) {
      for (const b of boxes(s, count, offset)) {
        expect(b.size).toBeGreaterThanOrEqual(0)
        expect(b.size).toBeLessThanOrEqual(s.itemMainAxisSize + 1e-6)
        expect(b.start).toBeGreaterThanOrEqual(-1e-6)
        expect(b.start + b.size).toBeLessThanOrEqual(W + 1e-6)
        // The content keeps the large size and is only offset (not scaled).
        expect(b.contentStart).toBeLessThanOrEqual(1e-6)
      }
    }
  })

  it('rests at L | 8 | L | 8 | S at the start and mirrors it at the end', () => {
    const start = boxes(s, count, 0)
    expect(start.slice(0, 3).map((b) => Math.round(b.size))).toEqual([260, 260, 52])
    expect(start.slice(0, 3).map((b) => Math.round(b.start))).toEqual([0, 268, 536])
    expect(start[3].size).toBe(0)

    const end = boxes(s, count, maxScrollOffset(s, count))
    expect(end.slice(4).map((b) => Math.round(b.size))).toEqual([52, 260, 260])
    expect(Math.round(end[6].start + end[6].size)).toBe(W)
  })

  it('snaps one item at a time, each snap bringing a new focal item to the start', () => {
    const snaps = Array.from({ length: count }, (_, i) => snapScrollOffset(s, i, count))
    for (let i = 1; i < snaps.length; i++) expect(snaps[i]).toBeGreaterThanOrEqual(snaps[i - 1])
    const b = boxes(s, count, snaps[2])
    expect(Math.round(b[2].start)).toBe(0)
    expect(Math.round(b[2].size)).toBe(260)
    expect(snaps[count - 1]).toBe(maxScrollOffset(s, count))
  })

  it('shrinks items continuously (interpolated keylines) while scrolling', () => {
    const b = boxes(s, count, 134)
    expect(b[0].size).toBeGreaterThan(0)
    expect(b[0].size).toBeLessThan(260)
    expect(b[2].size).toBeGreaterThan(52)
    expect(b[2].size).toBeLessThan(260)
  })

  it('reveals a partially visible item by scrolling to the nearest snap that shows it', () => {
    expect(revealScrollOffset(s, 0, count, 0)).toBeNull()
    const target = revealScrollOffset(s, 2, count, 0)!
    expect(target).toBe(snapScrollOffset(s, 1, count))
    const b = boxes(s, count, target)[2]
    expect(Math.round(b.size)).toBe(260)
    // The last item from the start reveals at the end of the list.
    expect(revealScrollOffset(s, 6, count, 0)).toBe(maxScrollOffset(s, count))
  })

  it('centers the hero item between two small items after the first item', () => {
    const h = strategy(heroKeylineList(W, undefined, 8, count, true), W)
    const b = boxes(h, count, snapScrollOffset(h, 3, count))
    expect(b.slice(2, 5).map((x) => Math.round(x.size))).toEqual([40, 492, 40])
    expect(b[3].start + b[3].size / 2).toBeCloseTo(W / 2, 0)
  })
})

describe('itemTrack (scroll-driven mask keyframes, #375)', () => {
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t
  const valueAt = (track: ReturnType<typeof itemTrack>, o: number) => {
    const { offsets, values } = track
    let k = 1
    while (k < offsets.length - 1 && offsets[k] < o) k++
    const t = (o - offsets[k - 1]) / (offsets[k] - offsets[k - 1] || 1)
    return {
      end: lerp(values[k - 1].end, values[k].end, t),
      start: lerp(values[k - 1].start, values[k].start, t),
      content: lerp(values[k - 1].content, values[k].content, t),
    }
  }

  const cases: [string, KeylineList, number][] = [
    ['multi-browse', multiBrowseKeylineList(588, 260, 8, 7), 588],
    ['multi-browse (narrow)', multiBrowseKeylineList(328, 200, 8, 7), 328],
    ['hero', heroKeylineList(588, undefined, 8, 7, true), 588],
  ]
  for (const [name, keylines, width] of cases) {
    it(`reproduces the keyline model within 0.15px between its keyframes (${name})`, () => {
      const s = strategy(keylines, width)
      const range = maxScrollOffset(s, 7)
      for (let i = 0; i < 7; i++) {
        const track = itemTrack(s, i, 7, range)
        expect(track.offsets[0]).toBe(0)
        expect(track.offsets[track.offsets.length - 1]).toBeCloseTo(range)
        // Thinned: far fewer keyframes than pixels of scroll range.
        expect(track.offsets.length).toBeLessThan(range / 8)
        for (let o = 0; o <= range; o += 1.7) {
          const exact = itemTransformsAt(s, i, 7, o)
          const approx = valueAt(track, o)
          for (const c of ['end', 'start', 'content'] as const) {
            expect(Math.abs(approx[c] - exact[c])).toBeLessThan(0.15)
          }
        }
      }
    })
  }

  it('is the identity for an unmasked item and slides a masked-away item past its clip', () => {
    const s = strategy(multiBrowseKeylineList(588, 260, 8, 7), 588)
    const L = s.itemMainAxisSize
    expect(itemTransforms(s, { start: 0, size: L, contentStart: 0, isFullyShown: true })).toEqual({
      end: 0,
      start: 0,
      content: 0,
    })
    // Masked away at the end edge: the start clip begins 2px after the end clip ends.
    const hidden = itemTransforms(s, { start: 588, size: 0, contentStart: 0, isFullyShown: false })
    expect(hidden.start).toBeCloseTo(L + 2)
  })
})
