import {
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'
import clsx from 'clsx'
import { ListNavContext, ListParentContext } from '../List/ListContext'
import styles from './SwipeToDismiss.module.css'

/**
 * Logical dismiss direction. `startToEnd` = swiping in the reading direction
 * (left→right in LTR, right→left in RTL); `endToStart` = the opposite.
 */
export type SwipeDismissDirection = 'startToEnd' | 'endToStart'

export interface SwipeToDismissProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Fires once the row has finished sliding out and settled in the dismissed
   * position (immediately under reduced motion) — the place to remove the
   * item. Also fires after a programmatic dismiss (`dismissed`).
   */
  onDismiss?: (direction: SwipeDismissDirection) => void
  /**
   * Controlled dismissed state: `null` = settled (row in place), a direction =
   * dismissed that way. Changing it animates the row — set a direction to
   * dismiss programmatically (e.g. from a delete button, the non-gesture
   * alternative m3 requires), set `null` to reset / cancel a dismissal.
   */
  dismissed?: SwipeDismissDirection | null
  /** Initial dismissed state when uncontrolled. @default null */
  defaultDismissed?: SwipeDismissDirection | null
  /**
   * Fires when a swipe is released into a dismiss anchor (at release, before
   * the exit animation). In controlled mode, keep the value `null` to veto.
   */
  onDismissedChange?: (dismissed: SwipeDismissDirection | null) => void
  /** Content revealed behind the row, for either direction (fallback). */
  background?: ReactNode
  /** Content revealed while swiping start→end (overrides `background`). */
  startToEndBackground?: ReactNode
  /** Content revealed while swiping end→start (overrides `background`). */
  endToStartBackground?: ReactNode
  /** Allow start→end (reading-direction) dismissal. @default true */
  enableStartToEnd?: boolean
  /** Allow end→start dismissal. @default true */
  enableEndToStart?: boolean
  /**
   * Positional threshold (px) a slow release must pass, in the direction of
   * motion, to dismiss (Compose `positionalThreshold` 56dp). @default 56
   */
  threshold?: number
  children?: ReactNode
}

/** Touch slop before a press turns into a swipe (Android `touchSlop` 8dp). */
const TOUCH_SLOP = 8
/** Fling velocity (px/s) that dismisses regardless of distance (125dp/s). */
const FLING_VELOCITY = 125
/** VelocityTracker window / "pointer stopped" cut-off (Compose). */
const VELOCITY_WINDOW_MS = 100
const POINTER_STOPPED_MS = 40

type Target = SwipeDismissDirection | 'settled'

interface Gesture {
  pointerId: number
  startX: number
  startY: number
  /** Logical offset at gesture start (non-zero when grabbed mid-settle). */
  origin: number
  width: number
  rtl: boolean
  active: boolean
  samples: { t: number; x: number }[]
}

function transitionTimeMs(el: HTMLElement): number {
  const style = window.getComputedStyle(el)
  const parse = (value: string) =>
    Math.max(
      0,
      ...value.split(',').map((part) => {
        const n = parseFloat(part)
        if (Number.isNaN(n)) return 0
        return part.trim().endsWith('ms') ? n : n * 1000
      }),
    )
  return parse(style.transitionDuration || '') + parse(style.transitionDelay || '')
}

/** Compose `AnchoredDraggable` `computeTarget` over logical anchors. */
function computeTarget(
  anchors: number[],
  offset: number,
  velocity: number,
  threshold: number,
): number {
  const closest = (upwards?: boolean): number => {
    let best: number | undefined
    for (const a of anchors) {
      if (upwards === true && a < offset) continue
      if (upwards === false && a > offset) continue
      if (best === undefined || Math.abs(a - offset) < Math.abs(best - offset)) best = a
    }
    return best ?? closest()
  }
  if (velocity === 0) return closest()
  const forward = velocity > 0
  if (Math.abs(velocity) >= FLING_VELOCITY) return closest(forward)
  const lower = closest(false)
  const upper = closest(true)
  const from = forward ? lower : upper
  if (Math.abs(from - offset) >= threshold) return forward ? upper : lower
  return forward ? lower : upper
}

function velocityOf(samples: { t: number; x: number }[], now: number): number {
  const last = samples[samples.length - 1]
  if (!last || now - last.t > POINTER_STOPPED_MS) return 0
  const recent = samples.filter((s) => last.t - s.t <= VELOCITY_WINDOW_MS)
  const first = recent[0]
  const dt = last.t - first.t
  return dt > 0 ? ((last.x - first.x) / dt) * 1000 : 0
}

/**
 * Material Design 3 Swipe-to-dismiss row (Compose `SwipeToDismissBox`).
 *
 * A horizontally draggable row over a caller-provided background. Dragging
 * starts after an 8px touch slop (so nested buttons and clickable rows keep
 * their clicks); on release the row dismisses on a fling ≥125px/s or past the
 * 56px `threshold` in the direction of motion, and otherwise snaps to the
 * nearest anchor. Directions are logical (mirrored in RTL). `onDismiss` fires
 * after the exit animation; `dismissed` (controlled / uncontrolled) resets or
 * dismisses programmatically — provide a non-gesture alternative (e.g. a
 * delete button) that sets it. Gestures are disabled while dismissed.
 *
 * Inside a `List`, the root renders the `<li>` and the nested `ListItem`
 * renders a `<div>`, keeping list semantics.
 *
 * Styling hooks on the root: `data-direction` (current swipe / dismiss
 * direction), `data-target` (anchor the row would settle at if released now:
 * `settled` / `startToEnd` / `endToStart`), `data-dismissed`, `data-dragging`,
 * and `--md-swipe-to-dismiss-progress` (0–1, swiped distance / row width).
 */
export const SwipeToDismiss = forwardRef<HTMLDivElement, SwipeToDismissProps>(
  function SwipeToDismiss(
    {
      onDismiss,
      dismissed: dismissedProp,
      defaultDismissed = null,
      onDismissedChange,
      background,
      startToEndBackground,
      endToStartBackground,
      enableStartToEnd = true,
      enableEndToStart = true,
      threshold = 56,
      className,
      style,
      onClickCapture,
      children,
      ...rest
    },
    ref,
  ) {
    const listParent = useContext(ListParentContext)
    const inList = listParent === 'list'
    // In a selection List (role=listbox) the <li> is presentational so the
    // ListItem inside is the listbox's option (B17 / B21).
    const listSelection = useContext(ListNavContext)?.selectionMode ?? 'none'

    const [dismissedState, setDismissedState] = useState(defaultDismissed)
    const controlled = dismissedProp !== undefined
    const dismissed = controlled ? dismissedProp : dismissedState

    /** Logical drag offset while a swipe is active, else null. */
    const [drag, setDrag] = useState<number | null>(null)
    const [dragWidth, setDragWidth] = useState(0)
    const [rtl, setRtl] = useState(false)
    /** Last swiped direction, kept until the row has settled back at 0. */
    const [lastDirection, setLastDirection] = useState<SwipeDismissDirection | null>(
      dismissed ?? null,
    )

    const rootRef = useRef<HTMLElement | null>(null)
    const contentRef = useRef<HTMLDivElement>(null)
    const gesture = useRef<Gesture | null>(null)
    const suppressClick = useRef(false)
    // Rows mounted in place need no settle pass; a row mounted dismissed
    // settles (and reports onDismiss) like Compose's LaunchedEffect.
    const settledKey = useRef<string | null>(dismissed == null ? 'settled' : null)
    const onDismissRef = useRef(onDismiss)
    onDismissRef.current = onDismiss

    const setRootRef = useCallback(
      (node: HTMLElement | null) => {
        rootRef.current = node
        if (typeof ref === 'function') ref(node as HTMLDivElement | null)
        else if (ref) ref.current = node as HTMLDivElement | null
      },
      [ref],
    )

    const isRtl = () =>
      rootRef.current != null &&
      window.getComputedStyle(rootRef.current).direction === 'rtl'

    const setDismissed = (next: SwipeDismissDirection | null) => {
      if (!controlled) setDismissedState(next)
      onDismissedChange?.(next)
    }

    // Resolve the physical sign of a programmatic / initial dismiss.
    useLayoutEffect(() => {
      if (dismissed != null) {
        const next = isRtl()
        if (next !== rtl) setRtl(next)
        setLastDirection(dismissed)
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dismissed])

    // Settle: after the row reaches its anchor (transitionend, or at once when
    // there is no transition — reduced motion), clear the swipe direction or
    // report the dismissal.
    useEffect(() => {
      if (drag !== null) return
      const key = dismissed ?? 'settled'
      if (settledKey.current === key) return
      const content = contentRef.current
      let done = false
      const settle = () => {
        if (done) return
        done = true
        settledKey.current = key
        if (dismissed == null) setLastDirection(null)
        else onDismissRef.current?.(dismissed)
      }
      const time = content ? transitionTimeMs(content) : 0
      if (time <= 0) {
        settle()
        return
      }
      const onEnd = (event: TransitionEvent) => {
        if (event.target !== content) return
        if (event.propertyName && event.propertyName !== 'transform') return
        settle()
      }
      content!.addEventListener('transitionend', onEnd)
      const timer = window.setTimeout(settle, time + 50)
      return () => {
        content!.removeEventListener('transitionend', onEnd)
        window.clearTimeout(timer)
      }
    }, [drag, dismissed])

    const gesturesEnabled = dismissed == null && (enableStartToEnd || enableEndToStart)

    const clampLogical = (x: number, width: number) => {
      const max = enableStartToEnd ? width : 0
      const min = enableEndToStart ? -width : 0
      return Math.min(max, Math.max(min, x))
    }

    const currentVisualOffset = (g: { rtl: boolean }) => {
      // Grabbing a row that is still settling: start from where it is.
      const content = contentRef.current
      if (!content || typeof DOMMatrixReadOnly === 'undefined') return 0
      const transform = window.getComputedStyle(content).transform
      if (!transform || transform === 'none') return 0
      try {
        const x = new DOMMatrixReadOnly(transform).m41
        return g.rtl ? -x : x
      } catch {
        return 0
      }
    }

    const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
      // A stale, never-activated press (released outside) is simply replaced.
      if (!gesturesEnabled || gesture.current?.active) return
      if (event.pointerType === 'mouse' && event.button !== 0) return
      const g: Gesture = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        origin: 0,
        width: contentRef.current?.offsetWidth || 0,
        rtl: isRtl(),
        active: false,
        samples: [],
      }
      g.origin = currentVisualOffset(g)
      gesture.current = g
    }

    const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
      const g = gesture.current
      if (!g || event.pointerId !== g.pointerId) return
      const dxPhysical = event.clientX - g.startX
      const dx = g.rtl ? -dxPhysical : dxPhysical
      if (!g.active) {
        const dy = event.clientY - g.startY
        if (Math.abs(dy) > TOUCH_SLOP && Math.abs(dy) >= Math.abs(dx)) {
          gesture.current = null // vertical: not ours
          return
        }
        // A press stays a press (clicks reach nested controls) until the
        // horizontal slop is exceeded — or towards a disabled direction only.
        if (Math.abs(dx) <= TOUCH_SLOP) return
        if (g.origin === 0 && ((dx > 0 && !enableStartToEnd) || (dx < 0 && !enableEndToStart))) {
          return
        }
        g.active = true
        // Compose subtracts the slop so the row does not jump.
        g.startX += Math.sign(dxPhysical) * TOUCH_SLOP
        try {
          event.currentTarget.setPointerCapture(event.pointerId)
        } catch {
          /* not supported (e.g. jsdom) */
        }
        window.getSelection?.()?.removeAllRanges()
        setRtl(g.rtl)
        setDragWidth(g.width)
      }
      const logical = clampLogical(
        g.origin + (g.rtl ? -(event.clientX - g.startX) : event.clientX - g.startX),
        g.width || Infinity,
      )
      g.samples.push({ t: event.timeStamp, x: logical })
      if (g.samples.length > 20) g.samples.shift()
      if (logical !== 0) setLastDirection(logical > 0 ? 'startToEnd' : 'endToStart')
      setDrag(logical)
    }

    const endGesture = (event: PointerEvent<HTMLDivElement>, cancelled: boolean) => {
      const g = gesture.current
      if (!g || event.pointerId !== g.pointerId) return
      gesture.current = null
      if (!g.active) return
      // The click that follows a real drag must not activate nested controls.
      suppressClick.current = true
      window.setTimeout(() => {
        suppressClick.current = false
      }, 0)
      settledKey.current = null
      const last = g.samples[g.samples.length - 1]
      const offset = last?.x ?? g.origin
      let target = 0
      if (!cancelled) {
        const anchors = [0]
        if (enableStartToEnd) anchors.push(g.width)
        if (enableEndToStart) anchors.unshift(-g.width)
        target = computeTarget(anchors, offset, velocityOf(g.samples, event.timeStamp), threshold)
      }
      setDrag(null)
      if (target !== 0 && g.width > 0) setDismissed(target > 0 ? 'startToEnd' : 'endToStart')
    }

    const handleClickCapture = (event: MouseEvent<HTMLDivElement>) => {
      if (suppressClick.current) {
        suppressClick.current = false
        event.preventDefault()
        event.stopPropagation()
        return
      }
      onClickCapture?.(event)
    }

    // --- Rendering -------------------------------------------------------
    const sign = rtl ? -1 : 1
    let transform: string
    if (drag !== null) transform = `translateX(${sign * drag}px)`
    else if (dismissed === 'startToEnd') transform = `translateX(${sign * 100}%)`
    else if (dismissed === 'endToStart') transform = `translateX(${-sign * 100}%)`
    else transform = 'translateX(0px)'

    const direction: SwipeDismissDirection | null =
      drag !== null && drag !== 0
        ? drag > 0
          ? 'startToEnd'
          : 'endToStart'
        : dismissed ?? lastDirection

    let target: Target
    if (drag !== null) {
      // Compose `targetValue`: the closest anchor to the current offset.
      target =
        dragWidth > 0 && Math.abs(drag) >= dragWidth / 2
          ? drag > 0
            ? 'startToEnd'
            : 'endToStart'
          : 'settled'
    } else target = dismissed ?? 'settled'

    const progress =
      drag !== null ? (dragWidth > 0 ? Math.min(1, Math.abs(drag) / dragWidth) : 0) : dismissed ? 1 : 0

    const backgroundNode =
      direction === 'startToEnd'
        ? startToEndBackground ?? background
        : direction === 'endToStart'
          ? endToStartBackground ?? background
          : background

    // (Typed as 'div': the props / ref shape is the same for both tags.)
    const Root = (inList ? 'li' : 'div') as 'div'

    return (
      <Root
        ref={setRootRef}
        role={inList && listSelection !== 'none' ? 'none' : undefined}
        {...rest}
        className={clsx(styles.root, className)}
        data-direction={direction ?? undefined}
        data-target={target}
        data-dismissed={dismissed ?? undefined}
        data-dragging={drag !== null || undefined}
        style={{ ...style, '--md-swipe-to-dismiss-progress': progress } as CSSProperties}
        onClickCapture={handleClickCapture}
      >
        {backgroundNode != null && (
          <div className={styles.background} aria-hidden="true">
            {backgroundNode}
          </div>
        )}
        <div
          ref={contentRef}
          className={styles.content}
          data-dragging={drag !== null || undefined}
          style={{ transform }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={(event) => endGesture(event, false)}
          onPointerCancel={(event) => endGesture(event, true)}
        >
          <ListParentContext.Provider value={inList ? 'swipe' : listParent}>
            {children}
          </ListParentContext.Provider>
        </div>
      </Root>
    )
  },
)
