'use client'

import {
  cloneElement,
  createContext,
  forwardRef,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
  type FocusEvent,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  useState,
} from 'react'
import { useIsoLayoutEffect } from '../../internal/useIsoLayoutEffect'
import clsx from 'clsx'
import { Ripple } from '../../primitives/Ripple/Ripple'
import { FocusRing } from '../../primitives/FocusRing/FocusRing'
import { useControllableState } from '../../internal/useControllableState'
import type { BadgeProps } from '../Badge/Badge'
import { badgeAccessibleLabel } from '../../internal/badgeLabel'
import styles from './Tabs.module.css'

export type TabsVariant = 'primary' | 'secondary'

/** Where a `Tab`'s icon sits relative to its label. */
export type TabIconPosition = 'top' | 'start'

interface TabsContextValue {
  value: string
  onChange: (event: MouseEvent<HTMLButtonElement>, value: string) => void
  variant: TabsVariant
  /** Value of the tab that currently takes `tabIndex=0`. */
  tabStop: string
  onTabFocus: (value: string) => void
  /** Records each tab element's value so the list can resolve a fallback stop. */
  registerTab: (el: HTMLButtonElement | null, value: string) => void
}

const isRtl = (el: Element) =>
  getComputedStyle(el).direction === 'rtl' ||
  el.closest('[dir]')?.getAttribute('dir')?.toLowerCase() === 'rtl'

const TabsContext = createContext<TabsContextValue | null>(null)

/** Minimum primary indicator width (m3 "minimum length of 24dp", Compose `max(…, 24.dp)`). */
const PRIMARY_INDICATOR_MIN_WIDTH = 24
/** Tab horizontal padding (Compose `HorizontalTextPadding`), both sides. */
const TAB_HORIZONTAL_PADDING = 16

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true

export interface TabsProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Controlled selected tab value. */
  value?: string
  /** Uncontrolled initial tab value. */
  defaultValue?: string
  /**
   * Fires with the triggering event and the newly selected tab value. Not
   * fired when the selected tab is activated again, or when the tab's own
   * `onClick` called `event.preventDefault()`.
   */
  onChange?: (event: MouseEvent<HTMLButtonElement>, value: string) => void
  /** Indicator style. @default 'primary' */
  variant?: TabsVariant
  /** Scrollable tabs size to content and scroll horizontally instead of filling. */
  scrollable?: boolean
  children?: ReactNode
}

/**
 * Material Design 3 Tabs (a `role="tablist"` row of `Tab`s).
 *
 * Fixed tabs split the row into equal widths; scrollable tabs size to their
 * content (90dp minimum) with 52dp edge padding and scroll the selected tab to
 * the center whenever the selection changes. A single active indicator slides
 * between tabs: primary = content-width (min 24dp) 3dp bar with 3dp top
 * corners, secondary = full-tab-width 2dp line. Both sit above an
 * OutlineVariant 1dp divider. Arrow keys move between tabs.
 */
export const Tabs = forwardRef<HTMLDivElement, TabsProps>(function Tabs(
  {
    value,
    defaultValue,
    onChange,
    variant = 'primary',
    scrollable = false,
    className,
    children,
    onKeyDown,
    onBlur,
    ...rest
  },
  ref,
) {
  // Roving tabindex: the focused tab is the tab stop while focus is inside the
  // list; when focus leaves, the stop returns to the selected tab (APG: Tab
  // into the list lands on the active tab).
  const [focusedValue, setFocusedValue] = useState<string | null>(null)

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    onBlur?.(event)
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setFocusedValue(null)
    }
  }

  // Manual activation (m3 a11y key table, WAI-ARIA APG Tabs): Left/Right
  // (swapped in RTL) and Home/End only move focus between enabled tabs;
  // Space/Enter select through the native button click, firing onChange.
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event)
    if (event.defaultPrevented) return
    const { key } = event
    if (key !== 'ArrowRight' && key !== 'ArrowLeft' && key !== 'Home' && key !== 'End') {
      return
    }
    const list = event.currentTarget
    const tabs = Array.from(
      list.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)'),
    ).filter((t) => t.closest('[role="tablist"]') === list)
    const currentIndex = tabs.findIndex((t) => t === document.activeElement)
    if (currentIndex === -1) return
    event.preventDefault()
    let nextIndex: number
    if (key === 'Home') nextIndex = 0
    else if (key === 'End') nextIndex = tabs.length - 1
    else {
      // Arrows follow the visual order, so they swap in right-to-left layouts.
      const forward = (key === 'ArrowRight') !== isRtl(list)
      nextIndex = (currentIndex + (forward ? 1 : -1) + tabs.length) % tabs.length
    }
    tabs[nextIndex].focus()
  }
  const [current, setUncontrolled, isControlled] = useControllableState({
    value,
    defaultValue: defaultValue ?? '',
    name: 'Tabs',
    state: 'value',
  })
  const preferredStop = focusedValue ?? current

  // Fallback tab stop: when the preferred stop matches no enabled tab (no
  // selection, a stale value, or a disabled selected tab), the first enabled
  // tab takes tabIndex=0 so the list stays reachable (WAI-ARIA APG Tabs).
  const tabValues = useRef(new Map<HTMLButtonElement, string>())
  const registerTab = useCallback((el: HTMLButtonElement | null, v: string) => {
    // Called with the element on mount and null on unmount; prune detached ones.
    if (el) tabValues.current.set(el, v)
    tabValues.current.forEach((_, node) => {
      if (!node.isConnected && node !== el) tabValues.current.delete(node)
    })
  }, [])
  const [fallbackStop, setFallbackStop] = useState<string | null>(null)
  const handleChange = (event: MouseEvent<HTMLButtonElement>, v: string) => {
    // Re-selecting the selected tab is a no-op (MUI / Compose).
    if (v === current) return
    if (!isControlled) setUncontrolled(v)
    onChange?.(event, v)
  }

  const listRef = useRef<HTMLDivElement | null>(null)
  const indicatorRef = useRef<HTMLSpanElement>(null)
  const setListRef = useCallback(
    (node: HTMLDivElement | null) => {
      listRef.current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) ref.current = node
    },
    [ref],
  )

  // Last applied indicator geometry + the selection it was computed for, so
  // re-renders with an unchanged target never interrupt a running slide.
  const placed = useRef<{ value: string; left: number; width: number } | null>(null)
  // Selection the scroll position was last centered on (scrollable only).
  const scrolledFor = useRef<string | null>(null)

  const layoutIndicator = useCallback(
    (mode: 'auto' | 'snap') => {
      const list = listRef.current
      const indicator = indicatorRef.current
      if (!list || !indicator) return
      const tab = Array.from(
        list.querySelectorAll<HTMLElement>('[role="tab"][aria-selected="true"]'),
      ).find((t) => t.closest('[role="tablist"]') === list)
      if (!tab) {
        indicator.hidden = true
        placed.current = null
        return
      }
      const listRect = list.getBoundingClientRect()
      const tabRect = tab.getBoundingClientRect()
      const tabLeft = tabRect.left - listRect.left + list.scrollLeft - list.clientLeft
      let left = tabLeft
      let width = tabRect.width
      if (list.dataset.variant === 'primary') {
        // Compose `matchContentSize`: the indicator spans the tab content
        // (label / icon), clamped to the padded tab and at least 24dp, centered.
        let content = 0
        tab
          .querySelectorAll<HTMLElement>('[data-tab-content]')
          .forEach((el) => {
            content = Math.max(content, el.getBoundingClientRect().width)
          })
        width = Math.max(
          Math.min(content, tabRect.width - TAB_HORIZONTAL_PADDING * 2),
          PRIMARY_INDICATOR_MIN_WIDTH,
        )
        left = tabLeft + (tabRect.width - width) / 2
      }
      const prev = placed.current
      if (prev && prev.left === left && prev.width === width) {
        prev.value = current
        return
      }
      // Slide only when the selection itself changed after the first layout
      // (Compose snaps on first placement); resizes and content changes snap.
      const animate =
        mode === 'auto' && prev !== null && prev.value !== current && !prefersReducedMotion()
      indicator.hidden = false
      if (!animate) indicator.style.transition = 'none'
      indicator.style.width = `${width}px`
      indicator.style.transform = `translateX(${left}px)`
      if (!animate) {
        void indicator.offsetWidth // commit the snapped geometry before re-enabling
        indicator.style.transition = ''
      }
      placed.current = { value: current, left, width }
    },
    [current],
  )

  useIsoLayoutEffect(() => {
    layoutIndicator('auto')
  })

  useIsoLayoutEffect(() => {
    const list = listRef.current
    if (!list) return
    const enabled = Array.from(
      list.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)'),
    ).filter((t) => t.closest('[role="tablist"]') === list)
    const values = enabled.map((t) => tabValues.current.get(t))
    const next = values.includes(preferredStop) ? null : (values[0] ?? null)
    if (next !== fallbackStop) setFallbackStop(next)
  })

  // Re-measure on size changes (container resize, font load, label edits).
  useEffect(() => {
    const list = listRef.current
    if (!list || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => layoutIndicator('snap'))
    observer.observe(list)
    list.querySelectorAll('[role="tab"], [data-tab-content]').forEach((el) => {
      observer.observe(el)
    })
    return () => observer.disconnect()
  }, [layoutIndicator])

  // Scrollable: center the selected tab whenever the selection changes
  // (Compose `ScrollableTabData`), instantly on first layout / reduced motion.
  useEffect(() => {
    const list = listRef.current
    if (!scrollable || !list || scrolledFor.current === current) return
    const first = scrolledFor.current === null
    scrolledFor.current = current
    const tab = list.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')
    if (!tab || typeof list.scrollBy !== 'function') return
    const listRect = list.getBoundingClientRect()
    const tabRect = tab.getBoundingClientRect()
    const delta =
      tabRect.left + tabRect.width / 2 - (listRect.left + list.clientLeft + list.clientWidth / 2)
    list.scrollBy({
      left: delta,
      behavior: first || prefersReducedMotion() ? 'instant' : 'smooth',
    })
  }, [scrollable, current])

  return (
    <TabsContext.Provider
      value={{
        value: current,
        onChange: handleChange,
        variant,
        tabStop: fallbackStop ?? preferredStop,
        onTabFocus: setFocusedValue,
        registerTab,
      }}
    >
      <div
        ref={setListRef}
        {...rest}
        role="tablist"
        data-variant={variant}
        data-scrollable={scrollable || undefined}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className={clsx(styles.tabs, className)}
      >
        {children}
        <span ref={indicatorRef} className={styles.indicator} aria-hidden="true" hidden />
      </div>
    </TabsContext.Provider>
  )
})

export interface TabProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'value'> {
  /** Identifies the tab; matched against the parent `Tabs` value. */
  value: string
  /** Tab label. */
  label?: ReactNode
  /** Optional icon (24dp), above the label or before it (see `iconPosition`). */
  icon?: ReactNode
  /**
   * Icon placement: `'top'` stacks the icon above the label (64dp tab),
   * `'start'` puts it before the label with an 8dp gap (48dp tab, Compose
   * `LeadingIconTab`).
   * @default 'top'
   */
  iconPosition?: TabIconPosition
  /**
   * A `<Badge>` (without children). It is placed on the icon, or next to the
   * label when the tab has no icon, and takes no layout space (the active
   * indicator still follows the label / icon). Its accessible text (the
   * Badge `label`, or the default "New notification" / "{n} new
   * notifications") is read after the tab label.
   */
  badge?: ReactElement<BadgeProps>
}

/** A single tab; must be rendered inside `Tabs`. */
export const Tab = forwardRef<HTMLButtonElement, TabProps>(function Tab(
  {
    value,
    label,
    icon,
    iconPosition = 'top',
    badge,
    disabled = false,
    className,
    onClick,
    onFocus,
    ...rest
  },
  ref,
) {
  const ctx = useContext(TabsContext)
  const registerTab = ctx?.registerTab
  const setRef = useCallback(
    (node: HTMLButtonElement | null) => {
      registerTab?.(node, value)
      if (typeof ref === 'function') ref(node)
      else if (ref) ref.current = node
    },
    [registerTab, value, ref],
  )
  if (!ctx) throw new Error('Tab must be used within <Tabs>')
  const selected = ctx.value === value

  const hasIcon = icon != null
  const hasLabel = label != null
  // Leading icon: icon + 8dp + label form one content box, which the primary
  // indicator spans (Compose matchContentSize on LeadingIconTab's Row).
  const leading = hasIcon && iconPosition === 'start'
  const contentAttr = leading ? undefined : ''
  const badgeElement =
    isValidElement<BadgeProps>(badge) && (hasIcon || hasLabel) ? badge : null
  // The painted badge is hidden from assistive technology; its text is read
  // after the label instead (m3 badges/accessibility, as NavigationBar #175).
  const badgeText = badgeElement ? badgeAccessibleLabel(badgeElement.props) : undefined

  const iconNode = hasIcon && (
    <span className={styles.icon} aria-hidden="true" data-tab-content={contentAttr}>
      {icon}
      {badgeElement &&
        cloneElement(badgeElement, {
          className: clsx(badgeElement.props.className, styles.iconBadge),
        })}
    </span>
  )
  const labelSpan = hasLabel && (
    <span className={styles.label} data-tab-content={contentAttr}>
      {label}
    </span>
  )
  const labelNode =
    badgeElement && !hasIcon ? (
      <span className={styles.labelGroup}>
        {labelSpan}
        <span className={styles.labelBadge} aria-hidden="true">
          {badgeElement}
        </span>
      </span>
    ) : (
      labelSpan
    )

  return (
    <button
      ref={setRef}
      {...rest}
      type="button"
      role="tab"
      aria-selected={selected}
      tabIndex={ctx.tabStop === value ? 0 : -1}
      disabled={disabled}
      data-selected={selected || undefined}
      data-with-icon={hasIcon || undefined}
      data-icon-position={leading ? 'start' : undefined}
      className={clsx(styles.tab, className)}
      onFocus={(event) => {
        onFocus?.(event)
        ctx.onTabFocus(value)
      }}
      onClick={(event) => {
        onClick?.(event)
        // A consumer onClick can veto the selection with preventDefault().
        if (event.defaultPrevented) return
        ctx.onChange(event, value)
      }}
    >
      {leading ? (
        <span className={styles.content} data-tab-content="">
          {iconNode}
          {labelNode}
        </span>
      ) : (
        <>
          {iconNode}
          {labelNode}
        </>
      )}
      {badgeText && <span className={styles.visuallyHidden}>{` ${badgeText}`}</span>}
      {!disabled && <Ripple />}
      {!disabled && <FocusRing />}
    </button>
  )
})
