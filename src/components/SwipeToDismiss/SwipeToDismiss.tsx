import {
  forwardRef,
  useRef,
  useState,
  type HTMLAttributes,
  type PointerEvent,
  type ReactNode,
} from 'react'
import clsx from 'clsx'
import styles from './SwipeToDismiss.module.css'

export type SwipeDismissDirection = 'startToEnd' | 'endToStart'

export interface SwipeToDismissProps extends HTMLAttributes<HTMLDivElement> {
  /** Fires when the row is swiped past the threshold in an enabled direction. */
  onDismiss?: (direction: SwipeDismissDirection) => void
  /** Content revealed behind the row while swiping. */
  background?: ReactNode
  /** Allow start→end (left→right) dismissal. @default true */
  enableStartToEnd?: boolean
  /** Allow end→start (right→left) dismissal. @default true */
  enableEndToStart?: boolean
  /** Distance (px) past which release dismisses. @default 56 */
  threshold?: number
  children?: ReactNode
}

/**
 * Material Design 3 Swipe-to-dismiss row.
 *
 * A pointer-draggable row that dismisses when released past the threshold
 * (Compose default 56dp), in either direction by default. The dismissed
 * direction (`startToEnd` / `endToStart`) is reported via `onDismiss`; the
 * revealed `background` is entirely caller-provided (Compose ships no color).
 */
export const SwipeToDismiss = forwardRef<HTMLDivElement, SwipeToDismissProps>(
  function SwipeToDismiss(
    {
      onDismiss,
      background,
      enableStartToEnd = true,
      enableEndToStart = true,
      threshold = 56,
      className,
      children,
      ...rest
    },
    ref,
  ) {
    const [offset, setOffset] = useState(0)
    const [dragging, setDragging] = useState(false)
    const draggingRef = useRef(false)
    const startX = useRef(0)
    const offsetRef = useRef(0)
    const contentRef = useRef<HTMLDivElement>(null)

    const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return
      startX.current = event.clientX
      offsetRef.current = 0
      draggingRef.current = true
      setDragging(true)
      try {
        event.currentTarget.setPointerCapture(event.pointerId)
      } catch {
        /* not supported (e.g. jsdom) */
      }
    }

    const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return
      let dx = event.clientX - startX.current
      if (dx > 0 && !enableStartToEnd) dx = 0
      if (dx < 0 && !enableEndToStart) dx = 0
      offsetRef.current = dx
      setOffset(dx)
    }

    const endDrag = () => {
      if (!draggingRef.current) return
      draggingRef.current = false
      setDragging(false)
      const width = contentRef.current?.offsetWidth || 0
      const dx = offsetRef.current
      if (dx > threshold && enableStartToEnd) {
        setOffset(width || dx)
        onDismiss?.('startToEnd')
      } else if (dx < -threshold && enableEndToStart) {
        setOffset(-(width || Math.abs(dx)))
        onDismiss?.('endToStart')
      } else {
        setOffset(0)
      }
    }

    return (
      <div ref={ref} {...rest} className={clsx(styles.root, className)}>
        {background != null && (
          <div className={styles.background} aria-hidden="true">
            {background}
          </div>
        )}
        <div
          ref={contentRef}
          className={styles.content}
          data-dragging={dragging || undefined}
          style={{ transform: `translateX(${offset}px)` }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          {children}
        </div>
      </div>
    )
  },
)
