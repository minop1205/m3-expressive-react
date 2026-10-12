'use client'

import {
  forwardRef,
  isValidElement,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEventHandler,
  type ReactNode,
  type SyntheticEvent,
} from 'react'
import clsx from 'clsx'
import { Button } from '../Button/Button'
import { IconButton } from '../IconButton/IconButton'
import { CloseIcon } from '../../internal/icons'
import styles from './Snackbar.module.css'

/** Built-in action button for {@link Snackbar}'s `action` prop. */
export interface SnackbarAction {
  /** Action button label. */
  label: string
  /** Fires when the action button is clicked. */
  onClick?: MouseEventHandler<HTMLButtonElement>
}

/**
 * Why {@link Snackbar}'s `onDismiss` fired: the dismiss (close) icon button
 * was activated, or Escape was pressed while focus was inside the snackbar.
 * Shares the `reason` vocabulary used across the library (Phase B, B7).
 */
export type SnackbarDismissReason = 'dismiss' | 'escapeKeyDown'

export interface SnackbarProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * The message text (supporting text). Keep it short and plain — m3 advises
   * against stylized text, inline links and icons in snackbars.
   */
  message: ReactNode
  /**
   * Optional single action — an `{ label, onClick }` text button (rendered as
   * an inverse-primary `Button variant="text"`) or a custom node (m3: never a
   * filled or elevated button).
   */
  action?: SnackbarAction | ReactNode
  /**
   * When provided, shows a trailing dismiss (close) icon button, and pressing
   * Escape while focus is inside the snackbar also dismisses it. Receives the
   * triggering event and the reason.
   */
  onDismiss?: (event: SyntheticEvent<HTMLElement>, reason: SnackbarDismissReason) => void
  /**
   * Places the action on its own line below the message, end-aligned — for a
   * long action label (m3 "two lines with longer action"; Compose
   * `actionOnNewLine`). Opt-in only; the layout is never chosen automatically.
   * @default false
   */
  actionOnNewLine?: boolean
  /** Accessible label of the dismiss icon button. @default 'Dismiss' */
  dismissLabel?: string
}

/**
 * Material Design 3 Snackbar (the visual bar).
 *
 * The presentational surface. For queueing, auto-dismiss timing, placement and
 * enter/exit motion, render snackbars through `SnackbarProvider` /
 * `useSnackbar()` instead of placing this component yourself.
 *
 * Standalone, it is a polite live region (`role="status"`); override `role` /
 * `aria-live` when a surrounding host already provides the live region. It
 * fills the available width up to 600dp (Compose `ContainerMaxWidth`).
 *
 * Colors follow SnackbarTokens: InverseSurface container, InverseOnSurface
 * message (BodyMedium), InversePrimary action (LabelLarge), InverseOnSurface
 * dismiss icon, corner 4dp, elevation level 3. The action is a text button
 * (40dp tall, 58dp min width, 12dp padding) and the dismiss is a standard icon
 * button (24dp icon in a 48dp area flush with the trailing edge), both with the
 * shared state layers, ripple and focus ring.
 */
export const Snackbar = forwardRef<HTMLDivElement, SnackbarProps>(
  function Snackbar(
    {
      message,
      action,
      onDismiss,
      actionOnNewLine = false,
      dismissLabel = 'Dismiss',
      onKeyDown,
      className,
      ...rest
    },
    ref,
  ) {
    let actionNode: ReactNode = null
    if (action != null) {
      actionNode = isValidElement(action) ? (
        action
      ) : (
        <Button
          variant="text"
          size="sm"
          className={styles.action}
          onClick={(action as SnackbarAction).onClick}
        >
          {(action as SnackbarAction).label}
        </Button>
      )
    }

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event)
      // m3 a11y: "Esc — Dismisses the snackbar when in focus". A parent
      // handler (e.g. the SnackbarProvider host) can opt out by calling
      // preventDefault().
      if (event.key === 'Escape' && onDismiss != null && !event.defaultPrevented) {
        event.preventDefault()
        onDismiss(event, 'escapeKeyDown')
      }
    }

    const hasActions = actionNode != null || onDismiss != null
    const newLine = actionOnNewLine && actionNode != null

    return (
      <div
        ref={ref}
        role="status"
        aria-live="polite"
        {...rest}
        onKeyDown={handleKeyDown}
        data-layout={newLine ? 'new-line' : 'one-row'}
        data-dismiss-action={onDismiss != null ? 'true' : undefined}
        className={clsx(styles.snackbar, className)}
      >
        <div className={styles.message}>{message}</div>
        {hasActions && (
          <div className={styles.actions}>
            {actionNode != null && <div className={styles.actionSlot}>{actionNode}</div>}
            {onDismiss != null && (
              <IconButton
                variant="standard"
                size="sm"
                className={styles.dismiss}
                aria-label={dismissLabel}
                icon={<CloseIcon />}
                onClick={(event) => onDismiss(event, 'dismiss')}
              />
            )}
          </div>
        )}
      </div>
    )
  },
)
