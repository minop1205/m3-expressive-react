import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from 'react'
import clsx from 'clsx'
import styles from './Carousel.module.css'

export type CarouselVariant = 'multi-browse' | 'uncontained' | 'hero'

export interface CarouselProps extends HTMLAttributes<HTMLDivElement> {
  /** Layout. `multi-browse` mixes large/medium/small items, `uncontained`
   * scrolls uniform items to the edge, `hero` centres one large item with a
   * peek of the next. @default 'multi-browse' */
  variant?: CarouselVariant
  /** Preferred (large) item width in px. @default 260 (`hero`: 320) */
  itemWidth?: number
  /** Item height in px. @default 200 */
  itemHeight?: number
  /** Gap between items in px. @default 8 */
  spacing?: number
  /** `CarouselItem`s. */
  children?: ReactNode
}

const PAD = 16

/**
 * Material Design 3 (Expressive) Carousel.
 *
 * A horizontally scroll-snapping row of 28dp-rounded items (16dp side / 8dp
 * block padding, 8dp between items — per m3.material.io carousel specs). Items
 * dynamically shrink as they move out of the focus zone at either edge, giving
 * the M3 "large / medium / small" mask. `multi-browse` snaps items to the start,
 * `hero` centres a large item with a peek of the next, `uncontained` scrolls
 * uniform items to the edge.
 */
export const Carousel = forwardRef<HTMLDivElement, CarouselProps>(function Carousel(
  { variant = 'multi-browse', itemWidth, itemHeight = 200, spacing = 8, className, children, style, ...rest },
  ref,
) {
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const frame = useRef<number | null>(null)

  const largeWidth = itemWidth ?? (variant === 'hero' ? 320 : 260)

  const applyMask = useCallback(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    const sLeft = scroller.scrollLeft
    const sWidth = scroller.clientWidth
    const focusL = PAD
    const focusR = sWidth - PAD
    const items = scroller.children
    for (let i = 0; i < items.length; i++) {
      const el = items[i] as HTMLElement
      const left = el.offsetLeft - sLeft
      const w = el.offsetWidth
      if (w === 0) continue
      const visible = Math.max(0, Math.min(left + w, focusR) - Math.max(left, focusL))
      const ratio = Math.min(1, visible / w)
      const scale = 0.82 + 0.18 * ratio
      el.style.setProperty('--_mask-scale', scale.toFixed(3))
      el.style.setProperty('--_mask-opacity', (0.5 + 0.5 * ratio).toFixed(3))
    }
  }, [])

  const onScroll = useCallback(() => {
    if (frame.current != null) return
    frame.current = requestAnimationFrame(() => {
      frame.current = null
      applyMask()
    })
  }, [applyMask])

  useEffect(() => {
    applyMask()
    const scroller = scrollerRef.current
    if (!scroller || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(applyMask)
    ro.observe(scroller)
    return () => ro.disconnect()
  }, [applyMask, children, largeWidth, itemHeight, spacing, variant])

  return (
    <div
      ref={(node) => {
        scrollerRef.current = node
        if (typeof ref === 'function') ref(node)
        else if (ref) (ref as { current: HTMLDivElement | null }).current = node
      }}
      {...rest}
      role="group"
      aria-roledescription="carousel"
      data-variant={variant}
      onScroll={onScroll}
      className={clsx(styles.scroller, className)}
      style={
        {
          '--_item-w': `${largeWidth}px`,
          '--_item-h': `${itemHeight}px`,
          '--_spacing': `${spacing}px`,
          ...style,
        } as CSSProperties
      }
    >
      {children}
    </div>
  )
})

export interface CarouselItemProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode
}

/** A single 28dp-rounded item inside a `Carousel`. */
export const CarouselItem = forwardRef<HTMLDivElement, CarouselItemProps>(
  function CarouselItem({ className, children, ...rest }, ref) {
    return (
      <div ref={ref} {...rest} className={clsx(styles.item, className)}>
        {children}
      </div>
    )
  },
)
