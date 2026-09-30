import {
  createContext,
  forwardRef,
  useContext,
  type ButtonHTMLAttributes,
  type FocusEvent,
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
  /** Value of the tab that currently takes `tabIndex=0`. */
  tabStop: string
  onTabFocus: (value: string) => void
}

const isRtl = (el: Element) =>
  getComputedStyle(el).direction === 'rtl' ||
  el.closest('[dir]')?.getAttribute('dir')?.toLowerCase() === 'rtl'

const TabsContext = createContext<TabsContextValue | null>(null)

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
 * Primary tabs use a Primary content-width rounded (3dp) indicator with Primary
 * active content; secondary tabs use a full-width 3dp line with OnSurface active
 * content. Both sit above an OutlineVariant 1dp divider, per Compose
 * Primary/SecondaryNavigationTabTokens. Arrow keys move between tabs.
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
  const isControlled = value !== undefined
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? '')
  const current = isControlled ? value : uncontrolled
  const handleChange = (event: MouseEvent<HTMLButtonElement>, v: string) => {
    if (!isControlled) setUncontrolled(v)
    onChange?.(event, v)
  }

  return (
    <TabsContext.Provider
      value={{
        value: current,
        onChange: handleChange,
        variant,
        tabStop: focusedValue ?? current,
        onTabFocus: setFocusedValue,
      }}
    >
      <div
        ref={ref}
        {...rest}
        role="tablist"
        data-variant={variant}
        data-scrollable={scrollable || undefined}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className={clsx(styles.tabs, className)}
      >
        {children}
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
  { value, label, icon, disabled = false, className, onClick, onFocus, ...rest },
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
      tabIndex={ctx.tabStop === value ? 0 : -1}
      disabled={disabled}
      data-selected={selected || undefined}
      data-with-icon={icon != null || undefined}
      className={clsx(styles.tab, className)}
      onFocus={(event) => {
        onFocus?.(event)
        ctx.onTabFocus(value)
      }}
      onClick={(event) => {
        onClick?.(event)
        ctx.onChange(event, value)
      }}
    >
      {icon != null && (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      )}
      {label != null && <span className={styles.label}>{label}</span>}
      <span className={styles.indicator} aria-hidden="true" />
      {!disabled && <Ripple />}
      {!disabled && <FocusRing />}
    </button>
  )
})
