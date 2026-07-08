import {
  forwardRef,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
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
 * The whole row is the (full-width) click target; the active indicator is a
 * pill that hugs its content — a 56×32 pill around the icon when collapsed,
 * growing to wrap icon + label when expanded. Layout is a single stable DOM
 * whose pill, icon and label are absolutely positioned and interpolated from
 * the inherited `--_t` morph value (0 = collapsed, 1 = expanded), so the tween
 * driving `--_t` produces a continuous morph with no reflow. The label's
 * natural width is measured into `--_label-w` so the pill can hug it.
 */
export const NavigationRailItem = forwardRef<HTMLButtonElement, NavigationRailItemProps>(
  function NavigationRailItem(
    { value, icon, label, badge, selected: selectedProp, disabled = false, className, onClick, ...rest },
    ref,
  ) {
    const ctx = useContext(RailContext)
    const selected = ctx ? ctx.value === value : !!selectedProp

    const buttonRef = useRef<HTMLButtonElement | null>(null)
    const labelExpRef = useRef<HTMLSpanElement>(null)
    const labelColRef = useRef<HTMLSpanElement>(null)
    const setButtonRef = useCallback(
      (node: HTMLButtonElement | null) => {
        buttonRef.current = node
        if (typeof ref === 'function') ref(node)
        else if (ref) ref.current = node
      },
      [ref],
    )

    // Measure the expanded label's natural width (so the expanded pill can hug
    // it) and the collapsed label's wrapped height (so the item can grow for
    // multi-line labels).
    useLayoutEffect(() => {
      const btn = buttonRef.current
      if (!btn) return
      const measure = () => {
        if (labelExpRef.current) btn.style.setProperty('--_label-w', `${labelExpRef.current.offsetWidth}px`)
        if (labelColRef.current) btn.style.setProperty('--_label-h', `${labelColRef.current.offsetHeight}px`)
      }
      measure()
      if (typeof ResizeObserver === 'undefined') return
      const ro = new ResizeObserver(measure)
      if (labelExpRef.current) ro.observe(labelExpRef.current)
      if (labelColRef.current) ro.observe(labelColRef.current)
      return () => ro.disconnect()
    }, [label])

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
          ctx?.onChange(value)
        }}
      >
        <span className={styles.shape} aria-hidden="true" />
        <span className={styles.icon} aria-hidden="true">
          {icon}
          {badge != null && <span className={styles.badge}>{badge}</span>}
        </span>
        {label != null && (
          <>
            {/* Collapsed label fades out below the icon; the expanded label fades
                in beside it while sliding slightly left→right into place. */}
            <span ref={labelColRef} className={styles.labelCollapsed}>
              {label}
            </span>
            <span ref={labelExpRef} className={styles.labelExpanded} aria-hidden="true">
              {label}
            </span>
          </>
        )}
        {!disabled && <FocusRing className={styles.focus} />}
      </button>
    )
  },
)
