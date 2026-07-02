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
import styles from './NavigationBar.module.css'

interface NavContextValue {
  value: string
  onChange: (value: string) => void
}

const NavContext = createContext<NavContextValue | null>(null)

export interface NavigationBarProps
  extends Omit<HTMLAttributes<HTMLElement>, 'onChange'> {
  /** The selected destination value. */
  value: string
  /** Fires with the newly selected destination value. */
  onChange: (value: string) => void
  children?: ReactNode
}

/**
 * Material Design 3 Navigation bar (bottom).
 *
 * 80dp SurfaceContainer bar of destinations. The active item shows a 56×32
 * SecondaryContainer pill behind its 24dp icon (OnSecondaryContainer), a
 * Secondary LabelMedium label; inactive items are OnSurfaceVariant — per
 * Compose NavigationBarTokens.
 */
export const NavigationBar = forwardRef<HTMLElement, NavigationBarProps>(
  function NavigationBar({ value, onChange, className, children, ...rest }, ref) {
    return (
      <NavContext.Provider value={{ value, onChange }}>
        <nav ref={ref} {...rest} className={clsx(styles.bar, className)}>
          {children}
        </nav>
      </NavContext.Provider>
    )
  },
)

export interface NavigationBarItemProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'value'> {
  /** Identifies the destination; matched against the parent value. */
  value: string
  /** The item icon. */
  icon: ReactNode
  /** The item label. */
  label?: ReactNode
  /** Optional badge shown on the icon. */
  badge?: ReactNode
}

/** A destination inside a `NavigationBar`. */
export const NavigationBarItem = forwardRef<HTMLButtonElement, NavigationBarItemProps>(
  function NavigationBarItem(
    { value, icon, label, badge, disabled = false, className, onClick, ...rest },
    ref,
  ) {
    const ctx = useContext(NavContext)
    if (!ctx) throw new Error('NavigationBarItem must be used within <NavigationBar>')
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
