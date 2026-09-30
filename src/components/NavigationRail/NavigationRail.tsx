import {
  forwardRef,
  useCallback,
  useLayoutEffect,
  useRef,
  type HTMLAttributes,
  type MouseEvent,
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
  /** Fires with the triggering event and the newly selected destination value. */
  onChange?: (event: MouseEvent<HTMLButtonElement>, value: string) => void
  /**
   * `collapsed` (96dp, icon-over-label) or `expanded` (icon beside label in a
   * pill; the rail is as wide as its widest item, 220–360dp). The change is a
   * spring morph. @default 'collapsed'
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
 * fit its widest destination (min 220dp, max 360dp — Compose
 * `WideNavigationRail`) and lays each destination out as icon + label in a
 * pill, with badges beside the label.
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
    // Expanded width = widest item (20 + pill 16 + icon 24 + 8 + label + 16 +
    // 20 = label + 104), clamped to 220–360 (site tokens; Compose
    // WideNavigationRail). Written straight to the element as `--_expanded-w`
    // so measuring never re-renders the rail.
    const labelWidths = useRef(new Map<object, number>())
    const applyExpandedWidth = useCallback(() => {
      const widest = Math.max(0, ...labelWidths.current.values())
      const expanded = Math.min(360, Math.max(220, Math.ceil(widest) + 104))
      innerRef.current?.style.setProperty('--_expanded-w', `${expanded}px`)
    }, [])
    const reportLabelWidth = useCallback(
      (item: object, width: number | null) => {
        if (width == null) labelWidths.current.delete(item)
        else labelWidths.current.set(item, width)
        applyExpandedWidth()
      },
      [applyExpandedWidth],
    )
    // Items report in their layout effects, which run before this element's
    // ref is attached on mount — apply once more after they have all run.
    useLayoutEffect(applyExpandedWidth)

    const isControlled = value !== undefined
    const [uncontrolled, setUncontrolled] = useState(defaultValue ?? '')
    const current = isControlled ? value : uncontrolled
    const handleChange = (event: MouseEvent<HTMLButtonElement>, v: string) => {
      if (!isControlled) setUncontrolled(v)
      onChange?.(event, v)
    }

    return (
      <RailContext.Provider value={{ value: current, onChange: handleChange, reportLabelWidth }}>
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
