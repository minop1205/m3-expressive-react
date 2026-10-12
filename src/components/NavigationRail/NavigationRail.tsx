import {
  forwardRef,
  useCallback,
  useEffect,
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
import { useModal } from '../../internal/useModal'
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
  /**
   * Modal expanded layout: while `variant="expanded"` the rail overlaps the
   * page instead of pushing it — surface-container, 16dp trailing corners,
   * level-2 shadow, a 0.32 scrim, focus trapped inside, the rest of the page
   * inert, Escape / scrim click call `onClose`, and focus returns to the
   * opener on collapse. Collapsed, it is a regular in-flow 96dp rail (or
   * nothing, with `hideOnCollapse`). @default false
   */
  modal?: boolean
  /**
   * With `modal`: hide the rail entirely while collapsed; expanding slides the
   * expanded rail in from the leading edge. Ignored without `modal`.
   * @default false
   */
  hideOnCollapse?: boolean
  /** With `modal`: called when the scrim is clicked or Escape is pressed. */
  onClose?: () => void
  /** Accessible name of the open modal rail (a dialog). @default 'Navigation rail' */
  modalLabel?: string
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
    {
      value,
      defaultValue,
      onChange,
      variant = 'collapsed',
      arrangement = 'top',
      header,
      modal = false,
      hideOnCollapse = false,
      onClose,
      modalLabel = 'Navigation rail',
      className,
      children,
      ...rest
    },
    ref,
  ) {
    const innerRef = useRef<HTMLElement | null>(null)
    const expanded = variant === 'expanded'
    const hide = modal && hideOnCollapse
    // Hide-on-collapse keeps the expanded layout (--_t = 1 in CSS) and springs
    // the slide-in progress instead.
    const morphProperty = hide ? '--_reveal' : '--_t'
    useRailMorph(expanded, innerRef, true, morphProperty)
    useEffect(() => {
      innerRef.current?.style.removeProperty(hide ? '--_t' : '--_reveal')
    }, [hide])

    // Modal expanded rail: shared APG modal behavior + Escape.
    const open = modal && expanded
    const rootRef = useRef<HTMLDivElement>(null)
    const surfaceRef = useRef<HTMLDivElement>(null)
    useModal({ active: open, rootRef, surfaceRef, onEscape: () => onClose?.() })

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

    const nav = (
      <nav
        ref={setRefs}
        {...rest}
        data-variant={variant}
        data-arrangement={arrangement}
        data-modal={modal || undefined}
        data-open={open || undefined}
        data-hide-on-collapse={hide || undefined}
        className={clsx(styles.rail, className)}
      >
        {header != null && <div className={styles.header}>{header}</div>}
        <div className={styles.items}>{children}</div>
      </nav>
    )

    return (
      <RailContext.Provider value={{ value: current, onChange: handleChange, reportLabelWidth }}>
        {modal ? (
          // The root keeps the collapsed rail's place in the page (96dp, or
          // 0 when hidden); the rail itself is positioned over the page so
          // expanding overlaps content instead of pushing it.
          <div
            ref={rootRef}
            className={styles.modalRoot}
            data-open={open || undefined}
            data-hide-on-collapse={hide || undefined}
          >
            <div className={styles.scrim} aria-hidden="true" onClick={onClose} />
            <div
              ref={surfaceRef}
              className={styles.modalSurface}
              tabIndex={open ? -1 : undefined}
              role={open ? 'dialog' : undefined}
              aria-modal={open || undefined}
              aria-label={open ? modalLabel : undefined}
            >
              {nav}
            </div>
          </div>
        ) : (
          nav
        )}
      </RailContext.Provider>
    )
  },
)
