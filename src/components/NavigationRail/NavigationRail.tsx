import {
  createContext,
  forwardRef,
  useContext,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from 'react'
import clsx from 'clsx'
import { FocusRing } from '../../primitives/FocusRing/FocusRing'
import styles from './NavigationRail.module.css'

export type NavigationRailVariant = 'collapsed' | 'expanded'
export type NavigationRailArrangement = 'top' | 'center' | 'bottom'

interface RailContextValue {
  value: string
  onChange: (value: string) => void
  variant: NavigationRailVariant
}

const RailContext = createContext<RailContextValue | null>(null)

export interface NavigationRailProps
  extends Omit<HTMLAttributes<HTMLElement>, 'onChange'> {
  /** The selected destination value. */
  value: string
  /** Fires with the newly selected destination value. */
  onChange: (value: string) => void
  /**
   * `collapsed` (96dp, icon-over-label) or `expanded` (220dp+, icon beside label
   * in a full-width pill). @default 'collapsed'
   */
  variant?: NavigationRailVariant
  /** Vertical placement of the destinations below the header. @default 'top' */
  arrangement?: NavigationRailArrangement
  /** Optional header content (e.g. a menu button and/or FAB) pinned at the top. */
  header?: ReactNode
  children?: ReactNode
}

/**
 * Material Design 3 (Expressive) Navigation rail — the Compose
 * `WideNavigationRail` with `collapsed` / `expanded` variants.
 *
 * Collapsed is a 96dp Surface column of icon-over-label destinations with a
 * 56×32 SecondaryContainer pill on the active item. Expanded grows to 220–360dp
 * and lays each destination out as icon + label in a full-width pill. Active
 * icon is OnSecondaryContainer, active label Secondary; inactive items are
 * OnSurfaceVariant. An optional `header` (menu button, FAB) is pinned at the top.
 */
export const NavigationRail = forwardRef<HTMLElement, NavigationRailProps>(
  function NavigationRail(
    { value, onChange, variant = 'collapsed', arrangement = 'top', header, className, children, ...rest },
    ref,
  ) {
    return (
      <RailContext.Provider value={{ value, onChange, variant }}>
        <nav
          ref={ref}
          {...rest}
          data-variant={variant}
          data-arrangement={arrangement}
          className={clsx(styles.rail, className)}
        >
          {header != null && <div className={styles.header}>{header}</div>}
          <div className={styles.items}>{children}</div>
        </nav>
      </RailContext.Provider>
    )
  },
)

export interface NavigationRailItemProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'value'> {
  value: string
  icon: ReactNode
  label?: ReactNode
  badge?: ReactNode
}

/** A destination inside a `NavigationRail`. */
export const NavigationRailItem = forwardRef<HTMLButtonElement, NavigationRailItemProps>(
  function NavigationRailItem(
    { value, icon, label, badge, disabled = false, className, onClick, ...rest },
    ref,
  ) {
    const ctx = useContext(RailContext)
    if (!ctx) throw new Error('NavigationRailItem must be used within <NavigationRail>')
    const selected = ctx.value === value
    const expanded = ctx.variant === 'expanded'

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
          ctx.onChange(value)
        }}
      >
        <span className={styles.indicator}>
          <span className={styles.icon} aria-hidden="true">
            {icon}
          </span>
          {badge != null && <span className={styles.badge}>{badge}</span>}
          {expanded && label != null && <span className={styles.label}>{label}</span>}
        </span>
        {!expanded && label != null && <span className={styles.label}>{label}</span>}
        {!disabled && <FocusRing />}
      </button>
    )
  },
)
