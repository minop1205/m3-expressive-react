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
  type ReactNode,
  type Ref,
} from 'react'
import clsx from 'clsx'
import { Ripple } from '../../primitives/Ripple/Ripple'
import { FocusRing } from '../../primitives/FocusRing/FocusRing'
import {
  createStrategy,
  getKeylineListForScrollOffset,
  heroKeylineList,
  itemBox,
  maxScrollOffset,
  multiBrowseKeylineList,
  snapPositionOffset,
  revealScrollOffset,
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
const TABBABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]'

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
 * Under `prefers-reduced-motion: reduce` all items keep one size (m3
 * carousel accessibility). `uncontained` items never change size and scroll
 * freely.
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
    ...rest
  },
  ref,
) {
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const strategyRef = useRef<Strategy | null>(null)
  const reducedMotion = usePrefersReducedMotion()
  const [hasFocusable, setHasFocusable] = useState(false)

  const mode: Mode =
    variant === 'uncontained' ? 'flow' : reducedMotion ? 'uniform' : 'keylines'
  const preferredWidth = itemWidth ?? (variant === 'hero' ? undefined : 260)

  const slots = () =>
    Array.from(scrollerRef.current?.querySelectorAll<HTMLElement>(SLOT) ?? []).filter(
      (el) => el.parentElement?.closest('[data-carousel]') === scrollerRef.current,
    )

  /** Masks every item for the current scroll offset (Compose `carouselItem`). */
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
    els.forEach((slot, i) => {
      const box = itemBox(strategy, keylines, i, offset)
      slot.style.setProperty('--_item-start', `${box.start}px`)
      slot.style.setProperty('--_item-size', `${box.size}px`)
      slot.style.setProperty('--_content-start', `${box.contentStart}px`)
    })
  }, [])

  /** Recomputes the keyline strategy for the container size and item count. */
  const applyLayout = useCallback(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    const els = slots()
    const count = els.length
    const clearItems = () =>
      els.forEach((slot) => {
        slot.style.removeProperty('--_item-start')
        slot.style.removeProperty('--_item-size')
        slot.style.removeProperty('--_content-start')
        slot.style.removeProperty('scroll-margin-inline-start')
      })

    strategyRef.current = null
    // Keylines span the content box inside the 16dp start / end padding
    // (Compose: a carousel inset by the padding, which clips items to it).
    const width = scroller.clientWidth - 2 * PAD
    if (mode === 'flow' || width <= 0 || count === 0) {
      scroller.style.removeProperty('--_large-size')
      clearItems()
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
      return
    }

    if (mode === 'uniform') {
      // Reduced motion: one size for every item, flowing to the edge (m3
      // carousel accessibility) — the large size, capped to the padded width.
      const size = Math.min(strategy.itemMainAxisSize, width)
      scroller.style.setProperty('--_large-size', `${size}px`)
      clearItems()
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
    applyMask()
  }, [applyMask, mode, variant, preferredWidth, spacing])

  const childCount = Children.toArray(children).filter(isValidElement).length

  useIsoLayoutEffect(() => {
    applyLayout()
    const scroller = scrollerRef.current
    if (!scroller || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => applyLayout())
    ro.observe(scroller)
    return () => ro.disconnect()
  }, [applyLayout, childCount, itemHeight])

  // Keep the container reachable by keyboard only when nothing inside it is
  // (m3: "Avoid focusing on the carousel container"; axe
  // scrollable-region-focusable when the items are not interactive).
  useIsoLayoutEffect(() => {
    const next = !!scrollerRef.current?.querySelector(TABBABLE)
    if (next !== hasFocusable) setHasFocusable(next)
  })

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
    if (slot && scrollerRef.current?.contains(slot)) revealSlot(slot)
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
      <span className={styles.clip}>
        <span className={styles.content}>{children}</span>
      </span>
      {interactive && !disabled && <Ripple />}
      {interactive && !disabled && <FocusRing />}
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
      {item}
      {interactive && positionLabel && (
        <span id={labelId} hidden>
          {positionLabel}
        </span>
      )}
    </div>
  )
})
