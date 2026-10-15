'use client'

import {
  forwardRef,
  useEffect,
  useRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'
import clsx from 'clsx'
import type { ModalCloseEvent } from '../../internal/closeReason'
import { useControllableState } from '../../internal/useControllableState'
import { assignRefs, useModal } from '../../internal/useModal'
import { useModalTopLayer } from '../../internal/useTopLayer'
import { FocusRing } from '../../primitives/FocusRing/FocusRing'
import styles from './BottomSheet.module.css'
import { useLocaleLabels } from '../../internal/locale'

/**
 * Drag distance from the starting detent beyond which release settles at the
 * neighbouring detent (Compose `BottomSheetDefaults.PositionalThreshold`).
 */
const POSITIONAL_THRESHOLD_PX = 56
/**
 * Release velocity beyond which the sheet settles at the next detent in the
 * fling direction (Compose `BottomSheetDefaults.VelocityThreshold`).
 */
const VELOCITY_THRESHOLD_PX_S = 125
/** Velocity samples older than this (relative to the release) are discarded. */
const VELOCITY_WINDOW_MS = 100
/**
 * A gap between samples longer than this means the pointer stopped, so
 * older samples no longer describe the release (Compose VelocityTracker's
 * AssumePointerMoveStoppedMilliseconds).
 */
const ASSUME_STOPPED_MS = 40
/** Pointer movement below this is treated as a tap, not a drag. */
const TAP_SLOP_PX = 5

export type BottomSheetVariant = 'standard' | 'modal'

/**
 * Why the sheet asked to close (ruling B7 vocabulary): Escape, a scrim
 * click (modal only), the drag handle activated as a button
 * (`'closeButton'` — not with `skipPartiallyExpanded={false}`), or a drag / fling
 * past the threshold to the hidden position (`'drag'`).
 */
export type BottomSheetCloseReason = 'escapeKeyDown' | 'backdropClick' | 'closeButton' | 'drag'

type Detent = 'hidden' | 'partial' | 'expanded'

/**
 * Release velocity (px/s, positive = downward) from the samples, ending at
 * the release sample: samples older than {@link VELOCITY_WINDOW_MS} or
 * before a {@link ASSUME_STOPPED_MS} pause are dropped, so a fling followed
 * by a hold releases at 0.
 */
function releaseVelocity(samples: Array<{ t: number; y: number }>): number {
  const last = samples[samples.length - 1]
  let firstIndex = samples.length - 1
  for (let i = samples.length - 2; i >= 0; i--) {
    const s = samples[i]
    if (last.t - s.t > VELOCITY_WINDOW_MS) break
    if (samples[i + 1].t - s.t > ASSUME_STOPPED_MS) break
    firstIndex = i
  }
  const first = samples[firstIndex]
  const dt = last.t - first.t
  return dt > 0 ? ((last.y - first.y) / dt) * 1000 : 0
}

/**
 * Resting translateY (px) of each detent for a sheet of `sheetHeight` in a
 * container of `fullHeight` — the same anchors as Compose `BottomSheet`
 * (BottomSheet.kt `draggableAnchors`): Hidden at the sheet height, Expanded
 * at 0, PartiallyExpanded showing `min(fullHeight / 2, sheetHeight / 2)`
 * (`calculatePartiallyExpandedOffset`, deterministic flag on). The CSS
 * `max(50%, 100% - 50cqh)` translate is the same value.
 */
function detentOffsets(sheetHeight: number, fullHeight: number, hasPartial: boolean) {
  const anchors: Array<{ detent: Detent; offset: number }> = [
    { detent: 'expanded', offset: 0 },
  ]
  if (hasPartial) {
    anchors.push({
      detent: 'partial',
      offset: sheetHeight - Math.min(fullHeight / 2, sheetHeight / 2),
    })
  }
  anchors.push({ detent: 'hidden', offset: sheetHeight })
  return anchors
}

/**
 * The detent a release settles at — Compose `AnchoredDraggableState`
 * target computation: a fling faster than the velocity threshold goes to the
 * closest detent in its direction; otherwise the sheet moves to the
 * neighbouring detent only once dragged past the positional threshold.
 */
function settleTarget(
  anchors: Array<{ detent: Detent; offset: number }>,
  start: Detent,
  position: number,
  velocity: number,
): Detent {
  const startOffset = anchors.find((a) => a.detent === start)?.offset ?? 0
  if (position === startOffset) return start
  const closestInDirection = (down: boolean) => {
    const candidates = anchors.filter((a) => (down ? a.offset >= position : a.offset <= position))
    const pool = candidates.length > 0 ? candidates : anchors
    return pool.reduce((best, a) =>
      Math.abs(a.offset - position) < Math.abs(best.offset - position) ? a : best,
    )
  }
  if (Math.abs(velocity) >= VELOCITY_THRESHOLD_PX_S) {
    return closestInDirection(velocity > 0).detent
  }
  const neighbor = closestInDirection(position > startOffset)
  return Math.abs(position - startOffset) <= POSITIONAL_THRESHOLD_PX ? start : neighbor.detent
}

export interface BottomSheetProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * `'modal'` overlays the page with a scrim, traps focus and inerts the
   * rest of the page (Compose `ModalBottomSheet`). `'standard'` co-exists
   * with the page — no scrim, no focus trap, no inert, no scroll lock — and
   * is positioned at the bottom of its nearest positioned ancestor
   * (Compose `BottomSheet` / `BottomSheetScaffold`). @default 'modal'
   */
  variant?: BottomSheetVariant
  /** Whether the sheet is shown. */
  open: boolean
  /**
   * Called on scrim click, Escape, a drag / fling to the hidden position,
   * or the drag handle (unless partially expanding is enabled), with the triggering
   * event and the `reason`.
   */
  onClose?: (event: ModalCloseEvent, reason: BottomSheetCloseReason) => void
  /**
   * Whether the open sheet is fully expanded (`true`) or partially expanded
   * (`false`: half of its height, at most half of the container). Controlled.
   * Only used with `skipPartiallyExpanded={false}`.
   */
  expanded?: boolean
  /**
   * Uncontrolled initial detent. An uncontrolled sheet returns to it each
   * time it closes, so it reopens partially expanded (Compose
   * `SheetState.show()`). @default false
   */
  defaultExpanded?: boolean
  /** Called when a drag or the drag handle moves the sheet between detents. */
  onExpandedChange?: (expanded: boolean) => void
  /**
   * Skip the partially-expanded detent: the sheet always opens fully
   * expanded and the drag handle dismisses it. Pass `false` to opt in to
   * Compose's current behavior — open partially expanded, with the handle
   * toggling partial / expanded (ruling B35: the default may flip in v2).
   * @default true
   */
  skipPartiallyExpanded?: boolean
  /** Show the top drag handle. @default true */
  showDragHandle?: boolean
  /**
   * Accessible label for the drag handle button.
   * @default 'Close' ('Drag handle' with `skipPartiallyExpanded={false}`)
   */
  dragHandleLabel?: string
  children?: ReactNode
}

/**
 * Material Design 3 bottom sheet (modal or standard).
 *
 * SurfaceContainerLow container, 28dp top corners, elevation 1, max-width
 * 640dp, an OnSurfaceVariant 32×4 drag handle — per Compose SheetBottomTokens.
 * The modal variant slides up over a 0.32 Scrim (`role="dialog"
 * aria-modal`); the standard variant is a labelled `region` without a scrim.
 * Escape closes either (the standard one while focus is inside it).
 *
 * By default the sheet opens at full height and the drag handle is a close
 * button. With `skipPartiallyExpanded={false}` (Compose `SheetValue`
 * detents) it opens partially expanded — showing
 * `min(container / 2, sheet / 2)` — and the handle toggles partial /
 * expanded (`aria-expanded`).
 * Dragging snaps between hidden, partial and expanded: past 56px from the
 * starting detent, or a fling faster than 125px/s, moves to the next detent
 * (Compose thresholds); reaching hidden calls `onClose(event, 'drag')`.
 *
 * A modal sheet mounted with `open` slides in like one opened later. Initial
 * focus (modal): an element React's `autoFocus` focused inside it, else the
 * element marked `data-autofocus`, else the first tabbable element.
 * `autoFocus` only runs when its element mounts, so for content rendered
 * while the sheet is closed mark the target with `data-autofocus` instead.
 */
export const BottomSheet = forwardRef<HTMLDivElement, BottomSheetProps>(
  function BottomSheet(
    {
      variant = 'modal',
      open,
      onClose,
      expanded: expandedProp,
      defaultExpanded = false,
      onExpandedChange,
      skipPartiallyExpanded = true,
      showDragHandle = true,
      dragHandleLabel,
      className,
      onKeyDown,
      children,
      ...rest
    },
    ref,
  ) {
    const localeLabels = useLocaleLabels('BottomSheet')
    const isModal = variant !== 'standard'
    const rootRef = useRef<HTMLDivElement>(null)
    const surfaceRef = useRef<HTMLDivElement | null>(null)
    // B45: the open modal sheet paints in the top layer.
    useModalTopLayer(isModal && open, [rootRef])
    useModal({
      active: isModal && open,
      rootRef,
      surfaceRef,
      onEscape: (event) => onClose?.(event, 'escapeKeyDown'),
    })

    const [expandedState, setExpandedState, isControlled] = useControllableState({
      value: expandedProp,
      defaultValue: defaultExpanded,
      name: 'BottomSheet',
      state: 'expanded',
      onChange: onExpandedChange,
    })
    const hasPartial = !skipPartiallyExpanded
    const isExpanded = !hasPartial || expandedState

    // An uncontrolled sheet reopens at its initial detent (Compose `show()`
    // targets PartiallyExpanded). Reset while closed, where the detent is
    // not visible (the closed transform wins).
    const { current: initialExpanded } = useRef(defaultExpanded)
    const wasOpen = useRef(open)
    useEffect(() => {
      if (wasOpen.current && !open && !isControlled && expandedState !== initialExpanded) {
        setExpandedState(initialExpanded)
      }
      wasOpen.current = open
    }, [open, isControlled, expandedState, initialExpanded, setExpandedState])

    // The sheet has no title slot, so default the accessible name (consumer
    // aria props win) — Compose sets a "Bottom Sheet" paneTitle.
    const restAriaLabel = (rest as Record<string, unknown>)['aria-label'] as string | undefined
    const restLabelledby = (rest as Record<string, unknown>)['aria-labelledby'] as
      | string
      | undefined

    // --- Drag between detents ---------------------------------------------
    const drag = useRef<{
      pointerId: number
      startY: number
      startDetent: Detent
      anchors: Array<{ detent: Detent; offset: number }>
      sheetHeight: number
      lastDelta: number
      samples: Array<{ t: number; y: number }>
    } | null>(null)
    const wasDrag = useRef(false)

    const setSheetDragStyle = (offset: number | null) => {
      const sheet = surfaceRef.current
      if (!sheet) return
      if (offset == null) {
        sheet.style.transform = ''
        sheet.style.transition = ''
      } else {
        sheet.style.transition = 'none'
        sheet.style.transform = `translateY(${offset}px)`
      }
    }

    const onHandlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
      if (!open || (event.pointerType === 'mouse' && event.button !== 0)) return
      // A new gesture starts clean: a stale flag must not swallow its click.
      wasDrag.current = false
      const sheetHeight = surfaceRef.current?.offsetHeight ?? 0
      const fullHeight = rootRef.current?.clientHeight ?? 0
      drag.current = {
        pointerId: event.pointerId,
        startY: event.clientY,
        startDetent: isExpanded ? 'expanded' : 'partial',
        anchors: detentOffsets(sheetHeight, fullHeight, hasPartial),
        sheetHeight,
        lastDelta: 0,
        samples: [{ t: Date.now(), y: event.clientY }],
      }
      event.currentTarget.setPointerCapture?.(event.pointerId)
    }

    const positionFor = (state: NonNullable<typeof drag.current>, delta: number) => {
      const start = state.anchors.find((a) => a.detent === state.startDetent)?.offset ?? 0
      return Math.min(state.sheetHeight, Math.max(0, start + delta))
    }

    const onHandlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
      const state = drag.current
      if (!state || event.pointerId !== state.pointerId) return
      state.lastDelta = event.clientY - state.startY
      state.samples.push({ t: Date.now(), y: event.clientY })
      // Bound the buffer; the release prunes precisely.
      if (state.samples.length > 20) state.samples.shift()
      setSheetDragStyle(positionFor(state, state.lastDelta))
    }

    const endDrag = (event: PointerEvent<HTMLButtonElement>, cancelled: boolean) => {
      const state = drag.current
      if (!state || event.pointerId !== state.pointerId) return
      drag.current = null

      setSheetDragStyle(null) // settles at the resting detent via the CSS transition
      if (cancelled) {
        // No click follows a cancelled pointer, so nothing to suppress.
        wasDrag.current = false
        return
      }
      // Measure up to the release itself: a fling followed by a hold is stale.
      const velocity = releaseVelocity([...state.samples, { t: Date.now(), y: event.clientY }])
      const target = settleTarget(
        state.anchors,
        state.startDetent,
        positionFor(state, state.lastDelta),
        velocity,
      )
      if (target === 'hidden') {
        onClose?.(event, 'drag')
      } else if (target !== state.startDetent) {
        setExpandedState(target === 'expanded')
      }
      // Remember whether this gesture was a real drag so the trailing click
      // event (fired after pointerup) doesn't also act.
      wasDrag.current = Math.abs(state.lastDelta) > TAP_SLOP_PX
    }

    const onHandleClick = (event: MouseEvent<HTMLButtonElement>) => {
      if (wasDrag.current) {
        wasDrag.current = false
        return
      }
      if (hasPartial) setExpandedState(!isExpanded)
      else onClose?.(event, 'closeButton')
    }

    // The standard sheet has no modal Escape handler (useModal is off), so it
    // closes on Escape while focus is inside it.
    const onSurfaceKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event)
      if (!isModal && open && event.key === 'Escape' && !event.defaultPrevented) {
        onClose?.(event, 'escapeKeyDown')
      }
    }

    return (
      <div
        ref={rootRef}
        className={styles.root}
        data-variant={variant}
        data-open={open || undefined}
        data-detent={isExpanded ? 'expanded' : 'partial'}
      >
        {isModal && (
          <div
            className={styles.scrim}
            aria-hidden="true"
            onClick={(event) => onClose?.(event, 'backdropClick')}
          />
        )}
        <div
          ref={(node) => assignRefs(node, surfaceRef, ref)}
          tabIndex={isModal ? -1 : undefined}
          {...rest}
          onKeyDown={onSurfaceKeyDown}
          role={isModal ? 'dialog' : 'region'}
          aria-modal={isModal ? true : undefined}
          aria-label={
            restLabelledby == null
              ? (restAriaLabel ?? localeLabels.fallbackLabel ?? 'Bottom sheet')
              : restAriaLabel
          }
          className={clsx(styles.sheet, className)}
        >
          {showDragHandle && (
            <div className={styles.dragHandleRow}>
              <button
                type="button"
                className={styles.dragHandleButton}
                aria-label={
                  dragHandleLabel ??
                  (hasPartial
                    ? (localeLabels.partialDragHandleLabel ?? 'Drag handle')
                    : (localeLabels.dragHandleLabel ?? 'Close'))
                }
                aria-expanded={hasPartial ? isExpanded : undefined}
                onClick={onHandleClick}
                onPointerDown={onHandlePointerDown}
                onPointerMove={onHandlePointerMove}
                onPointerUp={(event) => endDrag(event, false)}
                onPointerCancel={(event) => endDrag(event, true)}
              >
                <span className={styles.dragHandle} aria-hidden="true" />
                <FocusRing />
              </button>
            </div>
          )}
          <div className={styles.content}>{children}</div>
        </div>
      </div>
    )
  },
)
