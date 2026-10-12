'use client'

import {
  forwardRef,
  useRef,
  type HTMLAttributes,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'
import clsx from 'clsx'
import type { ModalCloseEvent } from '../../internal/closeReason'
import { assignRefs, useModal } from '../../internal/useModal'
import { FocusRing } from '../../primitives/FocusRing/FocusRing'
import styles from './BottomSheet.module.css'

/** Drag distance beyond which release dismisses (Compose PositionalThreshold). */
const DISMISS_DISTANCE_PX = 56
/** Downward fling velocity beyond which release dismisses (Compose VelocityThreshold). */
const DISMISS_VELOCITY_PX_S = 125
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

/**
 * Why the sheet asked to close (ruling B7 vocabulary): Escape, a scrim
 * click, the drag handle activated as a button (`'closeButton'`), or a drag /
 * fling past the threshold (`'drag'`).
 */
export type BottomSheetCloseReason = 'escapeKeyDown' | 'backdropClick' | 'closeButton' | 'drag'

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

export interface BottomSheetProps extends HTMLAttributes<HTMLDivElement> {
  /** Whether the sheet is shown. */
  open: boolean
  /**
   * Called on scrim click, Escape, drag-to-dismiss, or the drag handle, with
   * the triggering event and the `reason`.
   */
  onClose?: (event: ModalCloseEvent, reason: BottomSheetCloseReason) => void
  /** Show the top drag handle. @default true */
  showDragHandle?: boolean
  /** Accessible label for the drag handle button. @default 'Close' */
  dragHandleLabel?: string
  children?: ReactNode
}

/**
 * Material Design 3 Modal bottom sheet.
 *
 * SurfaceContainerLow container, 28dp top corners, elevation 1, max-width
 * 640dp, an OnSurfaceVariant 32×4 drag handle — per Compose SheetBottomTokens.
 * Slides up over a 0.32 Scrim; role="dialog" aria-modal, Escape-to-close.
 *
 * The drag handle is an accessible button (click/Enter dismisses) and the
 * pointer can drag the sheet down: release past 56px, or a downward fling
 * faster than 125px/s, dismisses; otherwise the sheet settles back (Compose
 * ModalBottomSheet thresholds).
 */
export const BottomSheet = forwardRef<HTMLDivElement, BottomSheetProps>(
  function BottomSheet(
    {
      open,
      onClose,
      showDragHandle = true,
      dragHandleLabel = 'Close',
      className,
      children,
      ...rest
    },
    ref,
  ) {
    const rootRef = useRef<HTMLDivElement>(null)
    const surfaceRef = useRef<HTMLDivElement | null>(null)
    useModal({
      active: open,
      rootRef,
      surfaceRef,
      onEscape: (event) => onClose?.(event, 'escapeKeyDown'),
    })

    // The sheet has no title slot, so default the accessible name (consumer
    // aria props win) — Compose sets a "Bottom Sheet" paneTitle.
    const restAriaLabel = (rest as Record<string, unknown>)['aria-label'] as string | undefined
    const restLabelledby = (rest as Record<string, unknown>)['aria-labelledby'] as
      | string
      | undefined

    // --- Drag-to-dismiss -------------------------------------------------
    const drag = useRef<{
      pointerId: number
      startY: number
      lastDistance: number
      samples: Array<{ t: number; y: number }>
    } | null>(null)

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
      drag.current = {
        pointerId: event.pointerId,
        startY: event.clientY,
        lastDistance: 0,
        samples: [{ t: Date.now(), y: event.clientY }],
      }
      event.currentTarget.setPointerCapture?.(event.pointerId)
    }

    const onHandlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
      const state = drag.current
      if (!state || event.pointerId !== state.pointerId) return
      const distance = Math.max(0, event.clientY - state.startY)
      state.lastDistance = distance
      const now = Date.now()
      state.samples.push({ t: now, y: event.clientY })
      // Bound the buffer; the release prunes precisely.
      if (state.samples.length > 20) state.samples.shift()
      setSheetDragStyle(distance)
    }

    const endDrag = (event: PointerEvent<HTMLButtonElement>, cancelled: boolean) => {
      const state = drag.current
      if (!state || event.pointerId !== state.pointerId) return
      drag.current = null

      setSheetDragStyle(null) // settles back via the sheet's own transition
      if (cancelled) {
        // No click follows a cancelled pointer, so nothing to suppress.
        wasDrag.current = false
        return
      }
      // Measure up to the release itself: a fling followed by a hold is stale.
      const velocity = releaseVelocity([...state.samples, { t: Date.now(), y: event.clientY }])
      if (state.lastDistance > DISMISS_DISTANCE_PX || velocity > DISMISS_VELOCITY_PX_S) {
        onClose?.(event, 'drag')
      }
      // Remember whether this gesture was a real drag so the trailing click
      // event (fired after pointerup) doesn't also dismiss.
      wasDrag.current = state.lastDistance > TAP_SLOP_PX
    }

    const wasDrag = useRef(false)

    const onHandleClick = (event: MouseEvent<HTMLButtonElement>) => {
      if (wasDrag.current) {
        wasDrag.current = false
        return
      }
      onClose?.(event, 'closeButton')
    }

    return (
      <div ref={rootRef} className={styles.root} data-open={open || undefined}>
        <div
          className={styles.scrim}
          aria-hidden="true"
          onClick={(event) => onClose?.(event, 'backdropClick')}
        />
        <div
          ref={(node) => assignRefs(node, surfaceRef, ref)}
          tabIndex={-1}
          {...rest}
          role="dialog"
          aria-modal="true"
          aria-label={restLabelledby == null ? (restAriaLabel ?? 'Bottom sheet') : restAriaLabel}
          className={clsx(styles.sheet, className)}
        >
          {showDragHandle && (
            <div className={styles.dragHandleRow}>
              <button
                type="button"
                className={styles.dragHandleButton}
                aria-label={dragHandleLabel}
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
