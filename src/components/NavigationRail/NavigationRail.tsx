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

interface RailContextValue {
  value: string
  onChange: (value: string) => void
}

const RailContext = createContext<RailContextValue | null>(null)

export interface NavigationRailProps
  extends Omit<HTMLAttributes<HTMLElement>, 'onChange'> {
  /** The selected destination value. */
  value: string
  /** Fires with the newly selected destination value. */
  onChange: (value: string) => void
  /** Optional header content (e.g. a menu button or FAB) shown at the top. */
  header?: ReactNode
  children?: ReactNode
}

/**
 * Material Design 3 Navigation rail (vertical side navigation).
 *
 * 80dp Surface column of destinations with an optional header/FAB slot. The
 * active item shows a 56×32 SecondaryContainer pill behind its 24dp icon
 * (OnSecondaryContainer) with a Secondary LabelMedium label; inactive items are
 * OnSurfaceVariant — per Compose NavigationRail tokens.
 */
export const NavigationRail = forwardRef<HTMLElement, NavigationRailProps>(
  function NavigationRail(
    { value, onChange, header, className, children, ...rest },
    ref,
  ) {
    return (
      <RailContext.Provider value={{ value, onChange }}>
        <nav ref={ref} {...rest} className={clsx(styles.rail, className)}>
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
        </span>
        {label != null && <span className={styles.label}>{label}</span>}
        {!disabled && <FocusRing />}
      </button>
    )
  },
)
