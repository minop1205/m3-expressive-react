import {
  forwardRef,
  isValidElement,
  type HTMLAttributes,
  type MouseEventHandler,
  type ReactNode,
} from 'react'
import clsx from 'clsx'
import { CloseIcon } from '../../internal/icons'
import styles from './Snackbar.module.css'

export interface SnackbarAction {
  label: string
  onClick?: MouseEventHandler<HTMLButtonElement>
}

export interface SnackbarProps extends HTMLAttributes<HTMLDivElement> {
  /** The message text (supporting text). */
  message: ReactNode
  /** Optional action — an `{ label, onClick }` button or a custom node. */
  action?: SnackbarAction | ReactNode
  /** When provided, shows a trailing dismiss (close) icon button. */
  onDismiss?: () => void
}


/**
 * Material Design 3 Snackbar (the visual bar).
 *
 * Presentational surface — pair it with your own positioning / auto-hide logic.
 * Colors follow SnackbarTokens: InverseSurface container, InverseOnSurface
 * message (BodyMedium), InversePrimary action (LabelLarge), corner 4dp,
 * elevation level 3.
 */
export const Snackbar = forwardRef<HTMLDivElement, SnackbarProps>(
  function Snackbar({ message, action, onDismiss, className, ...rest }, ref) {
    let actionNode: ReactNode = null
    if (action != null) {
      actionNode = isValidElement(action) ? (
        action
      ) : (
        <button
          type="button"
          className={styles.action}
          onClick={(action as SnackbarAction).onClick}
        >
          {(action as SnackbarAction).label}
        </button>
      )
    }

    return (
      <div
        ref={ref}
        {...rest}
        role="status"
        aria-live="polite"
        className={clsx(styles.snackbar, className)}
      >
        <div className={styles.message}>{message}</div>
        {actionNode != null && <div className={styles.actionSlot}>{actionNode}</div>}
        {onDismiss != null && (
          <button
            type="button"
            className={styles.dismiss}
            aria-label="Dismiss"
            onClick={onDismiss}
          >
            <CloseIcon />
          </button>
        )}
      </div>
    )
  },
)
