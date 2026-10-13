'use client'

import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type PointerEvent,
} from 'react'
import clsx from 'clsx'
import { assignRefs } from '../../internal/useModal'
import { useControllableState } from '../../internal/useControllableState'
import { FocusRing } from '../../primitives/FocusRing/FocusRing'
import styles from './ScrollField.module.css'

export interface ScrollFieldProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue' | 'children'> {
  /** Smallest value. @default 0 */
  min?: number
  /** Largest value (inclusive). The wheel wraps from `max` back to `min`. */
  max: number
  /** Controlled value (an integer from `min` to `max`). */
  value?: number
  /** Uncontrolled initial value. @default min */
  defaultValue?: number
  /**
   * Fires with the new value as the wheel moves (keyboard, wheel, drag,
   * tap). The event is the native event behind the change.
   */
  onChange?: (event: Event, value: number) => void
  /** Values moved by PageUp / PageDown. @default 5 */
  pageStep?: number
  /** Disabled: dimmed colors, no interaction, out of the Tab order. */
  disabled?: boolean
  /**
   * Text drawn for a value.
   * @default (value) => two-digit zero-padded (`7` → `"07"`)
   */
  formatValue?: (value: number) => string
  /**
   * `aria-valuetext` for a value — include the unit (e.g. `"7 o'clock"`).
   * @default formatValue's result
   */
  getValueText?: (value: number) => string
}

// Compose ScrollField: PageSize.Fixed(ScrollFieldHeight / 3) — every item is
// a third of the default 200dp height, whatever height the field is given.
const ITEM_SIZE = 200 / 3
// Items rendered either side of the centre (covers 200dp plus a drag offset).
const WINDOW = 3
// Pointer travel before a press becomes a drag.
const DRAG_SLOP = 6
// Wheel: one item per mouse notch (or per this many pixels of trackpad delta).
const WHEEL_STEP = 50
// Fling: how far (ms of the release velocity) the wheel coasts — capped at
// one value past the nearest.
const FLING_TIME = 120

const pad2 = (n: number) => String(n).padStart(2, '0')
const mod = (n: number, m: number) => ((n % m) + m) % m

/**
 * Material Design 3 Expressive scroll field (Compose `ScrollField`): a
 * vertical, endlessly wrapping wheel of numbers that snaps the selected value
 * to its centre. 200px tall by default (Compose `ScrollFieldHeight`), Large
 * corners, SurfaceContainerLowest; the centred value is DisplayLarge
 * Emphasized in OnSurface, the others DisplayMedium in Outline.
 *
 * It is an ARIA `spinbutton` (`aria-valuenow` / `aria-valuetext` / min / max):
 * ArrowUp / ArrowDown step by one (wrapping), PageUp / PageDown by
 * `pageStep`, Home / End jump to `min` / `max`. The mouse wheel moves one
 * value per notch; drag (touch, mouse, pen) scrolls and snaps, with a short
 * fling; tapping a neighbouring value scrolls to it.
 */
export const ScrollField = forwardRef<HTMLDivElement, ScrollFieldProps>(function ScrollField(
  {
    min = 0,
    max,
    value,
    defaultValue,
    onChange,
    pageStep = 5,
    disabled = false,
    formatValue = pad2,
    getValueText,
    className,
    onKeyDown,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    ...rest
  },
  ref,
) {
  const count = Math.max(1, Math.floor(max) - Math.floor(min) + 1)
  const [current, setInternal, isControlled] = useControllableState<number>({
    value,
    defaultValue: defaultValue ?? min,
    name: 'ScrollField',
    state: 'value',
  })
  const index = mod(Math.round(current) - min, count)

  // `pos` is the scroll position in px along an unbounded virtual strip
  // (Compose's endless pager): page p sits at p * ITEM_SIZE. At rest it is a
  // multiple of ITEM_SIZE; the centred page is round(pos / ITEM_SIZE).
  const [pos, setPos] = useState(index * ITEM_SIZE)
  // Whether moving to `pos` animates (off while dragging and for outside
  // value changes, which jump like Compose `scrollToOption`).
  const [animate, setAnimate] = useState(true)
  const page = Math.round(pos / ITEM_SIZE)
  // Whether a drag is moving the strip: the re-centre below must not fight
  // the pointer.
  const dragActive = useRef(false)

  // Keep the strip on the value: a controlled value changed from outside (or
  // a rejected change) re-centres on the nearest page with that value.
  if (mod(page, count) !== index && !dragActive.current) {
    let diff = mod(index - page, count)
    if (diff > count / 2) diff -= count
    setPos((page + diff) * ITEM_SIZE)
    setAnimate(false)
  }

  const latest = useRef({ page, index, count, disabled })
  latest.current = { page, index, count, disabled }

  const emit = (event: Event, nextPage: number) => {
    const nextIndex = mod(nextPage, count)
    if (nextIndex === mod(latest.current.page, count)) return
    const next = min + nextIndex
    if (!isControlled) setInternal(next)
    onChange?.(event, next)
  }

  /** Animate to `target` pages from the current one. */
  const goToPage = (event: Event, target: number) => {
    setAnimate(true)
    setPos(target * ITEM_SIZE)
    emit(event, target)
    latest.current.page = target
  }
  const step = (event: Event, by: number) => goToPage(event, latest.current.page + by)
  /** Shortest way round to a value index. */
  const goToIndex = (event: Event, target: number) => {
    let diff = mod(target - latest.current.page, count)
    if (diff > count / 2) diff -= count
    step(event, diff)
  }

  // ---- Keyboard (APG spinbutton) -------------------------------------------
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event)
    if (event.defaultPrevented || disabled) return
    const native = event.nativeEvent
    switch (event.key) {
      case 'ArrowUp':
        step(native, 1)
        break
      case 'ArrowDown':
        step(native, -1)
        break
      case 'PageUp':
        step(native, pageStep)
        break
      case 'PageDown':
        step(native, -pageStep)
        break
      case 'Home':
        goToIndex(native, 0)
        break
      case 'End':
        goToIndex(native, count - 1)
        break
      default:
        return
    }
    event.preventDefault()
  }

  // ---- Wheel (non-passive, so the page does not scroll) -------------------
  const rootRef = useRef<HTMLDivElement>(null)
  const stepRef = useRef(step)
  stepRef.current = step
  useEffect(() => {
    const node = rootRef.current
    if (!node) return
    let acc = 0
    const onWheel = (event: WheelEvent) => {
      if (latest.current.disabled || event.deltaY === 0) return
      event.preventDefault()
      // A mouse notch (line / page mode, or a large pixel delta) is one value;
      // small trackpad deltas add up.
      if (event.deltaMode !== 0 || Math.abs(event.deltaY) >= WHEEL_STEP) {
        acc = 0
        stepRef.current(event, Math.sign(event.deltaY))
        return
      }
      acc += event.deltaY
      if (Math.abs(acc) >= WHEEL_STEP) {
        const by = Math.trunc(acc / WHEEL_STEP)
        acc -= by * WHEEL_STEP
        stepRef.current(event, by)
      }
    }
    node.addEventListener('wheel', onWheel, { passive: false })
    return () => node.removeEventListener('wheel', onWheel)
  }, [])

  // ---- Drag / tap -----------------------------------------------------------
  const drag = useRef<{
    id: number
    startY: number
    lastY: number
    lastT: number
    velocity: number
    startPos: number
    dragging: boolean
  } | null>(null)

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    onPointerDown?.(event)
    if (event.defaultPrevented || disabled) return
    if (event.pointerType === 'mouse' && event.button !== 0) return
    drag.current = {
      id: event.pointerId,
      startY: event.clientY,
      lastY: event.clientY,
      lastT: event.timeStamp,
      velocity: 0,
      startPos: latest.current.page * ITEM_SIZE,
      dragging: false,
    }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    onPointerMove?.(event)
    const d = drag.current
    if (!d || d.id !== event.pointerId) return
    if (!d.dragging && Math.abs(event.clientY - d.startY) < DRAG_SLOP) return
    d.dragging = true
    dragActive.current = true
    const dt = event.timeStamp - d.lastT
    if (dt > 0) d.velocity = (event.clientY - d.lastY) / dt
    d.lastY = event.clientY
    d.lastT = event.timeStamp
    // Dragging up (negative dy) brings the following values into the centre.
    const nextPos = d.startPos - (event.clientY - d.startY)
    const nextPage = Math.round(nextPos / ITEM_SIZE)
    setAnimate(false)
    setPos(nextPos)
    if (nextPage !== latest.current.page) {
      emit(event.nativeEvent, nextPage)
      latest.current.page = nextPage
    }
  }

  const endDrag = (event: PointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const d = drag.current
    if (!d || d.id !== event.pointerId) return
    drag.current = null
    dragActive.current = false
    if (d.dragging) {
      // Snap to the nearest value; a fling coasts with the release velocity
      // but at most one more value (Compose PagerDefaults.flingBehavior
      // `PagerSnapDistance.atMost(1)`).
      const recent = event.timeStamp - d.lastT < 80 ? d.velocity : 0
      const coast = cancelled ? 0 : recent * FLING_TIME
      const releasePos = d.startPos - (d.lastY - d.startY)
      const nearest = Math.round(releasePos / ITEM_SIZE)
      const flung = Math.round((releasePos - coast) / ITEM_SIZE)
      goToPage(event.nativeEvent, Math.min(nearest + 1, Math.max(nearest - 1, flung)))
      return
    }
    if (cancelled) return
    // A tap on a neighbouring value scrolls to it (Compose item `clickable`).
    const rect = event.currentTarget.getBoundingClientRect()
    const offset = Math.round((event.clientY - (rect.top + rect.height / 2)) / ITEM_SIZE)
    if (offset !== 0) step(event.nativeEvent, offset)
  }

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    onPointerUp?.(event)
    endDrag(event, false)
  }
  const handlePointerCancel = (event: PointerEvent<HTMLDivElement>) => {
    onPointerCancel?.(event)
    endDrag(event, true)
  }

  const centre = Math.round(pos / ITEM_SIZE)
  const items = []
  for (let p = centre - WINDOW; p <= centre + WINDOW; p++) {
    const v = min + mod(p, count)
    items.push(
      <span
        key={p}
        className={styles.item}
        data-selected={p === centre || undefined}
        style={{ transform: `translateY(${p * ITEM_SIZE}px)` }}
      >
        {formatValue(v)}
      </span>,
    )
  }

  const shown = min + index
  return (
    <div
      ref={(node) => assignRefs(node, rootRef, ref)}
      role="spinbutton"
      tabIndex={disabled ? -1 : 0}
      aria-valuenow={shown}
      aria-valuemin={min}
      aria-valuemax={min + count - 1}
      aria-valuetext={(getValueText ?? formatValue)(shown)}
      aria-disabled={disabled || undefined}
      data-disabled={disabled || undefined}
      {...rest}
      className={clsx(styles.root, className)}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      <div className={styles.viewport} aria-hidden="true">
        <div
          className={styles.strip}
          data-animate={animate || undefined}
          style={{ transform: `translateY(${-pos}px)` }}
        >
          {items}
        </div>
      </div>
      <FocusRing />
    </div>
  )
})
