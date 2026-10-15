'use client'

import {
  createContext,
  forwardRef,
  useContext,
  useRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react'
import clsx from 'clsx'
import { useIsoLayoutEffect } from '../../internal/useIsoLayoutEffect'
import { FocusRing } from '../../primitives/FocusRing/FocusRing'
import type { ModalCloseEvent } from '../../internal/closeReason'
import { assignRefs, useModal } from '../../internal/useModal'
import { useModalTopLayer } from '../../internal/useTopLayer'
import { useControllableState } from '../../internal/useControllableState'
import styles from './NavigationDrawer.module.css'
import { useLocaleLabels } from '../../internal/locale'

export type NavigationDrawerVariant = 'standard' | 'modal' | 'dismissible'

/**
 * Why the drawer asked to close (ruling B7 vocabulary): Escape (modal /
 * dismissible) or a scrim click (modal).
 */
export type NavigationDrawerCloseReason = 'escapeKeyDown' | 'backdropClick'

interface DrawerContextValue {
  value?: string
  onChange?: (event: MouseEvent<HTMLButtonElement>, value: string) => void
}

const DrawerContext = createContext<DrawerContextValue>({})

export interface NavigationDrawerProps
  extends Omit<HTMLAttributes<HTMLElement>, 'onChange'> {
  /**
   * - `standard` — always visible, inline beside the content;
   * - `modal` — an overlay with a scrim (`open` / `onClose`);
   * - `dismissible` — inline like `standard`, but `open` slides it in and out,
   *   pushing the content beside it; no scrim, the page stays interactive
   *   (Compose `DismissibleNavigationDrawer`).
   * @default 'standard'
   */
  variant?: NavigationDrawerVariant
  /** Open state of a `modal` / `dismissible` drawer (controlled). @default false */
  open?: boolean
  /**
   * Called with the triggering event and the `reason` when the drawer asks to
   * close: Escape (`modal`, and `dismissible` while focus is inside it) or a
   * scrim click (`modal`).
   */
  onClose?: (event: ModalCloseEvent, reason: NavigationDrawerCloseReason) => void
  /** Controlled selected destination value (shared with items). */
  value?: string
  /** Uncontrolled initial destination value. */
  defaultValue?: string
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
 *
 * `dismissible` (Compose `DismissibleNavigationDrawer`) is the standard
 * Surface panel toggled by `open`: it opens on DefaultSpatial and closes on
 * FastEffects by sliding its inline-start margin, so place it as the first
 * child of a flex (or grid) row next to the content — the content is pushed
 * aside rather than covered (give the row `overflow: hidden` so the sliding
 * panel stays clipped). There is no scrim or focus trap. Opening moves focus
 * to the selected (else first) item, as Compose does; Escape inside the
 * drawer calls `onClose`; a closed drawer is `inert`, and closing it with
 * focus inside returns focus to where it was before opening. Pair it with a
 * menu button carrying `aria-expanded` / `aria-controls`.
 */
export const NavigationDrawer = forwardRef<HTMLElement, NavigationDrawerProps>(
  function NavigationDrawer(
    {
      variant = 'standard',
      open = false,
      onClose,
      value,
      defaultValue,
      onChange,
      className,
      children,
      ...rest
    },
    ref,
  ) {
    const { fallbackLabel = 'Navigation' } = useLocaleLabels('NavigationDrawer')
    const [current, setUncontrolled, isControlled] = useControllableState({
      value,
      defaultValue,
      name: 'NavigationDrawer',
      state: 'value',
    })
    const handleChange = (event: MouseEvent<HTMLButtonElement>, v: string) => {
      if (!isControlled) setUncontrolled(v)
      onChange?.(event, v)
    }
    const context: DrawerContextValue = { value: current, onChange: handleChange }

    const rootRef = useRef<HTMLDivElement>(null)
    const surfaceRef = useRef<HTMLElement | null>(null)
    const dismissible = variant === 'dismissible'
    const openerRef = useRef<HTMLElement | null>(null)
    const wasOpen = useRef(open)

    // Dismissible: a closed drawer leaves the Tab order / accessibility tree
    // (`inert`, set through the DOM — React 18 has no boolean `inert` prop).
    // Opening moves focus into the drawer (Compose focusRequester); closing
    // with focus inside hands it back to the element focused before opening.
    useIsoLayoutEffect(() => {
      const panel = surfaceRef.current
      if (!panel) return
      if (!dismissible) {
        wasOpen.current = open
        return
      }
      const opening = open && !wasOpen.current
      const closing = !open && wasOpen.current
      wasOpen.current = open
      if (closing && panel.contains(document.activeElement)) {
        const opener = openerRef.current
        if (opener?.isConnected && !panel.contains(opener)) opener.focus()
        else (document.activeElement as HTMLElement | null)?.blur()
      }
      panel.toggleAttribute('inert', !open)
      if (opening) {
        const active = document.activeElement
        openerRef.current = active instanceof HTMLElement ? active : null
        const target =
          panel.querySelector<HTMLElement>('button[aria-current="page"]:not(:disabled)') ??
          panel.querySelector<HTMLElement>('button:not(:disabled)')
        target?.focus()
      }
    }, [open, dismissible])

    const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
      rest.onKeyDown?.(event)
      if (!dismissible || !open || event.key !== 'Escape' || event.defaultPrevented) return
      event.preventDefault()
      onClose?.(event, 'escapeKeyDown')
    }
    // B45: the open modal drawer paints in the top layer.
    useModalTopLayer(variant === 'modal' && open, [rootRef])
    useModal({
      active: variant === 'modal' && open,
      rootRef,
      surfaceRef,
      onEscape: (event) => onClose?.(event, 'escapeKeyDown'),
    })

    // Default the accessible name for both the modal dialog and the standard
    // <aside> landmark (Compose sets a "Navigation Menu" paneTitle). The modal
    // surface is a <div>: `role="dialog"` is not allowed on <aside> (#429).
    const restAriaLabel = (rest as Record<string, unknown>)['aria-label'] as string | undefined
    const restLabelledby = (rest as Record<string, unknown>)['aria-labelledby'] as
      | string
      | undefined

    const Panel = variant === 'modal' ? 'div' : 'aside'
    const panel = (
      <Panel
        ref={(node) => assignRefs(node, surfaceRef, ref)}
        tabIndex={variant === 'modal' ? -1 : undefined}
        {...rest}
        data-variant={variant}
        data-open={dismissible ? open || undefined : undefined}
        onKeyDown={dismissible ? handleKeyDown : rest.onKeyDown}
        className={clsx(styles.drawer, className)}
        role={variant === 'modal' ? 'dialog' : undefined}
        aria-modal={variant === 'modal' ? true : undefined}
        aria-label={restLabelledby == null ? (restAriaLabel ?? fallbackLabel) : restAriaLabel}
      >
        {children}
      </Panel>
    )

    if (variant !== 'modal') {
      return <DrawerContext.Provider value={context}>{panel}</DrawerContext.Provider>
    }

    return (
      <DrawerContext.Provider value={context}>
        <div ref={rootRef} className={styles.modalRoot} data-open={open || undefined}>
          <div
            className={styles.scrim}
            aria-hidden="true"
            onClick={(event) => onClose?.(event, 'backdropClick')}
          />
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
