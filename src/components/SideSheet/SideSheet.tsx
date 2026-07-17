import {
  forwardRef,
  useEffect,
  useRef,
  type HTMLAttributes,
  type ReactNode,
} from 'react'
import clsx from 'clsx'
import { IconButton } from '../IconButton/IconButton'
import { Divider } from '../Divider/Divider'
import { assignRefs, useModal } from '../../internal/useModal'
import styles from './SideSheet.module.css'

export type SideSheetVariant = 'standard' | 'modal'
export type SideSheetAnchor = 'left' | 'right'

const CloseIcon = (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
    <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
  </svg>
)

const BackIcon = (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20z" />
  </svg>
)

export interface SideSheetProps extends HTMLAttributes<HTMLDivElement> {
  /** Standard (inline) or modal (overlay + scrim). @default 'standard' */
  variant?: SideSheetVariant
  /** Edge the sheet is anchored to. @default 'right' */
  anchor?: SideSheetAnchor
  /** Whether the sheet is shown. @default true */
  open?: boolean
  /** Called on close-button click, scrim click, or Escape. */
  onClose?: () => void
  /** Title shown in the header. */
  headline?: ReactNode
  /** Show a leading back button (modal). @default false */
  showBackButton?: boolean
  /** Called when the back button is clicked. */
  onBack?: () => void
  /** Show the trailing close button. @default true */
  showCloseButton?: boolean
  /** Show a divider between the header and content. @default false */
  showDivider?: boolean
  /** Accessible label for the close button. @default 'Close' */
  closeLabel?: string
  /** Accessible label for the back button. @default 'Back' */
  backLabel?: string
  /** Bottom action bar content (left-aligned buttons). */
  actions?: ReactNode
  children?: ReactNode
}

/**
 * Material Design 3 Side sheet (standard or modal).
 *
 * A 400dp max-width panel anchored to the trailing (or leading) edge. Standard
 * = inline Surface panel; modal = SurfaceContainerLow over a 0.32 Scrim with
 * `role="dialog" aria-modal` and Escape-to-close — per m3.material.io specs.
 * Header uses 24dp side padding (16dp with a back icon), 12dp gaps, a Title
 * Large headline, and optional back/close IconButtons. Bottom actions are a
 * 72dp left-aligned bar.
 */
export const SideSheet = forwardRef<HTMLDivElement, SideSheetProps>(
  function SideSheet(
    {
      variant = 'standard',
      anchor = 'right',
      open = true,
      onClose,
      headline,
      showBackButton = false,
      onBack,
      showCloseButton = true,
      showDivider = false,
      closeLabel = 'Close',
      backLabel = 'Back',
      actions,
      className,
      children,
      ...rest
    },
    ref,
  ) {
    const rootRef = useRef<HTMLDivElement>(null)
    const surfaceRef = useRef<HTMLDivElement | null>(null)
    useModal({ active: variant === 'modal' && open, rootRef, surfaceRef })

    useEffect(() => {
      if (variant !== 'modal' || !open) return
      const handle = (event: globalThis.KeyboardEvent) => {
        if (event.key === 'Escape') onClose?.()
      }
      document.addEventListener('keydown', handle)
      return () => document.removeEventListener('keydown', handle)
    }, [variant, open, onClose])

    const hasHeader = showBackButton || headline != null || showCloseButton

    const panel = (
      <div
        ref={(node) => assignRefs(node, surfaceRef, ref)}
        tabIndex={variant === 'modal' ? -1 : undefined}
        {...rest}
        data-variant={variant}
        data-anchor={anchor}
        data-has-back={showBackButton || undefined}
        className={clsx(styles.sheet, className)}
        role={variant === 'modal' ? 'dialog' : 'complementary'}
        aria-modal={variant === 'modal' ? true : undefined}
      >
        {hasHeader && (
          <div className={styles.header}>
            {showBackButton && (
              <IconButton
                variant="standard"
                icon={BackIcon}
                aria-label={backLabel}
                onClick={onBack}
                className={styles.headerButton}
              />
            )}
            {headline != null && <h2 className={styles.headline}>{headline}</h2>}
            {showCloseButton && (
              <IconButton
                variant="standard"
                icon={CloseIcon}
                aria-label={closeLabel}
                onClick={onClose}
                className={styles.headerButton}
              />
            )}
          </div>
        )}
        {showDivider && <Divider className={styles.divider} />}
        <div className={styles.content}>{children}</div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    )

    if (variant !== 'modal') {
      return (
        <div className={styles.standardRoot} data-open={open || undefined} data-anchor={anchor}>
          {panel}
        </div>
      )
    }

    return (
      <div
        ref={rootRef}
        className={styles.modalRoot}
        data-open={open || undefined}
        data-anchor={anchor}
      >
        <div className={styles.scrim} aria-hidden="true" onClick={onClose} />
        {panel}
      </div>
    )
  },
)
