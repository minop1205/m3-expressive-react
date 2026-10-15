'use client'

import {
  cloneElement,
  createContext,
  forwardRef,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  type AnchorHTMLAttributes,
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
import { devWarnOnce } from '../../internal/devWarning'
import styles from './Tabs.module.css'
import { useLocaleLabels } from '../../internal/locale'

export type TabsVariant = 'primary' | 'secondary'

/** Where a `Tab`'s icon sits relative to its label. */
export type TabIconPosition = 'top' | 'start'

/** The click event `onChange` receives: from a `<button>` tab or a link (`href`) tab. */
export type TabChangeEvent = MouseEvent<HTMLButtonElement | HTMLAnchorElement>

interface TabsContextValue {
  value: string
  onChange: (event: TabChangeEvent, value: string) => void
  variant: TabsVariant
  /** Value of the tab that currently takes `tabIndex=0`. */
  tabStop: string
  onTabFocus: (value: string) => void
  /** Records each tab element's value so the list can resolve a fallback stop. */
  registerTab: (el: HTMLElement | null, value: string) => void
  /** The enclosing `TabContext` (tab / panel linking), if any. */
  group: TabGroupValue | null
}

interface TabGroupValue {
  value: string
  onChange: (event: TabChangeEvent, value: string) => void
  idBase: string
  /** Values of the mounted `TabPanel`s (a tab only points `aria-controls` at a rendered panel). */
  panels: ReadonlySet<string>
  registerPanel: (value: string) => () => void
}

const TabGroupContext = createContext<TabGroupValue | null>(null)

// Tab values may hold any characters; ids (IDREF lists) must not contain
// whitespace, so everything outside [A-Za-z0-9_-] is escaped deterministically.
const idPart = (value: string) =>
  value.replace(/[^A-Za-z0-9_-]/g, (c) => `_${c.charCodeAt(0).toString(16)}_`)
const tabId = (base: string, value: string) => `${base}-tab-${idPart(value)}`
const panelId = (base: string, value: string) => `${base}-panel-${idPart(value)}`

/** Enabled tabs of a list: native-disabled buttons and `aria-disabled` link tabs are skipped. */
const ENABLED_TAB = '[role="tab"]:not(:disabled):not([aria-disabled="true"])'

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
   * `onClick` called `event.preventDefault()`. On a link (`href`) tab it
   * fires before the browser follows the link; call `event.preventDefault()`
   * here to navigate with a client-side router instead.
   */
  onChange?(event: TabChangeEvent, value: string): void
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
 * OutlineVariant 1dp divider. Arrow keys move focus between tabs; Space /
 * Enter select (manual activation, m3 a11y). Tabs with `href` are navigation
 * links. Inside a `TabContext`, tabs are linked to their `TabPanel`s. The
 * container color is the `--md-tabs-container-color` custom property
 * (default `--md-sys-color-surface`).
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
    const tabs = Array.from(list.querySelectorAll<HTMLElement>(ENABLED_TAB)).filter(
      (t) => t.closest('[role="tablist"]') === list,
    )
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
  const group = useContext(TabGroupContext)
  const [ownValue, setUncontrolled, isControlled] = useControllableState({
    value,
    defaultValue: defaultValue ?? '',
    name: 'Tabs',
    state: 'value',
  })
  const ignoredOwnValue = group !== null && (value !== undefined || defaultValue !== undefined)
  useEffect(() => {
    if (ignoredOwnValue) {
      devWarnOnce(
        'Tabs inside a TabContext take the selection from the TabContext; ' +
          'pass value / defaultValue to TabContext instead (Tabs value / defaultValue are ignored).',
      )
    }
  }, [ignoredOwnValue])
  // Inside a TabContext the selection lives there (shared with the TabPanels).
  const current = group ? group.value : ownValue
  const preferredStop = focusedValue ?? current

  // Fallback tab stop: when the preferred stop matches no enabled tab (no
  // selection, a stale value, or a disabled selected tab), the first enabled
  // tab takes tabIndex=0 so the list stays reachable (WAI-ARIA APG Tabs).
  const tabValues = useRef(new Map<HTMLElement, string>())
  const registerTab = useCallback((el: HTMLElement | null, v: string) => {
    // Called with the element on mount and null on unmount; prune detached ones.
    if (el) tabValues.current.set(el, v)
    tabValues.current.forEach((_, node) => {
      if (!node.isConnected && node !== el) tabValues.current.delete(node)
    })
  }, [])
  const [fallbackStop, setFallbackStop] = useState<string | null>(null)
  const handleChange = (event: TabChangeEvent, v: string) => {
    // Re-selecting the selected tab is a no-op (MUI / Compose).
    if (v === current) return
    if (group) group.onChange(event, v)
    else if (!isControlled) setUncontrolled(v)
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
    const enabled = Array.from(list.querySelectorAll<HTMLElement>(ENABLED_TAB)).filter(
      (t) => t.closest('[role="tablist"]') === list,
    )
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
        group,
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
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'value' | 'onClick'> {
  /** Identifies the tab; matched against the parent `Tabs` value. */
  value: string
  /**
   * Make the tab a navigation link (m3 navigation tab): renders
   * `<a role="tab" href>` with the same look, keyboard behavior (arrows move
   * focus, Space / Enter activate) and selection through the `Tabs` value.
   * The browser follows the link; `onChange` fires first (not for
   * Ctrl / Cmd / Shift / Alt clicks, which open elsewhere), so a client-side
   * router can `preventDefault()` there and navigate itself. Link tabs have
   * no `TabPanel` (no `aria-controls`) and no `aria-current` (the selection
   * is `aria-selected`; pass `aria-current` yourself if needed).
   */
  href?: string
  /** `<a target>` — only with `href`. */
  target?: AnchorHTMLAttributes<HTMLAnchorElement>['target']
  /** `<a rel>` — only with `href`. */
  rel?: AnchorHTMLAttributes<HTMLAnchorElement>['rel']
  /** `<a download>` — only with `href`. */
  download?: AnchorHTMLAttributes<HTMLAnchorElement>['download']
  /**
   * Click handler (button or link tab). `event.preventDefault()` keeps the
   * selection (and, on a link tab, the navigation) from happening.
   */
  onClick?(event: TabChangeEvent): void
  /** Tab label. */
  label?: ReactNode
  /** Optional icon (24dp), above the label or before it (see `iconPosition`). */
  icon?: ReactNode
  /**
   * Icon placement: `'top'` stacks the icon above the label (64dp tab),
   * `'start'` puts it before the label with an 8dp gap (48dp tab, Compose
   * `LeadingIconTab`). Available on both variants, but m3 secondary tabs
   * normally have no icon (the secondary anatomy has none).
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

const isModifiedClick = (event: TabChangeEvent) =>
  event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0

/** A single tab; must be rendered inside `Tabs`. With `href` it is a link tab. */
export const Tab = forwardRef<HTMLButtonElement | HTMLAnchorElement, TabProps>(function Tab(
  {
    value,
    href,
    target,
    rel,
    download,
    label,
    icon,
    iconPosition = 'top',
    badge,
    disabled = false,
    className,
    onClick,
    onFocus,
    onKeyDown,
    onKeyUp,
    ...rest
  },
  ref,
) {
  const ctx = useContext(TabsContext)
  const registerTab = ctx?.registerTab
  const setRef = useCallback(
    (node: HTMLButtonElement | HTMLAnchorElement | null) => {
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
  const { getLabel: getBadgeLabel } = useLocaleLabels('Badge')
  const badgeText = badgeElement
    ? badgeAccessibleLabel(badgeElement.props, getBadgeLabel)
    : undefined
  const isLink = href != null
  // TabContext linking (APG Tabs): id always, aria-controls only when the
  // matching TabPanel is mounted. Link tabs have no panel.
  const group = isLink ? null : ctx.group
  const linkedId = group ? tabId(group.idBase, value) : undefined
  const controls = group && group.panels.has(value) ? panelId(group.idBase, value) : undefined

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

  const handleClick = (event: TabChangeEvent) => {
    onClick?.(event)
    // A consumer onClick can veto the selection with preventDefault().
    if (event.defaultPrevented) return
    // A modified click on a link opens it elsewhere; this page stays put.
    if (isLink && isModifiedClick(event)) return
    ctx.onChange(event, value)
  }

  const common = {
    // Only set when linked, so an `id` / `aria-controls` passed by the
    // consumer outside a TabContext still applies.
    ...(linkedId ? { id: linkedId } : null),
    ...(controls ? { 'aria-controls': controls } : null),
    role: 'tab',
    'aria-selected': selected,
    tabIndex: ctx.tabStop === value ? 0 : -1,
    'data-selected': selected || undefined,
      // The 64dp stacked height applies only with both an icon and a label
      // (Compose TabBaselineLayout: LargeTabHeight vs SmallTabHeight, #484);
      // an icon-only tab stays 48dp.
    'data-with-icon': (hasIcon && hasLabel) || undefined,
    'data-icon-position': leading ? 'start' : undefined,
    className: clsx(styles.tab, className),
    onFocus: (event: FocusEvent<HTMLButtonElement | HTMLAnchorElement>) => {
      onFocus?.(event as FocusEvent<HTMLButtonElement>)
      ctx.onTabFocus(value)
    },
  }

  const content = (
    <>
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
    </>
  )

  if (isLink) {
    const anchorRest = rest as unknown as AnchorHTMLAttributes<HTMLAnchorElement>
    return (
      <a
        ref={setRef}
        {...anchorRest}
        {...common}
        // A disabled link has no href (not focusable, not followable).
        href={disabled ? undefined : href}
        target={target}
        rel={rel}
        download={download}
        aria-disabled={disabled || undefined}
        onClick={disabled ? undefined : handleClick}
        onKeyDown={(event) => {
          onKeyDown?.(event as unknown as KeyboardEvent<HTMLButtonElement>)
          // m3 a11y: Space activates too. Stop the page scroll on keydown and
          // activate on keyup, like a native button.
          if (event.key === ' ' && !event.defaultPrevented) event.preventDefault()
        }}
        onKeyUp={(event) => {
          onKeyUp?.(event as unknown as KeyboardEvent<HTMLButtonElement>)
          if (event.key === ' ' && !event.defaultPrevented && !disabled) {
            event.currentTarget.click()
          }
        }}
      >
        {content}
      </a>
    )
  }

  return (
    <button
      ref={setRef}
      {...rest}
      {...common}
      type="button"
      disabled={disabled}
      onClick={handleClick}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
    >
      {content}
    </button>
  )
})

export interface TabContextProps {
  /** Controlled selected tab value, shared by the `Tabs` and `TabPanel`s inside. */
  value?: string
  /** Uncontrolled initial tab value. */
  defaultValue?: string
  /** Fires with the triggering event and the newly selected tab value. */
  onChange?(event: TabChangeEvent, value: string): void
  children?: ReactNode
}

/**
 * Links a `Tabs` row to its `TabPanel`s (WAI-ARIA APG Tabs): holds the
 * selection (controlled / uncontrolled) and gives every tab an `id` and an
 * `aria-controls` pointing at the `TabPanel` with the same `value`, which is
 * in turn `aria-labelledby` its tab. Renders no element. Put `value` /
 * `defaultValue` / `onChange` here; the inner `Tabs`' own `onChange` still
 * fires.
 */
export function TabContext({ value, defaultValue, onChange, children }: TabContextProps) {
  const [current, setUncontrolled, isControlled] = useControllableState({
    value,
    defaultValue: defaultValue ?? '',
    name: 'TabContext',
    state: 'value',
  })
  const idBase = useId()
  const [panels, setPanels] = useState<ReadonlySet<string>>(() => new Set())
  const registerPanel = useCallback((v: string) => {
    setPanels((prev) => (prev.has(v) ? prev : new Set(prev).add(v)))
    return () =>
      setPanels((prev) => {
        if (!prev.has(v)) return prev
        const next = new Set(prev)
        next.delete(v)
        return next
      })
  }, [])
  const handleChange = (event: TabChangeEvent, v: string) => {
    if (!isControlled) setUncontrolled(v)
    onChange?.(event, v)
  }
  return (
    <TabGroupContext.Provider
      value={{ value: current, onChange: handleChange, idBase, panels, registerPanel }}
    >
      {children}
    </TabGroupContext.Provider>
  )
}

export interface TabPanelProps extends HTMLAttributes<HTMLDivElement> {
  /** The `Tab` value this panel belongs to. */
  value: string
  children?: ReactNode
}

/**
 * The content of one tab (`role="tabpanel"`); must be rendered inside a
 * `TabContext`. Hidden (`hidden`, still mounted) unless its `value` is
 * selected. `tabIndex` defaults to `0` so the panel itself is reachable with
 * Tab (APG, for panels that do not start with focusable content); pass
 * `tabIndex={-1}` when the panel starts with a focusable element.
 */
export const TabPanel = forwardRef<HTMLDivElement, TabPanelProps>(function TabPanel(
  { value, tabIndex = 0, children, ...rest },
  ref,
) {
  const group = useContext(TabGroupContext)
  const registerPanel = group?.registerPanel
  useEffect(() => registerPanel?.(value), [registerPanel, value])
  if (!group) throw new Error('TabPanel must be used within <TabContext>')
  const selected = group.value === value
  return (
    <div
      ref={ref}
      {...rest}
      role="tabpanel"
      id={panelId(group.idBase, value)}
      aria-labelledby={tabId(group.idBase, value)}
      tabIndex={tabIndex}
      hidden={!selected}
    >
      {children}
    </div>
  )
})
