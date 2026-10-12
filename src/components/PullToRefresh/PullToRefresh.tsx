'use client'

import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'
import clsx from 'clsx'
import { LoadingIndicator } from '../LoadingIndicator'
import { CircularProgressIndicator } from '../ProgressIndicator'
import { prefersReducedMotion } from '../../internal/spring'
import styles from './PullToRefresh.module.css'

/**
 * Indicator flavor: `loading` = the Expressive contained loading indicator
 * (Compose `PullToRefreshDefaults.LoadingIndicator`), `circular` = the
 * classic circular arrow / spinner on a surface disc
 * (`PullToRefreshDefaults.Indicator`).
 */
export type PullToRefreshIndicator = 'loading' | 'circular'

export interface PullToRefreshProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Controlled refreshing state (Compose `isRefreshing`): the indicator sits
   * at the threshold and spins while `true`. Omit it to let the component
   * track the promise returned by `onRefresh` instead.
   */
  refreshing?: boolean
  /**
   * Fires when a pull is released past `threshold`. Return a promise to keep
   * the indicator spinning until it settles when `refreshing` is not
   * controlled.
   */
  onRefresh?: () => void | Promise<unknown>
  /** Indicator flavor. @default 'loading' */
  indicator?: PullToRefreshIndicator
  /** Disables the pull gesture (an ongoing refresh is still shown). @default false */
  disabled?: boolean
  /**
   * Distance (px, after the 0.5 drag resistance) a pull must exceed to
   * refresh on release (Compose `PositionalThreshold` 80dp). @default 80
   */
  threshold?: number
  /** Text announced by the polite live region when refreshing starts. @default 'Refreshing' */
  refreshingLabel?: string
  children?: ReactNode
}

/** Compose `DragMultiplier`: the indicator follows the finger at half speed. */
const DRAG_MULTIPLIER = 0.5
/** Compose `PullToRefreshDefaults.IndicatorMaxDistance` (= PositionalThreshold 80dp). */
const MAX_DISTANCE = 80
/** Touch slop before a press turns into a pull (Android `touchSlop` 8dp). */
const TOUCH_SLOP = 8
/** Indicator container sizes: `SpinnerContainerSize` 40dp / LoadingIndicator 48dp. */
const CONTAINER_SIZE: Record<PullToRefreshIndicator, number> = { circular: 40, loading: 48 }

/**
 * Compose `calculateVerticalOffset` / `threshold` → `distanceFraction`:
 * linear up to the threshold, then a non-linear tension that tops out at
 * twice the threshold.
 */
export function pullDistanceFraction(distance: number, threshold: number): number {
  if (!(threshold > 0) || !(distance > 0)) return 0
  const adjusted = distance * DRAG_MULTIPLIER
  if (adjusted <= threshold) return adjusted / threshold
  const linearTension = Math.min(2, Math.max(0, adjusted / threshold - 1))
  return 1 + linearTension - (linearTension * linearTension) / 4
}

function transitionTimeMs(el: HTMLElement | null): number {
  if (!el) return 0
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

/** Every scroll container from `target` up to `root` is at its top. */
function atTop(target: EventTarget | null, root: HTMLElement): boolean {
  let el = target instanceof Element ? target : null
  while (el && el !== root) {
    if (el.scrollTop > 0) return false
    el = el.parentElement
  }
  return root.scrollTop <= 0
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    setReduced(prefersReducedMotion())
    if (!mql?.addEventListener) return
    const onChange = () => setReduced(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])
  return reduced
}

/* --- Circular arrow (Compose `CircularArrowProgressIndicator`) ---------- */

const SPINNER = 16 // SpinnerSize
const STROKE = 2.5 // StrokeWidth
const ARC_RADIUS = 5.5 + STROKE / 2 // ArcRadius + StrokeWidth / 2
const ARROW_WIDTH = 10
const ARROW_HEIGHT = 5
const MAX_PROGRESS_ARC = 0.8
/** Compose draws the refreshing spinner without a track, in `indicatorColor`. */
const SPINNER_COLORS = {
  '--_active-indicator-color': 'var(--_indicator-color)',
  '--_track-color': 'transparent',
} as CSSProperties

function CircularArrow({ progress }: { progress: number }) {
  // Compose `ArrowValues` (SwipeRefreshLayout spec).
  const adjusted = (Math.max(Math.min(1, progress) - 0.4, 0) * 5) / 3
  const linearTension = Math.min(2, Math.max(0, Math.abs(progress) - 1))
  const tension = linearTension - (linearTension * linearTension) / 4
  const endTrim = adjusted * MAX_PROGRESS_ARC
  const rotation = (-0.25 + 0.4 * adjusted + tension) * 0.5
  const startAngle = rotation * 360
  const endAngle = (rotation + endTrim) * 360
  const scale = Math.min(1, adjusted)
  const c = SPINNER / 2
  const point = (deg: number) => {
    const rad = (deg * Math.PI) / 180
    return `${(c + ARC_RADIUS * Math.cos(rad)).toFixed(3)} ${(c + ARC_RADIUS * Math.sin(rad)).toFixed(3)}`
  }
  const sweep = endAngle - startAngle
  const arc =
    sweep > 0
      ? `M ${point(startAngle)} A ${ARC_RADIUS} ${ARC_RADIUS} 0 ${sweep > 180 ? 1 : 0} 1 ${point(endAngle)}`
      : ''
  const inset = (ARROW_WIDTH * scale) / 2
  const ax = ARC_RADIUS + c - inset
  const ay = c - STROKE
  const arrow = `M ${ax} ${ay} L ${ax + (ARROW_WIDTH * scale) / 2} ${ay + ARROW_HEIGHT * scale} L ${ax + ARROW_WIDTH * scale} ${ay}`
  return (
    <svg
      className={styles.arrow}
      data-dim={progress < 1 || undefined}
      viewBox={`0 0 ${SPINNER} ${SPINNER}`}
      width={SPINNER}
      height={SPINNER}
      fill="none"
      stroke="currentColor"
      strokeWidth={STROKE}
    >
      <g transform={`rotate(${rotation} ${c} ${c})`}>
        {arc && <path d={arc} />}
        {scale > 0 && <path d={arrow} transform={`rotate(${endAngle - STROKE} ${c} ${c})`} />}
      </g>
    </svg>
  )
}

/**
 * Material Design 3 pull-to-refresh (Compose `PullToRefreshBox`).
 *
 * The component **is the scroll container**: give it a height (or a flex /
 * grid track) and put the content inside. A downward pull that starts while
 * the container — and every scrollable element between it and the pointer —
 * is scrolled to the top drags the indicator in at half the finger speed (with
 * Compose's tension past the threshold); releasing beyond `threshold` (80px)
 * calls `onRefresh`. While pulling the indicator is determinate (its progress
 * is the pulled fraction); while `refreshing` it sits at the threshold and is
 * indeterminate. Touch (non-passive touch listeners) and mouse / pen (pointer
 * events) both pull. Under reduced motion the indicator does not travel: it
 * fades in at its resting position.
 *
 * The gesture is not keyboard-reachable — always provide a visible refresh
 * control too. The root carries `aria-busy` while refreshing and a polite
 * live region announces `refreshingLabel`.
 *
 * Styling hooks on the root: `data-indicator`, `data-refreshing`,
 * `data-pulling`, `data-disabled`, and `--md-pull-to-refresh-progress`
 * (the indicator's distance fraction, 0 at rest, 1 at the threshold, up to 2).
 */
export const PullToRefresh = forwardRef<HTMLDivElement, PullToRefreshProps>(
  function PullToRefresh(
    {
      refreshing: refreshingProp,
      onRefresh,
      indicator = 'loading',
      disabled = false,
      threshold = 80,
      refreshingLabel = 'Refreshing',
      className,
      style,
      onClickCapture,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      children,
      ...rest
    },
    ref,
  ) {
    const [refreshingState, setRefreshingState] = useState(false)
    const controlled = refreshingProp !== undefined
    const refreshing = controlled ? refreshingProp : refreshingState

    /** Distance fraction of the current / last pull (kept for the hide). */
    const [fraction, setFraction] = useState(0)
    const [pulling, setPulling] = useState(false)
    /** The indeterminate layer stays mounted until the indicator has hidden. */
    const [spinnerMounted, setSpinnerMounted] = useState(refreshing)
    const reduced = useReducedMotion()

    const rootRef = useRef<HTMLDivElement | null>(null)
    const indicatorRef = useRef<HTMLDivElement>(null)
    const gesture = useRef<{
      id: number | 'touch'
      startX: number
      startY: number
      active: boolean
      distance: number
    } | null>(null)
    const suppressClick = useRef(false)
    const mounted = useRef(true)
    useEffect(() => {
      mounted.current = true
      return () => {
        mounted.current = false
      }
    }, [])

    const setRootRef = useCallback(
      (node: HTMLDivElement | null) => {
        rootRef.current = node
        if (typeof ref === 'function') ref(node)
        else if (ref) ref.current = node
      },
      [ref],
    )

    useEffect(() => {
      if (refreshing) {
        setSpinnerMounted(true)
        setFraction(1)
        return
      }
      if (!spinnerMounted) return
      const time = transitionTimeMs(indicatorRef.current)
      if (time <= 0) {
        setSpinnerMounted(false)
        return
      }
      const timer = window.setTimeout(() => setSpinnerMounted(false), time + 50)
      return () => window.clearTimeout(timer)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refreshing])

    const enabled = !disabled && !refreshing

    const refresh = () => {
      const result = onRefresh?.()
      if (controlled || !result || typeof (result as Promise<unknown>).then !== 'function') return
      setRefreshingState(true)
      const done = () => {
        if (mounted.current) setRefreshingState(false)
      }
      ;(result as Promise<unknown>).then(done, done)
    }

    // --- Gesture core (shared by touch and pointer input) ---------------
    const begin = (id: number | 'touch', x: number, y: number, target: EventTarget | null) => {
      const root = rootRef.current
      if (!enabled || !root || !atTop(target, root)) return
      gesture.current = { id, startX: x, startY: y, active: false, distance: 0 }
    }

    /** Returns true when the move belongs to the pull (native scroll must not run). */
    const move = (id: number | 'touch', x: number, y: number): boolean => {
      const g = gesture.current
      if (!g || g.id !== id) return false
      if (!enabled) {
        gesture.current = null
        if (g.active) setPulling(false)
        return false
      }
      const dy = y - g.startY
      if (!g.active) {
        const dx = x - g.startX
        if (dy < -TOUCH_SLOP || (Math.abs(dx) > TOUCH_SLOP && Math.abs(dx) > Math.abs(dy))) {
          gesture.current = null // a scroll or a horizontal swipe: not ours
          return false
        }
        if (dy <= TOUCH_SLOP) return dy > 0
        if ((rootRef.current?.scrollTop ?? 0) > 0) {
          gesture.current = null
          return false
        }
        g.active = true
        // Compose subtracts the slop so the indicator does not jump.
        g.startY += TOUCH_SLOP
        setPulling(true)
      }
      g.distance = Math.max(0, y - g.startY)
      setFraction(pullDistanceFraction(g.distance, threshold))
      return true
    }

    const end = (id: number | 'touch', cancelled: boolean): boolean => {
      const g = gesture.current
      if (!g || g.id !== id) return false
      gesture.current = null
      if (!g.active) return false
      setPulling(false)
      if (!cancelled && enabled && g.distance * DRAG_MULTIPLIER > threshold) refresh()
      return true
    }

    const handlers = useRef({ begin, move, end })
    handlers.current = { begin, move, end }

    // Touch: native listeners — touchmove must be non-passive to stop the
    // page from scrolling / overscrolling while the pull is in progress.
    useEffect(() => {
      const root = rootRef.current
      if (!root) return
      const onStart = (event: TouchEvent) => {
        if (event.touches.length !== 1) {
          handlers.current.end('touch', true)
          return
        }
        const t = event.touches[0]
        handlers.current.begin('touch', t.clientX, t.clientY, event.target)
      }
      const onMove = (event: TouchEvent) => {
        const t = event.touches[0]
        if (!t) return
        if (handlers.current.move('touch', t.clientX, t.clientY) && event.cancelable) {
          event.preventDefault()
        }
      }
      const onEnd = () => handlers.current.end('touch', false)
      const onCancel = () => handlers.current.end('touch', true)
      root.addEventListener('touchstart', onStart, { passive: true })
      root.addEventListener('touchmove', onMove, { passive: false })
      root.addEventListener('touchend', onEnd)
      root.addEventListener('touchcancel', onCancel)
      return () => {
        root.removeEventListener('touchstart', onStart)
        root.removeEventListener('touchmove', onMove)
        root.removeEventListener('touchend', onEnd)
        root.removeEventListener('touchcancel', onCancel)
      }
    }, [])

    // Mouse / pen: pointer events (touch pointers are handled above).
    const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
      onPointerDown?.(event)
      if (event.pointerType === 'touch' || event.defaultPrevented) return
      if (event.pointerType === 'mouse' && event.button !== 0) return
      begin(event.pointerId, event.clientX, event.clientY, event.target)
    }

    const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
      onPointerMove?.(event)
      if (event.pointerType === 'touch') return
      const g = gesture.current
      if (!g || g.id !== event.pointerId) return
      // A mouse press released outside never delivers its pointerup here.
      if (!g.active && event.pointerType === 'mouse' && event.buttons === 0) {
        gesture.current = null
        return
      }
      const wasActive = g.active
      if (move(event.pointerId, event.clientX, event.clientY) && !wasActive && g.active) {
        try {
          event.currentTarget.setPointerCapture(event.pointerId)
        } catch {
          /* not supported (e.g. jsdom) */
        }
        window.getSelection?.()?.removeAllRanges()
      }
    }

    const finishPointer = (event: PointerEvent<HTMLDivElement>, cancelled: boolean) => {
      if (event.pointerType === 'touch') return
      if (end(event.pointerId, cancelled)) {
        // The click that follows a real pull must not activate the content.
        suppressClick.current = true
        window.setTimeout(() => {
          suppressClick.current = false
        }, 0)
      }
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
    const shown = refreshing ? 1 : pulling ? fraction : 0
    const size = CONTAINER_SIZE[indicator]
    const translateY = (reduced ? 1 : shown) * MAX_DISTANCE - size
    const opacity = reduced ? Math.min(1, shown) : 1
    const visible = refreshing || (pulling && fraction > 0)
    const spinning = refreshing || spinnerMounted
    const progress = Math.min(1, fraction)
    // Loading flavor: past the threshold the whole indicator keeps rotating
    // (Compose `rotate(-(progress - 1) * 180)`), not under reduced motion.
    const overshootRotation = !reduced && fraction > 1 ? -(fraction - 1) * 180 : 0

    return (
      <>
        <div
          ref={setRootRef}
          {...rest}
          className={clsx(styles.root, className)}
          aria-busy={refreshing || undefined}
          data-indicator={indicator}
          data-refreshing={refreshing || undefined}
          data-pulling={pulling || undefined}
          data-disabled={disabled || undefined}
          style={{ ...style, '--md-pull-to-refresh-progress': shown } as CSSProperties}
          onClickCapture={handleClickCapture}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={(event) => {
            onPointerUp?.(event)
            finishPointer(event, false)
          }}
          onPointerCancel={(event) => {
            onPointerCancel?.(event)
            finishPointer(event, true)
          }}
        >
          <div className={styles.anchor} aria-hidden="true">
            <div
              ref={indicatorRef}
              className={styles.indicator}
              data-visible={visible || undefined}
              style={{ transform: `translateY(${translateY}px)`, opacity }}
            >
              <div
                className={styles.layer}
                data-hidden={spinning || undefined}
                style={overshootRotation ? { transform: `rotate(${overshootRotation}deg)` } : undefined}
              >
                {indicator === 'loading' ? (
                  <LoadingIndicator variant="contained" value={progress} size={size} />
                ) : (
                  <CircularArrow progress={fraction} />
                )}
              </div>
              {spinning && (
                <div className={clsx(styles.layer, styles.spinner)} data-hidden={!refreshing || undefined}>
                  {indicator === 'loading' ? (
                    <LoadingIndicator variant="contained" size={size} />
                  ) : (
                    <CircularProgressIndicator
                      size={SPINNER}
                      thickness={STROKE}
                      style={SPINNER_COLORS}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
          {children}
        </div>
        <span role="status" className={styles.visuallyHidden}>
          {refreshing ? refreshingLabel : ''}
        </span>
      </>
    )
  },
)
