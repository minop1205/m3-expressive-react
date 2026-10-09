'use client'

import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from 'react'
import clsx from 'clsx'
import { FocusRing } from '../../primitives/FocusRing/FocusRing'
import { assignRefs, useModal } from '../../internal/useModal'
import styles from './NavigationDrawer.module.css'

export type NavigationDrawerVariant = 'standard' | 'modal'

interface DrawerContextValue {
  value?: string
  onChange?: (event: MouseEvent<HTMLButtonElement>, value: string) => void
}

const DrawerContext = createContext<DrawerContextValue>({})

export interface NavigationDrawerProps
  extends Omit<HTMLAttributes<HTMLElement>, 'onChange'> {
  /** Standard (inline) or modal (overlay + scrim). @default 'standard' */
  variant?: NavigationDrawerVariant
  /** Modal open state. */
  open?: boolean
  /** Called when the modal scrim is clicked or Escape is pressed. */
  onClose?: () => void
  /** Selected destination value (shared with items). */
  value?: string
  /** Fires with the triggering event and the newly selected destination value. */
  onChange?: (event: MouseEvent<HTMLButtonElement>, value: string) => void
  children?: ReactNode
}

/**
 * Material Design 3 Navigation drawer (standard or modal).
 *
 * 360dp SurfaceContainerLow (modal) / Surface (standard) panel, rounded 16dp on
 * the trailing edge. Items are 56dp full pills (CornerFull): active =
 * SecondaryContainer / OnSecondaryContainer, inactive transparent /
 * OnSurfaceVariant, LabelLarge — per Compose NavigationDrawerTokens. Modal adds
 * a 0.32 Scrim, Escape-to-close, and `role="dialog" aria-modal`.
 */
export const NavigationDrawer = forwardRef<HTMLElement, NavigationDrawerProps>(
  function NavigationDrawer(
    {
      variant = 'standard',
      open = false,
      onClose,
      value,
      onChange,
      className,
      children,
      ...rest
    },
    ref,
  ) {
    const rootRef = useRef<HTMLDivElement>(null)
    const surfaceRef = useRef<HTMLElement | null>(null)
    useModal({ active: variant === 'modal' && open, rootRef, surfaceRef })

    // Default the accessible name for both the modal dialog and the standard
    // <aside> landmark (Compose sets a "Navigation Menu" paneTitle).
    const restAriaLabel = (rest as Record<string, unknown>)['aria-label'] as string | undefined
    const restLabelledby = (rest as Record<string, unknown>)['aria-labelledby'] as
      | string
      | undefined

    const panel = (
      <aside
        ref={(node) => assignRefs(node, surfaceRef, ref)}
        tabIndex={variant === 'modal' ? -1 : undefined}
        {...rest}
        data-variant={variant}
        className={clsx(styles.drawer, className)}
        role={variant === 'modal' ? 'dialog' : undefined}
        aria-modal={variant === 'modal' ? true : undefined}
        aria-label={restLabelledby == null ? (restAriaLabel ?? 'Navigation') : restAriaLabel}
      >
        {children}
      </aside>
    )

    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      if (variant !== 'modal' || !open) return
      const handle = (event: globalThis.KeyboardEvent) => {
        if (event.key === 'Escape') onClose?.()
      }
      document.addEventListener('keydown', handle)
      return () => document.removeEventListener('keydown', handle)
    }, [variant, open, onClose])

    if (variant !== 'modal') {
      return <DrawerContext.Provider value={{ value, onChange }}>{panel}</DrawerContext.Provider>
    }

    return (
      <DrawerContext.Provider value={{ value, onChange }}>
        <div ref={rootRef} className={styles.modalRoot} data-open={open || undefined}>
          <div className={styles.scrim} aria-hidden="true" onClick={onClose} />
          {panel}
        </div>
      </DrawerContext.Provider>
    )
  },
)

export interface NavigationDrawerItemProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'value'> {
  value: string
  icon?: ReactNode
  label: ReactNode
  badge?: ReactNode
}

/** A destination inside a `NavigationDrawer`. */
export const NavigationDrawerItem = forwardRef<HTMLButtonElement, NavigationDrawerItemProps>(
  function NavigationDrawerItem(
    { value, icon, label, badge, disabled = false, className, onClick, ...rest },
    ref,
  ) {
    const ctx = useContext(DrawerContext)
    const selected = ctx.value === value

    return (
      <button
        ref={ref}
        {...rest}
        type="button"
        disabled={disabled}
        aria-current={selected ? 'page' : undefined}
        data-selected={selected || undefined}
        className={clsx(styles.item, className)}
        onClick={(event) => {
          onClick?.(event)
          ctx.onChange?.(event, value)
        }}
      >
        {icon != null && (
          <span className={styles.icon} aria-hidden="true">
            {icon}
          </span>
        )}
        <span className={styles.label}>{label}</span>
        {badge != null && <span className={styles.badge}>{badge}</span>}
        {!disabled && <FocusRing />}
      </button>
    )
  },
)
