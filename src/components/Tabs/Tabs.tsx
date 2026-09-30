import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useState,
} from 'react'
import clsx from 'clsx'
import { Ripple } from '../../primitives/Ripple/Ripple'
import { FocusRing } from '../../primitives/FocusRing/FocusRing'
import styles from './Tabs.module.css'

export type TabsVariant = 'primary' | 'secondary'

interface TabsContextValue {
  value: string
  onChange: (event: MouseEvent<HTMLButtonElement>, value: string) => void
  variant: TabsVariant
}

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
  /** Fires with the triggering event and the newly selected tab value. */
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
    ...rest
  },
  ref,
) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event)
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    const tabs = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>(
        '[role="tab"]:not(:disabled)',
      ),
    )
    const currentIndex = tabs.findIndex((t) => t === document.activeElement)
    if (currentIndex === -1) return
    event.preventDefault()
    const delta = event.key === 'ArrowRight' ? 1 : -1
    const next = tabs[(currentIndex + delta + tabs.length) % tabs.length]
    next.focus()
    next.click()
  }
  const isControlled = value !== undefined
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? '')
  const current = isControlled ? value : uncontrolled
  const handleChange = (event: MouseEvent<HTMLButtonElement>, v: string) => {
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

  useLayoutEffect(() => {
    layoutIndicator('auto')
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
    <TabsContext.Provider value={{ value: current, onChange: handleChange, variant }}>
      <div
        ref={setListRef}
        {...rest}
        role="tablist"
        data-variant={variant}
        data-scrollable={scrollable || undefined}
        onKeyDown={handleKeyDown}
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
  /** Optional icon (shown above the label). */
  icon?: ReactNode
}

/** A single tab; must be rendered inside `Tabs`. */
export const Tab = forwardRef<HTMLButtonElement, TabProps>(function Tab(
  { value, label, icon, disabled = false, className, onClick, ...rest },
  ref,
) {
  const ctx = useContext(TabsContext)
  if (!ctx) throw new Error('Tab must be used within <Tabs>')
  const selected = ctx.value === value

  return (
    <button
      ref={ref}
      {...rest}
      type="button"
      role="tab"
      aria-selected={selected}
      tabIndex={selected ? 0 : -1}
      disabled={disabled}
      data-selected={selected || undefined}
      data-with-icon={icon != null || undefined}
      className={clsx(styles.tab, className)}
      onClick={(event) => {
        onClick?.(event)
        ctx.onChange(event, value)
      }}
    >
      {icon != null && (
        <span className={styles.icon} aria-hidden="true" data-tab-content="">
          {icon}
        </span>
      )}
      {label != null && (
        <span className={styles.label} data-tab-content="">
          {label}
        </span>
      )}
      {!disabled && <Ripple />}
      {!disabled && <FocusRing />}
    </button>
  )
})
