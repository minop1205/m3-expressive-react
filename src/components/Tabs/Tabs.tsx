import {
  createContext,
  forwardRef,
  useContext,
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

  return (
    <TabsContext.Provider value={{ value: current, onChange: handleChange, variant }}>
      <div
        ref={ref}
        {...rest}
        role="tablist"
        data-variant={variant}
        data-scrollable={scrollable || undefined}
        onKeyDown={handleKeyDown}
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
