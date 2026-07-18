import {
  createContext,
  forwardRef,
  useContext,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
  useState,
} from 'react'
import clsx from 'clsx'
import { FocusRing } from '../../primitives/FocusRing/FocusRing'
import styles from './NavigationBar.module.css'

export type NavigationItemLayout = 'vertical' | 'horizontal'

interface NavContextValue {
  value: string
  onChange: (value: string) => void
  layout: NavigationItemLayout
}

const NavContext = createContext<NavContextValue | null>(null)

export interface NavigationBarProps
  extends Omit<HTMLAttributes<HTMLElement>, 'onChange'> {
  /** Controlled selected destination value. */
  value?: string
  /** Uncontrolled initial destination value. */
  defaultValue?: string
  /** Fires with the newly selected destination value. */
  onChange?: (value: string) => void
  /** Item layout: icon over label (`vertical`) or beside it (`horizontal`, flexible). @default 'vertical' */
  itemLayout?: NavigationItemLayout
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
  function NavigationBar(
    { value, defaultValue, onChange, itemLayout = 'vertical', className, children, ...rest },
    ref,
  ) {
    const isControlled = value !== undefined
    const [uncontrolled, setUncontrolled] = useState(defaultValue ?? '')
    const current = isControlled ? value : uncontrolled
    const handleChange = (v: string) => {
      if (!isControlled) setUncontrolled(v)
      onChange?.(v)
    }

    return (
      <NavContext.Provider value={{ value: current, onChange: handleChange, layout: itemLayout }}>
        <nav
          ref={ref}
          {...rest}
          data-layout={itemLayout}
          className={clsx(styles.bar, className)}
        >
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
  /** Badge on the icon: content (e.g. `"3"`) for a large badge, `true` for a small dot. */
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
    const horizontal = ctx.layout === 'horizontal'

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
          {badge != null &&
            badge !== false &&
            (badge === true ? (
              <span className={styles.badgeDot} />
            ) : (
              <span className={styles.badge}>{badge}</span>
            ))}
          {horizontal && label != null && <span className={styles.label}>{label}</span>}
        </span>
        {!horizontal && label != null && <span className={styles.label}>{label}</span>}
        {!disabled && <FocusRing />}
      </button>
    )
  },
)
