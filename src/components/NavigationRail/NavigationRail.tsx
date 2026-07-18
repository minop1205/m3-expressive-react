import {
  forwardRef,
  useCallback,
  useRef,
  type HTMLAttributes,
  type ReactNode,
  useState,
} from 'react'
import clsx from 'clsx'
import {
  RailContext,
  type NavigationRailArrangement,
  type NavigationRailVariant,
} from './NavigationRailContext'
import { useRailMorph } from './useRailMorph'
import styles from './NavigationRail.module.css'

export type { NavigationRailVariant, NavigationRailArrangement } from './NavigationRailContext'
export { NavigationRailItem, type NavigationRailItemProps } from './NavigationRailItem'

export interface NavigationRailProps
  extends Omit<HTMLAttributes<HTMLElement>, 'onChange'> {
  /** Controlled selected destination value. */
  value?: string
  /** Uncontrolled initial destination value. */
  defaultValue?: string
  /** Fires with the newly selected destination value. */
  onChange?: (value: string) => void
  /**
   * `collapsed` (96dp, icon-over-label) or `expanded` (220dp, icon beside label
   * in a full-width pill). The change is a spring morph. @default 'collapsed'
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
 * `WideNavigationRail` with `collapsed` / `expanded` variants that morph on a
 * spring. Collapsed is a 96dp Surface column of icon-over-label destinations
 * with a 56×32 SecondaryContainer pill on the active item; expanded grows to
 * 220dp and lays each destination out as icon + label in a full-width pill.
 * The whole transition (width, item spacing, and every item's icon/label/pill)
 * is interpolated from a single spring value. An optional `header` (menu button,
 * FAB) is pinned at the top.
 */
export const NavigationRail = forwardRef<HTMLElement, NavigationRailProps>(
  function NavigationRail(
    { value, defaultValue, onChange, variant = 'collapsed', arrangement = 'top', header, className, children, ...rest },
    ref,
  ) {
    const innerRef = useRef<HTMLElement | null>(null)
    useRailMorph(variant === 'expanded', innerRef)

    const setRefs = useCallback(
      (node: HTMLElement | null) => {
        innerRef.current = node
        if (typeof ref === 'function') ref(node)
        else if (ref) ref.current = node
      },
      [ref],
    )
    const isControlled = value !== undefined
    const [uncontrolled, setUncontrolled] = useState(defaultValue ?? '')
    const current = isControlled ? value : uncontrolled
    const handleChange = (v: string) => {
      if (!isControlled) setUncontrolled(v)
      onChange?.(v)
    }

    return (
      <RailContext.Provider value={{ value: current, onChange: handleChange }}>
        <nav
          ref={setRefs}
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
