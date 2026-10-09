import {
  Children,
  createContext,
  forwardRef,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type AnchorHTMLAttributes,
  type CSSProperties,
  type FocusEvent,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type Ref,
} from 'react'
import clsx from 'clsx'
import { Ripple } from '../../primitives/Ripple/Ripple'
import { INTERACTIVE_SELECTOR } from '../../internal/isFromNestedInteractive'
import {
  createStrategy,
  getKeylineListForScrollOffset,
  heroKeylineList,
  itemBox,
  itemTrack,
  itemTransforms,
  maxScrollOffset,
  multiBrowseKeylineList,
  snapPositionOffset,
  snapScrollOffset,
  revealScrollOffset,
  type ItemTransforms,
  type Strategy,
} from './keylines'
import styles from './Carousel.module.css'

export type CarouselVariant = 'multi-browse' | 'uncontained' | 'hero'

export interface CarouselProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Layout (m3.material.io / Compose `HorizontalMultiBrowseCarousel`,
   * `HorizontalUncontainedCarousel`, `HorizontalCenteredHeroCarousel`):
   * - `multi-browse` — large, medium and small (40–56dp) items, start-snapped;
   * - `uncontained` — single-size items flowing past the edge, free scrolling;
   * - `hero` — centered hero: a large item with a small item on each side,
   *   center-snapped (the first / last item align to the start / end).
   * @default 'multi-browse'
   */
  variant?: CarouselVariant
  /**
   * Preferred (large) item width in px. `multi-browse` / `hero` fit the
   * actual large size to the container (Compose `preferredItemWidth`);
   * `uncontained` uses it as-is. @default 260 (`hero`: fills the container
   * beside its small items)
   */
  itemWidth?: number
  /** Item height in px. @default 200 */
  itemHeight?: number
  /** Gap between items in px. @default 8 */
  spacing?: number
  /**
   * Accessible label of each item's position, announced with the item
   * (non-interactive items: the slide's name; `onClick` / `href` items: its
   * description). `position` is 1-based.
   * @default (position, count) => `${position} of ${count}`
   */
  getItemLabel?: (position: number, count: number) => string
  /**
   * Role description announced for the carousel container
   * (`aria-roledescription`). @default 'carousel'
   */
  roleDescriptionLabel?: string
  /**
   * Role description announced for each non-interactive item
   * (`aria-roledescription`). @default 'slide'
   */
  itemRoleDescriptionLabel?: string
  /**
   * Accessible name of the carousel. Required in practice — the container is a
   * `group` announced as "carousel".
   */
  'aria-label'?: string
  /** `CarouselItem`s. */
  children?: ReactNode
}

/** 16dp start / end padding (m3 carousel specs). */
const PAD = 16
/** Mouse drag slop (Compose `ViewConfiguration.touchSlop`, 8dp). */
const DRAG_SLOP = 8
/** Fling threshold of a snapping release (Compose `MinFlingVelocityDp`, 400dp/s). */
const MIN_FLING_VELOCITY = 400
/** Pointer samples used for the release velocity (ms). */
const VELOCITY_WINDOW = 100

const defaultGetItemLabel = (position: number, count: number) => `${position} of ${count}`

type Mode = 'keylines' | 'uniform' | 'flow'

interface CarouselContextValue {
  index: number
  count: number
  getItemLabel: (position: number, count: number) => string
  itemRoleDescriptionLabel: string
}

const ItemContext = createContext<CarouselContextValue | null>(null)

const SLOT = '[data-carousel-slot]'
const ITEM = '[data-carousel-item]'
const END_CLIP = '[data-carousel-clip="end"]'
const START_CLIP = '[data-carousel-clip="start"]'
const FRAME = '[data-carousel-frame]'
const TABBABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]'

type ScrollTimelineCtor = new (options: {
  source: Element
  axis: 'block' | 'inline' | 'x' | 'y'
}) => AnimationTimeline

/** CSS scroll-driven animations (Chromium 115+, Safari 26+); `undefined` elsewhere. */
const getScrollTimeline = (): ScrollTimelineCtor | undefined =>
  typeof window === 'undefined'
    ? undefined
    : (window as unknown as { ScrollTimeline?: ScrollTimelineCtor }).ScrollTimeline

/**
 * Projected fling distance (px) for a release velocity (px/s) — Compose
 * `rememberSplineBasedDecay` (Android `FlingCalculator`: scroll friction
 * 0.015, inflexion 0.35, deceleration rate ln 0.78 / ln 0.9) at 1px per dp.
 */
function flingDistance(velocity: number): number {
  const v = Math.abs(velocity)
  if (v < 1) return 0
  const DECELERATION_RATE = Math.log(0.78) / Math.log(0.9)
  const physicalCoeff = 9.80665 * 39.37 * 160 * 0.84
  const friction = 0.015 * physicalCoeff
  const l = Math.log((0.35 * v) / friction)
  return Math.sign(velocity) * friction * Math.exp((DECELERATION_RATE / (DECELERATION_RATE - 1)) * l)
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== 'undefined' &&
      !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const mql = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!mql) return
    const update = () => setReduced(mql.matches)
    update()
    mql.addEventListener?.('change', update)
    return () => mql.removeEventListener?.('change', update)
  }, [])
  return reduced
}

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

function setRef<T>(ref: Ref<T> | undefined, node: T | null) {
  if (typeof ref === 'function') ref(node)
  else if (ref) (ref as { current: T | null }).current = node
}

/** The mask's elements in a slot: end clip > start clip > item (see the CSS). */
interface SlotParts {
  end: HTMLElement | null
  start: HTMLElement | null
  content: HTMLElement | null
  frame: HTMLElement | null
}

const slotParts = (slot: HTMLElement): SlotParts => {
  const end = slot.querySelector<HTMLElement>(`:scope > ${END_CLIP}`)
  const start = end?.querySelector<HTMLElement>(`:scope > ${START_CLIP}`) ?? null
  return {
    end,
    start,
    content: start?.querySelector<HTMLElement>(`:scope > ${ITEM}`) ?? null,
    frame: slot.querySelector<HTMLElement>(`:scope > ${FRAME}`),
  }
}

const PART_CHANNELS = ['end', 'start', 'content'] as const

interface DragState {
  pointerId: number
  startX: number
  startScroll: number
  /** Logical scroll offset at the press (for the single-advance limit). */
  pressOffset: number
  dragging: boolean
  samples: { t: number; x: number }[]
}

/**
 * Material Design 3 (Expressive) Carousel.
 *
 * A horizontally scrolling row of 28dp-rounded items (16dp start / end and 8dp
 * block padding, 8dp between items — m3.material.io carousel specs).
 *
 * `multi-browse` and `hero` use Compose's keyline layout: every item is laid
 * out at the large size and *masked* (clipped, never scaled) to the size of
 * the keyline it passes, so items grow and shrink between large, medium and
 * small as they scroll while keeping their full height and 28dp corners.
 * Where CSS scroll-driven animations are supported the mask is a
 * compositor-run animation of the scroll position, so it moves in the same
 * frame as the scroll. Under `prefers-reduced-motion: reduce` all items keep
 * one size (m3 carousel accessibility). `uncontained` items never change size
 * and scroll freely.
 *
 * Scrolling: touch, trackpad, Shift + mouse wheel, keyboard and mouse drag
 * (drag, fling and snap like touch — a drag never activates the item it
 * started on). A plain vertical wheel keeps scrolling the page. For mouse /
 * keyboard users on vertically scrolling pages, m3 recommends a "Show all"
 * control near the carousel rather than arrow buttons.
 *
 * Give the carousel an `aria-label`. Items are announced as slides with their
 * position ("2 of 7", see `getItemLabel`). With `onClick` / `href` items, Tab
 * and Left / Right move between items and a focused item scrolls into the
 * focal (large) position; otherwise the scroll container itself is focusable.
 */
export const Carousel = forwardRef<HTMLDivElement, CarouselProps>(function Carousel(
  {
    variant = 'multi-browse',
    itemWidth,
    itemHeight = 200,
    spacing = 8,
    getItemLabel = defaultGetItemLabel,
    roleDescriptionLabel = 'carousel',
    itemRoleDescriptionLabel = 'slide',
    className,
    children,
    style,
    tabIndex,
    onScroll,
    onKeyDown,
    onFocus,
    onPointerDown,
    onPointerOver,
    onClickCapture,
    onDragStart,
    ...rest
  },
  ref,
) {
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const strategyRef = useRef<Strategy | null>(null)
  /** Compositor-driven (ScrollTimeline) mask animations, when supported. */
  const animationsRef = useRef<Animation[]>([])
  const rtlRef = useRef(false)
  const dragRef = useRef<DragState | null>(null)
  const dragCleanupRef = useRef<(() => void) | null>(null)
  const settleCleanupRef = useRef<(() => void) | null>(null)
  const suppressClickRef = useRef(false)
  /** The slot elements the last layout ran for (#416). */
  const laidOutSlotsRef = useRef<HTMLElement[]>([])
  const reducedMotion = usePrefersReducedMotion()
  const [hasFocusable, setHasFocusable] = useState(false)
  const hasFocusableRef = useRef(false)

  const mode: Mode =
    variant === 'uncontained' ? 'flow' : reducedMotion ? 'uniform' : 'keylines'
  const preferredWidth = itemWidth ?? (variant === 'hero' ? undefined : 260)

  const slots = () =>
    Array.from(scrollerRef.current?.querySelectorAll<HTMLElement>(SLOT) ?? []).filter(
      (el) => el.parentElement?.closest('[data-carousel]') === scrollerRef.current,
    )

  const cancelAnimations = () => {
    animationsRef.current.forEach((a) => a.cancel())
    animationsRef.current = []
  }

  /**
   * Masks every item for the current scroll offset (Compose `carouselItem`):
   * the transforms (unless a scroll-driven animation already runs them), the
   * corner cap of items narrower than two corners, and the decoration frame
   * (hover elevation, focus ring) of a hovered / focused item.
   */
  const applyMask = useCallback(() => {
    const scroller = scrollerRef.current
    const strategy = strategyRef.current
    if (!scroller || !strategy) return
    const els = slots()
    const count = els.length
    // RTL scrollers report 0 … -max; keylines are measured from inline-start.
    const offset = Math.abs(scroller.scrollLeft)
    const keylines = getKeylineListForScrollOffset(
      strategy,
      offset,
      maxScrollOffset(strategy, count),
    )
    // Live scroll-driven animations draw the transforms; until they are (none,
    // cancelled while dragging, or still pending after a resume) the inline
    // transforms below do.
    const animations = animationsRef.current
    const animated =
      animations.length > 0 && animations.every((a) => a.playState === 'running' && !a.pending)
    const sign = rtlRef.current ? -1 : 1
    els.forEach((slot, i) => {
      const box = itemBox(strategy, keylines, i, offset)
      const parts = slotParts(slot)
      if (!animated) {
        const t = itemTransforms(strategy, box)
        for (const part of PART_CHANNELS) {
          parts[part]?.style.setProperty('transform', `translateX(${sign * t[part]}px)`)
        }
      }
      // Corners shrink to half the visible size (a pill) once it is narrower
      // than two corners (28dp extra-large; 32px leaves headroom). Written only
      // on change, so full-size items cost nothing per frame.
      setIfChanged(slot, '--_corner-cap', box.size < 2 * 32 ? `${box.size / 2}px` : '')
      if (parts.frame && (slot.matches(':hover') || slot.matches(':focus-within'))) {
        setIfChanged(slot, '--_item-start', `${box.start}px`)
        setIfChanged(slot, '--_item-size', `${box.size}px`)
      }
    })
  }, [])

  /** Recomputes the keyline strategy for the container size and item count. */
  const applyLayout = useCallback(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    const els = slots()
    const count = els.length
    laidOutSlotsRef.current = els
    rtlRef.current = getComputedStyle(scroller).direction === 'rtl'
    cancelAnimations()
    const clearItems = () =>
      els.forEach((slot) => {
        for (const name of ['--_item-start', '--_item-size', '--_corner-cap']) {
          slot.style.removeProperty(name)
        }
        slot.style.removeProperty('scroll-margin-inline-start')
        const parts = slotParts(slot)
        for (const part of PART_CHANNELS) parts[part]?.style.removeProperty('transform')
      })
    const finish = () => {
      if (scroller.scrollWidth - scroller.clientWidth >= 1) scroller.setAttribute('data-draggable', '')
      else scroller.removeAttribute('data-draggable')
    }

    strategyRef.current = null
    // Keylines span the content box inside the 16dp start / end padding
    // (Compose: a carousel inset by the padding, which clips items to it).
    const width = scroller.clientWidth - 2 * PAD
    if (mode === 'flow' || width <= 0 || count === 0) {
      scroller.style.removeProperty('--_large-size')
      clearItems()
      finish()
      return
    }

    const keylines =
      variant === 'hero'
        ? heroKeylineList(width, preferredWidth, spacing, count, true)
        : multiBrowseKeylineList(width, preferredWidth ?? 260, spacing, count)
    const strategy = createStrategy(keylines, width, spacing, 0, 0)
    if (!strategy) {
      scroller.style.removeProperty('--_large-size')
      clearItems()
      finish()
      return
    }

    if (mode === 'uniform') {
      // Reduced motion: one size for every item, flowing to the edge (m3
      // carousel accessibility) — the large size, capped to the padded width.
      const size = Math.min(strategy.itemMainAxisSize, width)
      scroller.style.setProperty('--_large-size', `${size}px`)
      clearItems()
      finish()
      return
    }

    strategyRef.current = strategy
    scroller.style.setProperty('--_large-size', `${strategy.itemMainAxisSize}px`)
    els.forEach((slot, i) => {
      slot.style.setProperty(
        'scroll-margin-inline-start',
        `${snapPositionOffset(strategy, i, count)}px`,
      )
    })
    finish()

    // #375: drive the mask from the scroll position on the compositor — a
    // scroll-driven animation per masked element, sampled from the keyline
    // model. Transforms only: Chromium does not composite clip-path, so the
    // mask is two overflow clips moved by transforms (see Carousel.module.css).
    const ScrollTimeline = getScrollTimeline()
    const range = scroller.scrollWidth - scroller.clientWidth
    if (ScrollTimeline && range >= 1 && typeof scroller.animate === 'function') {
      try {
        const timeline = new ScrollTimeline({ source: scroller, axis: 'inline' })
        const sign = rtlRef.current ? -1 : 1
        els.forEach((slot, i) => {
          const track = itemTrack(strategy, i, count, range)
          const parts = slotParts(slot)
          for (const part of PART_CHANNELS) {
            const el = parts[part]
            if (!el) continue
            const frames = track.offsets.map((o, k) => ({
              offset: Math.min(1, o / range),
              transform: `translateX(${sign * (track.values[k] as ItemTransforms)[part]}px)`,
            }))
            animationsRef.current.push(el.animate(frames, { timeline, fill: 'both' }))
          }
        })
      } catch {
        cancelAnimations()
      }
    }
    // Static values (the fallback, and the state before the timeline is live).
    applyMask()
  }, [applyMask, mode, variant, preferredWidth, spacing])

  const childCount = Children.toArray(children).filter(isValidElement).length

  useIsoLayoutEffect(() => {
    applyLayout()
    const scroller = scrollerRef.current
    if (!scroller || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => applyLayout())
    ro.observe(scroller)
    return () => {
      ro.disconnect()
      cancelAnimations()
    }
  }, [applyLayout, childCount, itemHeight])

  useEffect(
    () => () => {
      dragCleanupRef.current?.()
      settleCleanupRef.current?.()
    },
    [],
  )

  /**
   * Re-syncs with the rendered items (#416): re-runs the layout when the set
   * of slot elements changed even though the count did not (re-keyed items
   * get no snap offset or mask otherwise, and the scroll-driven animations
   * stay on the detached nodes), and keeps the container reachable by
   * keyboard only when nothing inside it is (m3: "Avoid focusing on the
   * carousel container"; axe scrollable-region-focusable when the items are
   * not interactive).
   */
  const syncItems = useCallback(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    const els = slots()
    const prev = laidOutSlotsRef.current
    if (els.length !== prev.length || els.some((el, i) => el !== prev[i])) applyLayout()
    const next = !!scroller.querySelector(TABBABLE)
    if (next !== hasFocusableRef.current) {
      hasFocusableRef.current = next
      setHasFocusable(next)
    }
  }, [applyLayout])

  // After every render of the carousel…
  useIsoLayoutEffect(() => {
    syncItems()
  })

  // …and when an item's own content changes without re-rendering it.
  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller || typeof MutationObserver === 'undefined') return
    const mo = new MutationObserver(() => syncItems())
    mo.observe(scroller, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['tabindex', 'disabled', 'href', 'contenteditable', 'type'],
    })
    return () => mo.disconnect()
  }, [syncItems])

  const isRtl = () =>
    !!scrollerRef.current && getComputedStyle(scrollerRef.current).direction === 'rtl'

  /** Scrolls the item in `slot` into the focal (large) position if needed. */
  const revealSlot = useCallback(
    (slot: HTMLElement) => {
      const scroller = scrollerRef.current
      if (!scroller) return
      const els = slots()
      const index = els.indexOf(slot)
      if (index < 0) return
      const behavior: ScrollBehavior = reducedMotion ? 'auto' : 'smooth'
      const strategy = strategyRef.current
      if (mode === 'keylines' && strategy) {
        const count = els.length
        const left = revealScrollOffset(strategy, index, count, Math.abs(scroller.scrollLeft))
        if (left == null) return
        scroller.scrollTo?.({ left: isRtl() ? -left : left, behavior })
        return
      }
      // Uniform / uncontained: keep the whole item inside the padded area.
      const sr = scroller.getBoundingClientRect()
      const r = slot.getBoundingClientRect()
      let delta = 0
      if (r.left < sr.left + PAD) delta = r.left - (sr.left + PAD)
      else if (r.right > sr.right - PAD) delta = r.right - (sr.right - PAD)
      if (delta !== 0) scroller.scrollBy?.({ left: delta, behavior })
    },
    [mode, reducedMotion],
  )

  const handleFocus = (event: FocusEvent<HTMLDivElement>) => {
    onFocus?.(event)
    const slot = (event.target as HTMLElement).closest<HTMLElement>(SLOT)
    if (slot && scrollerRef.current?.contains(slot)) {
      applyMask()
      revealSlot(slot)
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event)
    if (event.defaultPrevented) return
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
    // Only the item itself — never keys from content nested inside an item.
    const target = event.target as HTMLElement
    if (!target.matches(ITEM)) return
    const items = slots()
      .map((slot) => slot.querySelector<HTMLElement>(ITEM))
      .filter((el): el is HTMLElement => !!el && el.matches(TABBABLE))
    const current = items.indexOf(target)
    if (current < 0) return
    const forward = (event.key === 'ArrowRight') !== isRtl()
    const next = items[current + (forward ? 1 : -1)]
    if (!next) return
    event.preventDefault()
    next.focus({ preventScroll: true })
    const slot = next.closest<HTMLElement>(SLOT)
    if (slot) revealSlot(slot)
  }

  // ------------------------------------------------------------------------
  // Mouse drag (#374): drag, fling and snap like touch. Touch / pen keep the
  // native scroller; the vertical wheel is left to the page.
  // ------------------------------------------------------------------------

  /** The snap positions (logical scroll offsets, ascending, deduplicated). */
  const snapOffsets = (): number[] => {
    const scroller = scrollerRef.current
    if (!scroller) return []
    const els = slots()
    const max = scroller.scrollWidth - scroller.clientWidth
    const strategy = strategyRef.current
    const gap = parseFloat(getComputedStyle(scroller).columnGap) || 0
    const raw = els.map((slot, i) =>
      strategy
        ? snapScrollOffset(strategy, i, els.length)
        : i * (slot.getBoundingClientRect().width + gap),
    )
    const sorted = raw.map((o) => Math.min(Math.max(o, 0), max)).sort((a, b) => a - b)
    return sorted.filter((o, i) => i === 0 || o - sorted[i - 1] >= 1)
  }

  /** Ends a settle animation: snapping back on, at the snap position. */
  const endSettle = () => {
    settleCleanupRef.current?.()
    settleCleanupRef.current = null
  }

  /** Release: fling (uncontained) or snap at most one item onwards (Compose single advance). */
  const settle = (logicalVelocity: number, pressOffset: number) => {
    const scroller = scrollerRef.current
    if (!scroller) return
    const current = Math.abs(scroller.scrollLeft)
    const max = scroller.scrollWidth - scroller.clientWidth
    let target = current
    if (mode === 'flow') {
      target = Math.min(Math.max(current + flingDistance(logicalVelocity), 0), max)
    } else {
      const offsets = snapOffsets()
      if (offsets.length === 0) return
      const nearest = (x: number) =>
        offsets.reduce((best, o, i) => (Math.abs(o - x) < Math.abs(offsets[best] - x) ? i : best), 0)
      const home = nearest(pressOffset)
      let index = nearest(current)
      if (Math.abs(logicalVelocity) >= MIN_FLING_VELOCITY) {
        const forward = logicalVelocity > 0
        const next = forward
          ? offsets.findIndex((o) => o > current + 0.5)
          : offsets.map((o, i) => (o < current - 0.5 ? i : -1)).filter((i) => i >= 0).pop() ?? -1
        if (next >= 0) index = next
      }
      index = Math.min(Math.max(index, home - 1), home + 1)
      target = offsets[index]
    }
    const left = rtlRef.current ? -target : target
    if (Math.abs(target - current) < 0.5 || reducedMotion) {
      scroller.scrollTo?.({ left, behavior: 'auto' })
      return
    }
    // Snapping stays off until the scroll lands, then resumes exactly there.
    scroller.setAttribute('data-settling', '')
    let timer = 0
    const done = () => {
      scroller.removeEventListener('scrollend', done)
      window.clearTimeout(timer)
      scroller.removeAttribute('data-settling')
      settleCleanupRef.current = null
    }
    scroller.addEventListener('scrollend', done)
    timer = window.setTimeout(done, 1500)
    settleCleanupRef.current = done
    scroller.scrollTo?.({ left, behavior: 'smooth' })
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    onPointerDown?.(event)
    const scroller = scrollerRef.current
    if (event.defaultPrevented || !scroller) return
    if (event.pointerType !== 'mouse' || event.button !== 0) return
    if (!scroller.hasAttribute('data-draggable')) return
    // Never start on content nested inside an item (inputs, buttons, links,
    // text fields): only on the item itself or plain content.
    const target = event.target as Element
    const interactive = target.closest?.(INTERACTIVE_SELECTOR)
    if (interactive && interactive !== scroller && scroller.contains(interactive) && !interactive.matches(ITEM)) {
      return
    }
    dragCleanupRef.current?.()
    if (settleCleanupRef.current) {
      // Catch a settling carousel where it is.
      endSettle()
      scroller.scrollTo?.({ left: scroller.scrollLeft, behavior: 'auto' })
    }
    const state: DragState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScroll: scroller.scrollLeft,
      pressOffset: Math.abs(scroller.scrollLeft),
      dragging: false,
      samples: [{ t: event.timeStamp, x: event.clientX }],
    }
    dragRef.current = state
    let synthetic: PointerEvent | null = null

    const move = (e: PointerEvent) => {
      if (e.pointerId !== state.pointerId) return
      // No button down: the release was missed (e.g. outside the window) —
      // drop the stale drag instead of scrolling with a free-moving mouse.
      if (e.buttons === 0) {
        end(e)
        return
      }
      if (!state.dragging) {
        if (Math.abs(e.clientX - state.startX) < DRAG_SLOP) return
        state.dragging = true
        // Continue from the slop point, without a jump.
        state.startX = e.clientX
        state.startScroll = scroller.scrollLeft
        state.samples = []
        scroller.setAttribute('data-dragging', '')
        try {
          scroller.setPointerCapture?.(e.pointerId)
        } catch {
          /* pointer already released */
        }
        window.getSelection?.()?.removeAllRanges()
        // The drag scrolls from the main thread: mask from the main thread too,
        // in the same frame (a compositor-sampled mask can lag such a scroll
        // by a frame under load). Resumed for the release animation.
        animationsRef.current.forEach((a) => a.cancel())
        applyMask()
        // A drag is not a press: release the item's ripple (Compose cancels
        // the press interaction when the pager starts dragging).
        if (typeof PointerEvent !== 'undefined') {
          synthetic = new PointerEvent('pointercancel', { pointerId: e.pointerId })
          window.dispatchEvent(synthetic)
          synthetic = null
        }
      }
      e.preventDefault()
      scroller.scrollLeft = state.startScroll - (e.clientX - state.startX)
      state.samples.push({ t: e.timeStamp, x: e.clientX })
      while (state.samples.length > 2 && e.timeStamp - state.samples[0].t > VELOCITY_WINDOW) {
        state.samples.shift()
      }
    }
    const end = (e: PointerEvent) => {
      if (e.pointerId !== state.pointerId || e === synthetic) return
      cleanup()
      if (!state.dragging) return
      scroller.removeAttribute('data-dragging')
      animationsRef.current.forEach((a) => a.play())
      // The click that follows the release must not activate an item.
      suppressClickRef.current = true
      window.setTimeout(() => {
        suppressClickRef.current = false
      }, 0)
      let velocity = 0 // px/s of the pointer
      const first = state.samples[0]
      const last = state.samples[state.samples.length - 1]
      if (e.type === 'pointerup' && first && last && last.t - first.t > 0 && e.timeStamp - last.t < 50) {
        velocity = ((last.x - first.x) / (last.t - first.t)) * 1000
      }
      // Content follows the pointer: pointer → right = towards inline-start
      // in LTR, towards inline-end in RTL.
      settle(rtlRef.current ? velocity : -velocity, state.pressOffset)
    }
    const cleanup = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
      if (dragRef.current === state) dragRef.current = null
      dragCleanupRef.current = null
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
    dragCleanupRef.current = () => {
      cleanup()
      scroller.removeAttribute('data-dragging')
      animationsRef.current.forEach((a) => a.playState === 'idle' && a.play())
    }
  }

  const handleClickCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      event.preventDefault()
      event.stopPropagation()
      return
    }
    onClickCapture?.(event)
  }

  let index = 0
  const count = childCount
  const content = Children.map(children, (child) => {
    if (!isValidElement(child)) return child
    const value = { index: index++, count, getItemLabel, itemRoleDescriptionLabel }
    return <ItemContext.Provider value={value}>{child}</ItemContext.Provider>
  })

  return (
    <div
      ref={(node) => {
        scrollerRef.current = node
        setRef(ref, node)
      }}
      {...rest}
      role="group"
      aria-roledescription={roleDescriptionLabel}
      data-carousel=""
      data-variant={variant}
      data-mode={mode}
      tabIndex={tabIndex ?? (hasFocusable ? undefined : 0)}
      onScroll={(event) => {
        onScroll?.(event)
        applyMask()
      }}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      onPointerDown={handlePointerDown}
      onPointerOver={(event) => {
        onPointerOver?.(event)
        applyMask()
      }}
      onClickCapture={handleClickCapture}
      onDragStart={(event) => {
        onDragStart?.(event)
        // Images and links inside items are natively draggable; a mouse press
        // on the carousel drags the carousel instead.
        if (dragRef.current) event.preventDefault()
      }}
      className={clsx(styles.scroller, className)}
      style={
        {
          '--_item-w': preferredWidth != null ? `${preferredWidth}px` : undefined,
          '--_item-h': `${itemHeight}px`,
          '--_spacing': `${spacing}px`,
          ...style,
        } as CSSProperties
      }
    >
      {content}
    </div>
  )
})

/** Writes an inline custom property only when its value changes ('' removes it). */
function setIfChanged(el: HTMLElement, name: string, value: string) {
  if (el.style.getPropertyValue(name) === value) return
  if (value) el.style.setProperty(name, value)
  else el.style.removeProperty(name)
}


export interface CarouselItemProps extends HTMLAttributes<HTMLElement> {
  /** Makes the item a link (`<a>`): activated with Enter, opens in new tabs. */
  href?: string
  /** Link target (with `href`). */
  target?: AnchorHTMLAttributes<HTMLAnchorElement>['target']
  /** Link relationship (with `href`). */
  rel?: string
  /** Download hint (with `href`). */
  download?: AnchorHTMLAttributes<HTMLAnchorElement>['download']
  /** Disable an interactive (`onClick` / `href`) item: dimmed, not focusable. */
  disabled?: boolean
  children?: ReactNode
}

/**
 * A single 28dp-rounded item inside a `Carousel`.
 *
 * Without `onClick` / `href` it is a non-interactive slide (`role="group"`,
 * `aria-roledescription="slide"`, named by its position). With `onClick` it
 * renders a `<button>`, with `href` an `<a>` — focusable, activated with
 * Enter / Space (links: Enter), with the hover / focus / pressed state layer,
 * ripple and focus ring; its position becomes the accessible description.
 * A mouse drag that starts on the item scrolls the carousel instead of
 * activating it.
 * Put nested interactive content only in non-interactive items.
 */
export const CarouselItem = forwardRef<HTMLElement, CarouselItemProps>(function CarouselItem(
  {
    href,
    target,
    rel,
    download,
    disabled = false,
    onClick,
    className,
    children,
    role,
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedBy,
    ...rest
  },
  ref,
) {
  const ctx = useContext(ItemContext)
  const labelId = useId()
  const positionLabel = ctx ? ctx.getItemLabel(ctx.index + 1, ctx.count) : undefined
  const isLink = href != null
  const interactive = isLink || onClick != null

  const shared = {
    ...rest,
    className: clsx(styles.item, className),
    'data-carousel-item': '',
    'data-interactive': interactive || undefined,
    'data-disabled': (interactive && disabled) || undefined,
  }
  const body = (
    <>
      <span className={styles.content}>{children}</span>
      {interactive && !disabled && <Ripple />}
    </>
  )
  const describedBy =
    clsx(ariaDescribedBy, interactive && positionLabel && labelId) || undefined

  let item: ReactNode
  if (isLink) {
    item = (
      <a
        ref={ref as Ref<HTMLAnchorElement>}
        {...shared}
        href={disabled ? undefined : href}
        target={target}
        rel={rel}
        download={download}
        role={role ?? (disabled ? 'link' : undefined)}
        aria-disabled={disabled || undefined}
        aria-label={ariaLabel}
        aria-describedby={describedBy}
        onClick={disabled ? undefined : onClick}
      >
        {body}
      </a>
    )
  } else if (interactive) {
    item = (
      <button
        ref={ref as Ref<HTMLButtonElement>}
        {...shared}
        type="button"
        role={role}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-describedby={describedBy}
        onClick={onClick}
      >
        {body}
      </button>
    )
  } else {
    item = (
      <div
        ref={ref as Ref<HTMLDivElement>}
        {...shared}
        role={role ?? 'group'}
        aria-roledescription={ctx?.itemRoleDescriptionLabel ?? 'slide'}
        aria-label={ariaLabel ?? positionLabel}
        aria-describedby={ariaDescribedBy}
      >
        {body}
      </div>
    )
  }

  return (
    <div className={styles.slot} data-carousel-slot="">
      {interactive && !disabled && (
        // Hover elevation + focus ring around the visible (masked) item: the
        // item itself is clipped, so they live on this unclipped frame.
        <span className={styles.frame} data-carousel-frame="" aria-hidden="true">
          <span className={styles.focusRing} />
        </span>
      )}
      {/* The mask: an end-edge and a start-edge clip (see Carousel.module.css). */}
      <span className={styles.clip} data-carousel-clip="end">
        <span className={styles.clip} data-carousel-clip="start">
          {item}
        </span>
      </span>
      {interactive && positionLabel && (
        <span id={labelId} hidden>
          {positionLabel}
        </span>
      )}
    </div>
  )
})
