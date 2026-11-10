'use client'

import {
  forwardRef,
  useCallback,
  useContext,
  useRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react'
import { useIsoLayoutEffect } from '../../internal/useIsoLayoutEffect'
import clsx from 'clsx'
import { FocusRing } from '../../primitives/FocusRing/FocusRing'
import { Ripple } from '../../primitives/Ripple/Ripple'
import { defaultNavBadgeLabel, hasNavBadge } from '../../internal/navBadge'
import { RailContext } from './NavigationRailContext'
import { useRailMorph } from './useRailMorph'
import styles from './NavigationRailItem.module.css'
import { useLocaleLabels } from '../../internal/locale'

/** Space between the expanded label and the badge beside it (CSS `.labelExpanded` gap). */
const BADGE_GAP = 8

/** Props shared by a destination (`NavigationRailItem`) and an action (`NavigationRailAction`). */
interface RailEntryBaseProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'value'> {
  /** The item icon (outlined, per m3.material.io, when `selectedIcon` is given). */
  icon: ReactNode
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
  /**
   * Layout when used standalone (outside a `NavigationRail`): `false` =
   * collapsed (icon over label), `true` = expanded (icon beside label in a
   * pill). Toggling runs the same spring morph the rail uses. Inside a
   * `NavigationRail` this is ignored — the rail's `variant` governs.
   */
  expanded?: boolean
}

export interface NavigationRailItemProps extends RailEntryBaseProps {
  /** Destination value; selected state is derived from the parent rail. */
  value: string
  /**
   * Icon shown while this destination is selected — typically the filled
   * version of `icon` (m3: filled for the selected destination, outlined for
   * the rest). Falls back to `icon`.
   */
  selectedIcon?: ReactNode
  /** Selected state when used standalone (outside a `NavigationRail`). */
  selected?: boolean
}

/** Props of `NavigationRailAction`: a destination's icon / label / badge, without a value or selection. */
export type NavigationRailActionProps = RailEntryBaseProps

interface RailEntryProps extends RailEntryBaseProps {
  selected: boolean
  selectedIcon?: ReactNode
  /** Standalone with `expanded` given: drive the morph from this element. */
  driveMorph: boolean
}

/**
 * The shared row of `NavigationRailItem` and `NavigationRailAction`.
 *
 * The whole row is the (full-width) click target; the active indicator is a
 * pill that hugs its content — a 56×32 pill around the icon when collapsed,
 * growing to wrap icon + label when expanded. Layout is a single stable DOM
 * whose pill, icon and label are absolutely positioned and interpolated from
 * the inherited `--_t` morph value (0 = collapsed, 1 = expanded), so the tween
 * driving `--_t` produces a continuous morph with no reflow. The label's
 * natural width is measured into `--_label-w` so the pill can hug it.
 */
const RailEntry = forwardRef<HTMLButtonElement, RailEntryProps>(function RailEntry(
  {
    icon,
    selectedIcon,
    label,
    badge,
    badgeLabel,
    selected,
    expanded,
    driveMorph,
    disabled = false,
    className,
    ...rest
  },
  ref,
) {
  const ctx = useContext(RailContext)
  const showBadge = hasNavBadge(badge)
  const { getLabel: getBadgeLabel } = useLocaleLabels('Badge')
  const badgeText = showBadge
    ? (badgeLabel ?? defaultNavBadgeLabel(badge, getBadgeLabel))
    : undefined

  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const labelExpRef = useRef<HTMLSpanElement>(null)
  const labelTextRef = useRef<HTMLSpanElement>(null)
  const badgeExpRef = useRef<HTMLSpanElement>(null)
  const labelColRef = useRef<HTMLSpanElement>(null)
  const reportLabelWidth = ctx?.reportLabelWidth
  const setButtonRef = useCallback(
    (node: HTMLButtonElement | null) => {
      buttonRef.current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) ref.current = node
    },
    [ref],
  )

  // Standalone with `expanded` given: the item drives its own `--_t` with the
  // rail's spring. Otherwise `--_t` is inherited (from the rail, or a custom
  // container), so we must not shadow it with an inline value.
  useRailMorph(!!expanded, buttonRef, driveMorph)

  // Measure the expanded label's width (so the expanded pill can hug it —
  // label + the badge beside it), its natural width (reported to the rail,
  // which sizes its expanded width to the widest item), and the collapsed
  // label's wrapped height (so the item can grow for multi-line labels).
  const hasExpandedBadge = showBadge && label != null
  useIsoLayoutEffect(() => {
    const btn = buttonRef.current
    if (!btn) return
    const measure = () => {
      if (labelExpRef.current) btn.style.setProperty('--_label-w', `${labelExpRef.current.offsetWidth}px`)
      if (labelColRef.current) btn.style.setProperty('--_label-h', `${labelColRef.current.offsetHeight}px`)
      if (reportLabelWidth) {
        const text = labelTextRef.current?.scrollWidth ?? 0
        const badgeW = badgeExpRef.current ? badgeExpRef.current.offsetWidth + BADGE_GAP : 0
        reportLabelWidth(buttonRef, labelTextRef.current ? text + badgeW : 0)
      }
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return () => reportLabelWidth?.(buttonRef, null)
    const ro = new ResizeObserver(measure)
    if (labelExpRef.current) ro.observe(labelExpRef.current)
    if (labelTextRef.current) ro.observe(labelTextRef.current)
    if (labelColRef.current) ro.observe(labelColRef.current)
    return () => {
      ro.disconnect()
      reportLabelWidth?.(buttonRef, null)
    }
  }, [label, hasExpandedBadge, badge, reportLabelWidth])

  return (
    <button
      ref={setButtonRef}
      {...rest}
      type="button"
      disabled={disabled}
      aria-current={selected ? 'page' : undefined}
      data-selected={selected || undefined}
      data-rail-entry=""
      className={clsx(styles.item, className)}
    >
      <span className={styles.shape} aria-hidden="true">
        {/* State layer + press ripple clipped to the pill, driven by the
            whole (full-width) item. */}
        <Ripple control={buttonRef} disabled={disabled} className={styles.ripple} />
      </span>
      <span className={styles.icon} aria-hidden="true">
        {selected && selectedIcon != null ? selectedIcon : icon}
        {/* Collapsed: on the icon's top-end corner. With a label it fades out
            as the rail expands and the copy beside the label fades in. */}
        {showBadge &&
          (badge === true ? (
            <span className={clsx(styles.badgeDot, hasExpandedBadge && styles.fadesOut)} />
          ) : (
            <span className={clsx(styles.badge, hasExpandedBadge && styles.fadesOut)}>{badge}</span>
          ))}
      </span>
      {label != null && (
        <>
          {/* Collapsed label fades out below the icon; the expanded label fades
              in beside it while sliding slightly left→right into place. */}
          <span ref={labelColRef} className={styles.labelCollapsed}>
            {label}
          </span>
          <span ref={labelExpRef} className={styles.labelExpanded} aria-hidden="true">
            <span ref={labelTextRef} className={styles.labelText}>
              {label}
            </span>
            {/* Expanded: the badge sits beside the label (m3 guidelines). */}
            {hasExpandedBadge &&
              (badge === true ? (
                <span ref={badgeExpRef} className={styles.badgeDotInline} />
              ) : (
                <span ref={badgeExpRef} className={clsx(styles.badge, styles.badgeInline)}>
                  {badge}
                </span>
              ))}
          </span>
        </>
      )}
      {/* Read after the destination label (m3 badges/accessibility); the
          visible badge above is decorative. */}
      {badgeText && <span className={styles.visuallyHidden}>{` ${badgeText}`}</span>}
      {!disabled && <FocusRing className={styles.focus} />}
    </button>
  )
})

/**
 * A destination inside a `NavigationRail`: the shared row (see `RailEntry`)
 * whose selected state comes from the rail's `value`, and whose click selects
 * it (`onChange`). Standalone, `selected` / `expanded` drive it instead.
 */
export const NavigationRailItem = forwardRef<HTMLButtonElement, NavigationRailItemProps>(
  function NavigationRailItem({ value, selected: selectedProp, expanded, onClick, ...rest }, ref) {
    const ctx = useContext(RailContext)
    const selected = ctx ? ctx.value === value : !!selectedProp
    return (
      <RailEntry
        ref={ref}
        {...rest}
        expanded={expanded}
        selected={selected}
        driveMorph={ctx == null && expanded !== undefined}
        onClick={(event) => {
          onClick?.(event)
          ctx?.onChange(event, value)
        }}
      />
    )
  },
)

/**
 * A low-priority action in a `NavigationRail` `header` / `footer` — a theme
 * toggle, settings, sign-in — laid out and morphing exactly like a
 * destination (icon over label collapsed, icon beside label expanded, badge
 * beside the label), but never selected: no `aria-current`, no active pill,
 * and it does not change the rail's `value`. Handle it with `onClick`. A web
 * adaptation (ruling B57); m3 keeps the menu button and FAB in the header.
 */
export const NavigationRailAction = forwardRef<HTMLButtonElement, NavigationRailActionProps>(
  function NavigationRailAction({ expanded, ...rest }, ref) {
    const ctx = useContext(RailContext)
    return (
      <RailEntry
        ref={ref}
        {...rest}
        expanded={expanded}
        selected={false}
        driveMorph={ctx == null && expanded !== undefined}
      />
    )
  },
)
