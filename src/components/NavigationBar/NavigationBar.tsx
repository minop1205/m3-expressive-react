import {
  Children,
  createContext,
  forwardRef,
  isValidElement,
  useCallback,
  useContext,
  useRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
  useState,
} from 'react'
import clsx from 'clsx'
import { Ripple } from '../../primitives/Ripple/Ripple'
import { defaultNavBadgeLabel, hasNavBadge } from '../../internal/navBadge'
import styles from './NavigationBar.module.css'

export type NavigationItemLayout = 'vertical' | 'horizontal'

interface NavContextValue {
  value: string
  onChange: (event: MouseEvent<HTMLButtonElement>, value: string) => void
  layout: NavigationItemLayout
}

const NavContext = createContext<NavContextValue | null>(null)

export interface NavigationBarProps
  extends Omit<HTMLAttributes<HTMLElement>, 'onChange'> {
  /** Controlled selected destination value. */
  value?: string
  /** Uncontrolled initial destination value. */
  defaultValue?: string
  /** Fires with the triggering event and the newly selected destination value. */
  onChange?: (event: MouseEvent<HTMLButtonElement>, value: string) => void
  /**
   * Item layout: icon over label (`vertical`) or beside it (`horizontal`).
   * Horizontal items are centered with the extra width at both ends of the bar
   * (20 / 15 / 10 / 5 % per side for 3 / 4 / 5 / 6 items). @default 'vertical'
   */
  itemLayout?: NavigationItemLayout
  children?: ReactNode
}

/**
 * Material Design 3 (Expressive) flexible Navigation bar (bottom).
 *
 * A 64dp-minimum SurfaceContainer bar of destinations (Compose
 * `ShortNavigationBar`; the 80dp baseline bar is no longer recommended by
 * m3.material.io). The active item shows a 56×32 SecondaryContainer pill
 * behind its 24dp icon (OnSecondaryContainer) and a Secondary LabelMedium
 * label; inactive items are OnSurfaceVariant. The bar grows vertically when
 * labels wrap at larger text sizes.
 */
export const NavigationBar = forwardRef<HTMLElement, NavigationBarProps>(
  function NavigationBar(
    { value, defaultValue, onChange, itemLayout = 'vertical', className, children, ...rest },
    ref,
  ) {
    const isControlled = value !== undefined
    const [uncontrolled, setUncontrolled] = useState(defaultValue ?? '')
    const current = isControlled ? value : uncontrolled
    const handleChange = (event: MouseEvent<HTMLButtonElement>, v: string) => {
      if (!isControlled) setUncontrolled(v)
      onChange?.(event, v)
    }

    // Horizontal items use Compose's `ShortNavigationBarArrangement.Centered`
    // (the site's default for horizontal items): side space depends on count.
    const itemCount = Children.toArray(children).filter(isValidElement).length

    return (
      <NavContext.Provider value={{ value: current, onChange: handleChange, layout: itemLayout }}>
        <nav
          ref={ref}
          {...rest}
          data-layout={itemLayout}
          data-item-count={itemLayout === 'horizontal' ? itemCount : undefined}
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
  /** The item icon (outlined, per m3.material.io, when `selectedIcon` is given). */
  icon: ReactNode
  /**
   * Icon shown while this destination is selected — typically the filled
   * version of `icon` (m3: filled for the selected destination, outlined for
   * the rest). Falls back to `icon`.
   */
  selectedIcon?: ReactNode
  /**
   * The item label. Without a label, give the item an `aria-label` (which then
   * also replaces the announced badge text).
   */
  label?: ReactNode
  /** Badge on the icon: content (e.g. `"3"`) for a large badge, `true` for a small dot. */
  badge?: ReactNode
  /**
   * Accessible text for the badge, announced after the label. Defaults to
   * `"{badge} new notifications"` for a counting badge and `"New notification"`
   * for a dot.
   */
  badgeLabel?: string
}

/** A destination inside a `NavigationBar`. */
export const NavigationBarItem = forwardRef<HTMLButtonElement, NavigationBarItemProps>(
  function NavigationBarItem(
    {
      value,
      icon,
      selectedIcon,
      label,
      badge,
      badgeLabel,
      disabled = false,
      className,
      onClick,
      ...rest
    },
    ref,
  ) {
    const ctx = useContext(NavContext)
    const buttonRef = useRef<HTMLButtonElement | null>(null)
    const setButtonRef = useCallback(
      (node: HTMLButtonElement | null) => {
        buttonRef.current = node
        if (typeof ref === 'function') ref(node)
        else if (ref) ref.current = node
      },
      [ref],
    )
    if (!ctx) throw new Error('NavigationBarItem must be used within <NavigationBar>')
    const selected = ctx.value === value
    const horizontal = ctx.layout === 'horizontal'
    const showBadge = hasNavBadge(badge)
    const badgeText = showBadge ? (badgeLabel ?? defaultNavBadgeLabel(badge)) : undefined

    return (
      <button
        ref={setButtonRef}
        {...rest}
        type="button"
        disabled={disabled}
        aria-current={selected ? 'page' : undefined}
        data-selected={selected || undefined}
        className={clsx(styles.item, className)}
        onClick={(event) => {
          onClick?.(event)
          ctx.onChange(event, value)
        }}
      >
        <span className={styles.indicator}>
          {/* State layer + press ripple clipped to the indicator, driven by
              the whole item (Compose: ripple offset into the indicator). */}
          <Ripple control={buttonRef} disabled={disabled} className={styles.ripple} />
          <span className={styles.icon} aria-hidden="true">
            {selected && selectedIcon != null ? selectedIcon : icon}
          </span>
          {showBadge &&
            (badge === true ? (
              <span className={styles.badgeDot} aria-hidden="true" />
            ) : (
              <span className={styles.badge} aria-hidden="true">
                {badge}
              </span>
            ))}
          {horizontal && label != null && <span className={styles.label}>{label}</span>}
          {/* The focus ring traces the indicator (Compose focusRingShape). */}
          {!disabled && <span className={styles.focusRing} aria-hidden="true" />}
        </span>
        {!horizontal && label != null && <span className={styles.label}>{label}</span>}
        {/* Read after the destination label (m3 badges/accessibility). */}
        {badgeText && <span className={styles.visuallyHidden}>{` ${badgeText}`}</span>}
      </button>
    )
  },
)
