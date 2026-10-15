'use client'

import {
  forwardRef,
  useId,
  useRef,
  type HTMLAttributes,
  type ReactNode,
} from 'react'
import clsx from 'clsx'
import { CloseIcon } from '../../internal/icons'
import type { ModalCloseEvent } from '../../internal/closeReason'
import { assignRefs, useModal } from '../../internal/useModal'
import { useModalTopLayer } from '../../internal/useTopLayer'
import { IconButton } from '../IconButton/IconButton'
import styles from './Dialog.module.css'

/**
 * Why the dialog asked to close (ruling B7 vocabulary): Escape, a scrim
 * click, or the full-screen close button.
 */
export type DialogCloseReason = 'escapeKeyDown' | 'backdropClick' | 'closeButton'

export interface DialogProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Whether the dialog is shown. */
  open: boolean
  /**
   * Called on scrim click, Escape, or the full-screen close button, with the
   * triggering event and the `reason`.
   */
  onClose?: (event: ModalCloseEvent, reason: DialogCloseReason) => void
  /** Optional hero icon (Secondary, 24dp, centers the title). */
  icon?: ReactNode
  /** Dialog headline. */
  title?: ReactNode
  /** Trailing action buttons (typically text Buttons). */
  actions?: ReactNode
  /** Full-screen dialog: a top bar (close + title + action) over full-bleed content. */
  fullScreen?: boolean
  /** Supporting content / body. */
  children?: ReactNode
  /** Accessible label of the full-screen close button. @default 'Close' */
  closeLabel?: string
}


/**
 * Material Design 3 Dialog (basic / alert).
 *
 * SurfaceContainerHigh container, 28dp corners, elevation 3, 280–560dp wide,
 * 24dp padding; Secondary icon, OnSurface HeadlineSmall title, OnSurfaceVariant
 * BodyMedium text — per Compose DialogTokens. Modal with a 0.32 Scrim,
 * role="dialog" aria-modal, and Escape-to-close.
 *
 * - Long content scrolls inside the body only; the icon, title and actions
 *   (the full-screen top bar) stay fixed (ruling B46).
 * - Width: set `--md-dialog-container-min-width` / `--md-dialog-container-max-width`
 *   (default `280px` / `560px` — the m3 basic dialog range; other values are
 *   outside the spec) on the dialog (`style` / `className`) or an ancestor.
 *   Not used by `fullScreen`.
 * - While open, the dialog is drawn in the browser top layer, above popups
 *   opened before it, such as the Menu it was opened from (ruling B45).
 */
export const Dialog = forwardRef<HTMLDivElement, DialogProps>(function Dialog(
  { open, onClose, icon, title, actions, fullScreen = false, closeLabel = 'Close', className, children, ...rest },
  ref,
) {
  const titleId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const surfaceRef = useRef<HTMLDivElement | null>(null)
  // B45: the open dialog paints in the top layer, above popups opened before it.
  useModalTopLayer(open, [rootRef])
  useModal({
    active: open,
    rootRef,
    surfaceRef,
    onEscape: (event) => onClose?.(event, 'escapeKeyDown'),
  })

  // Never ship an unnamed dialog (Compose always sets a paneTitle): the title
  // labels it when present, consumer-supplied aria props win, and a generic
  // fallback covers the rest.
  const restAriaLabel = (rest as Record<string, unknown>)['aria-label'] as string | undefined
  const restLabelledby = (rest as Record<string, unknown>)['aria-labelledby'] as
    | string
    | undefined

  return (
    <div
      ref={rootRef}
      className={styles.root}
      data-open={open || undefined}
      data-full-screen={fullScreen || undefined}
    >
      {!fullScreen && (
        <div
          className={styles.scrim}
          aria-hidden="true"
          onClick={(event) => onClose?.(event, 'backdropClick')}
        />
      )}
      <div
        ref={(node) => assignRefs(node, surfaceRef, ref)}
        tabIndex={-1}
        {...rest}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title != null ? titleId : restLabelledby}
        aria-label={
          title == null && restLabelledby == null ? (restAriaLabel ?? 'Dialog') : restAriaLabel
        }
        data-has-icon={icon != null || undefined}
        data-full-screen={fullScreen || undefined}
        className={clsx(styles.dialog, className)}
      >
        {fullScreen ? (
          <>
            <header className={styles.fsHeader}>
              <IconButton
                variant="standard"
                icon={<CloseIcon />}
                aria-label={closeLabel}
                onClick={(event) => onClose?.(event, 'closeButton')}
              />
              {title != null && (
                <h2 id={titleId} className={styles.fsTitle}>
                  {title}
                </h2>
              )}
              {actions != null && <div className={styles.fsActions}>{actions}</div>}
            </header>
            <div className={styles.fsBody}>{children}</div>
          </>
        ) : (
          <>
            {icon != null && (
              <div className={styles.icon} aria-hidden="true">
                {icon}
              </div>
            )}
            {title != null && (
              <h2 id={titleId} className={styles.title}>
                {title}
              </h2>
            )}
            {children != null && <div className={styles.body}>{children}</div>}
            {actions != null && <div className={styles.actions}>{actions}</div>}
          </>
        )}
      </div>
    </div>
  )
})
