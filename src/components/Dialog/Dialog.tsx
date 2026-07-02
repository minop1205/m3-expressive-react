import {
  forwardRef,
  useEffect,
  useId,
  type HTMLAttributes,
  type ReactNode,
} from 'react'
import clsx from 'clsx'
import styles from './Dialog.module.css'

export interface DialogProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Whether the dialog is shown. */
  open: boolean
  /** Called on scrim click or Escape. */
  onClose?: () => void
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
}

const CloseIcon = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
  </svg>
)

/**
 * Material Design 3 Dialog (basic / alert).
 *
 * SurfaceContainerHigh container, 28dp corners, elevation 3, 280–560dp wide,
 * 24dp padding; Secondary icon, OnSurface HeadlineSmall title, OnSurfaceVariant
 * BodyMedium text — per Compose DialogTokens. Modal with a 0.32 Scrim,
 * role="dialog" aria-modal, and Escape-to-close.
 */
export const Dialog = forwardRef<HTMLDivElement, DialogProps>(function Dialog(
  { open, onClose, icon, title, actions, fullScreen = false, className, children, ...rest },
  ref,
) {
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const handle = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [open, onClose])

  return (
    <div
      className={styles.root}
      data-open={open || undefined}
      data-full-screen={fullScreen || undefined}
    >
      {!fullScreen && (
        <div className={styles.scrim} aria-hidden="true" onClick={onClose} />
      )}
      <div
        ref={ref}
        {...rest}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title != null ? titleId : undefined}
        data-has-icon={icon != null || undefined}
        data-full-screen={fullScreen || undefined}
        className={clsx(styles.dialog, className)}
      >
        {fullScreen ? (
          <>
            <header className={styles.fsHeader}>
              <button
                type="button"
                className={styles.fsClose}
                aria-label="Close"
                onClick={onClose}
              >
                {CloseIcon}
              </button>
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
