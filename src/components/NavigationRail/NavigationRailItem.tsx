import {
  forwardRef,
  useContext,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react'
import clsx from 'clsx'
import { FocusRing } from '../../primitives/FocusRing/FocusRing'
import { RailContext } from './NavigationRailContext'
import styles from './NavigationRailItem.module.css'

export interface NavigationRailItemProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'value'> {
  /** Destination value; selected state is derived from the parent rail. */
  value: string
  icon: ReactNode
  label?: ReactNode
  badge?: ReactNode
  /** Selected state when used standalone (outside a `NavigationRail`). */
  selected?: boolean
}

/**
 * A destination inside a `NavigationRail`.
 *
 * Its layout is a single stable DOM whose pill, icon and label are absolutely
 * positioned and interpolated from the inherited `--_t` morph value (0 =
 * collapsed icon-over-label with a 56×32 pill, 1 = expanded icon+label in a
 * full-width 56dp pill). Because every value is a `calc()` of `--_t`, the
 * spring driving `--_t` produces a continuous morph with no reflow.
 */
export const NavigationRailItem = forwardRef<HTMLButtonElement, NavigationRailItemProps>(
  function NavigationRailItem(
    { value, icon, label, badge, selected: selectedProp, disabled = false, className, onClick, ...rest },
    ref,
  ) {
    const ctx = useContext(RailContext)
    const selected = ctx ? ctx.value === value : !!selectedProp

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
          ctx?.onChange(value)
        }}
      >
        <span className={styles.shape} aria-hidden="true" />
        <span className={styles.icon} aria-hidden="true">
          {icon}
          {badge != null && <span className={styles.badge}>{badge}</span>}
        </span>
        {label != null && <span className={styles.label}>{label}</span>}
        {!disabled && <FocusRing className={styles.focus} />}
      </button>
    )
  },
)
