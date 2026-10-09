'use client'

import {
  forwardRef,
  useEffect,
  useRef,
  type HTMLAttributes,
  type PointerEvent,
  type ReactNode,
} from 'react'
import clsx from 'clsx'
import { assignRefs, useModal } from '../../internal/useModal'
import { FocusRing } from '../../primitives/FocusRing/FocusRing'
import styles from './BottomSheet.module.css'

/** Drag distance beyond which release dismisses (Compose PositionalThreshold). */
const DISMISS_DISTANCE_PX = 56
/** Downward fling velocity beyond which release dismisses (Compose VelocityThreshold). */
const DISMISS_VELOCITY_PX_S = 125
/** Velocity samples older than this are discarded. */
const VELOCITY_WINDOW_MS = 100
/** Pointer movement below this is treated as a tap, not a drag. */
const TAP_SLOP_PX = 5

export interface BottomSheetProps extends HTMLAttributes<HTMLDivElement> {
  /** Whether the sheet is shown. */
  open: boolean
  /** Called on scrim click, Escape, drag-to-dismiss, or the drag handle. */
  onClose?: () => void
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
    useModal({ active: open, rootRef, surfaceRef })

    // The sheet has no title slot, so default the accessible name (consumer
    // aria props win) — Compose sets a "Bottom Sheet" paneTitle.
    const restAriaLabel = (rest as Record<string, unknown>)['aria-label'] as string | undefined
    const restLabelledby = (rest as Record<string, unknown>)['aria-labelledby'] as
      | string
      | undefined

    useEffect(() => {
      if (!open) return
      const handle = (event: globalThis.KeyboardEvent) => {
        if (event.key === 'Escape') onClose?.()
      }
      document.addEventListener('keydown', handle)
      return () => document.removeEventListener('keydown', handle)
    }, [open, onClose])

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
      state.samples = state.samples.filter((s) => now - s.t <= VELOCITY_WINDOW_MS)
      setSheetDragStyle(distance)
    }

    const endDrag = (event: PointerEvent<HTMLButtonElement>, cancelled: boolean) => {
      const state = drag.current
      if (!state || event.pointerId !== state.pointerId) return
      drag.current = null

      const first = state.samples[0]
      const last = state.samples[state.samples.length - 1]
      const dt = last.t - first.t
      const velocity = dt > 0 ? ((last.y - first.y) / dt) * 1000 : 0

      setSheetDragStyle(null) // settles back via the sheet's own transition
      if (
        !cancelled &&
        (state.lastDistance > DISMISS_DISTANCE_PX || velocity > DISMISS_VELOCITY_PX_S)
      ) {
        onClose?.()
      }
      // Remember whether this gesture was a real drag so the trailing click
      // event (fired after pointerup) doesn't also dismiss.
      wasDrag.current = state.lastDistance > TAP_SLOP_PX
    }

    const wasDrag = useRef(false)

    const onHandleClick = () => {
      if (wasDrag.current) {
        wasDrag.current = false
        return
      }
      onClose?.()
    }

    return (
      <div ref={rootRef} className={styles.root} data-open={open || undefined}>
        <div className={styles.scrim} aria-hidden="true" onClick={onClose} />
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
