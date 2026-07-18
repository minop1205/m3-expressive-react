import {
  forwardRef,
  useEffect,
  useRef,
  type HTMLAttributes,
  type ReactNode,
} from 'react'
import clsx from 'clsx'
import { assignRefs, useModal } from '../../internal/useModal'
import styles from './BottomSheet.module.css'

export interface BottomSheetProps extends HTMLAttributes<HTMLDivElement> {
  /** Whether the sheet is shown. */
  open: boolean
  /** Called on scrim click or Escape. */
  onClose?: () => void
  /** Show the top drag handle. @default true */
  showDragHandle?: boolean
  children?: ReactNode
}

/**
 * Material Design 3 Modal bottom sheet.
 *
 * SurfaceContainerLow container, 28dp top corners, elevation 1, max-width
 * 640dp, an OnSurfaceVariant 32×4 drag handle — per Compose SheetBottomTokens.
 * Slides up over a 0.32 Scrim; role="dialog" aria-modal, Escape-to-close.
 */
export const BottomSheet = forwardRef<HTMLDivElement, BottomSheetProps>(
  function BottomSheet(
    { open, onClose, showDragHandle = true, className, children, ...rest },
    ref,
  ) {
    const rootRef = useRef<HTMLDivElement>(null)
    const surfaceRef = useRef<HTMLDivElement | null>(null)
    useModal({ active: open, rootRef, surfaceRef })

    useEffect(() => {
      if (!open) return
      const handle = (event: globalThis.KeyboardEvent) => {
        if (event.key === 'Escape') onClose?.()
      }
      document.addEventListener('keydown', handle)
      return () => document.removeEventListener('keydown', handle)
    }, [open, onClose])

    return (
      <div ref={rootRef} className={styles.root} data-open={open || undefined}>
        <div className={styles.scrim} aria-hidden="true" onClick={onClose} />
        <div
          ref={(node) => assignRefs(node, surfaceRef, ref)}
          tabIndex={-1}
          {...rest}
          role="dialog"
          aria-modal="true"
          className={clsx(styles.sheet, className)}
        >
          {showDragHandle && (
            <div className={styles.dragHandleRow} aria-hidden="true">
              <span className={styles.dragHandle} />
            </div>
          )}
          <div className={styles.content}>{children}</div>
        </div>
      </div>
    )
  },
)
