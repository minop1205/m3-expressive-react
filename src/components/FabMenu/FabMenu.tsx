import {
  Children,
  createContext,
  forwardRef,
  isValidElement,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import clsx from 'clsx'
import { Ripple } from '../../primitives/Ripple/Ripple'
import { FocusRing } from '../../primitives/FocusRing/FocusRing'
import { moveMenuFocus } from '../../internal/menuNavigation'
import styles from './FabMenu.module.css'

export type FabMenuColor = 'primary' | 'secondary' | 'tertiary'

const CloseIcon = (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
    <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
  </svg>
)

interface FabMenuContextValue {
  close: () => void
}
const FabMenuContext = createContext<FabMenuContextValue | null>(null)

export interface FabMenuProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** FAB icon shown while the menu is closed. */
  icon: ReactNode
  /** Color set. @default 'primary' */
  color?: FabMenuColor
  /** Controlled open state. */
  open?: boolean
  /** Uncontrolled initial open state. @default false */
  defaultOpen?: boolean
  /** Notified when the open state changes. */
  onOpenChange?: (open: boolean) => void
  /** Accessible label for the FAB (closed state). */
  ariaLabel: string
  /** Accessible label for the close button (open state). @default 'Close menu' */
  closeAriaLabel?: string
  /** `FabMenuItem`s (up to six). */
  children?: ReactNode
}

/**
 * Material Design 3 (Expressive) FAB menu.
 *
 * A FAB that opens into a vertical stack of labelled action items anchored to
 * its top-trailing edge. The FAB morphs into a 56dp close button (container
 * primaryContainer → primary, icon onPrimaryContainer → onPrimary) and the items
 * stagger in — per m3.material.io / Compose FloatingActionButtonMenu. Items use
 * the container/on-container roles of the chosen color set (primary / secondary
 * / tertiary). Closes on outside click, Escape, or item selection.
 *
 * Keyboard / focus (m3.material.io a11y + Compose FloatingActionButtonMenu +
 * WAI-ARIA APG menu): opening keeps focus on the toggle; Tab / ArrowDown from
 * the open toggle move to the top item (ArrowUp: the bottom one); ArrowUp /
 * ArrowDown cycle the items with wrap, Home / End jump; Shift+Tab returns to
 * the toggle; Tab closes and leaves the component; Escape and item selection
 * close and return focus to the toggle. While closed the item list is `inert`
 * and `aria-hidden`, so hidden items are out of the Tab order and the
 * accessibility tree while they still animate out.
 */
export const FabMenu = forwardRef<HTMLDivElement, FabMenuProps>(function FabMenu(
  {
    icon,
    color = 'primary',
    open: controlledOpen,
    defaultOpen = false,
    onOpenChange,
    ariaLabel,
    closeAriaLabel = 'Close menu',
    className,
    children,
    ...rest
  },
  ref,
) {
  const isControlled = controlledOpen !== undefined
  const [uncontrolled, setUncontrolled] = useState(defaultOpen)
  const open = isControlled ? controlledOpen : uncontrolled
  const rootRef = useRef<HTMLDivElement | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)

  const setOpen = (value: boolean) => {
    if (!isControlled) setUncontrolled(value)
    onOpenChange?.(value)
  }

  const focusToggle = () => toggleRef.current?.focus()

  /** Closes the menu; focus returns to the toggle when it was inside. */
  const closeMenu = () => {
    if (rootRef.current?.contains(document.activeElement)) focusToggle()
    setOpen(false)
  }

  const getItems = () =>
    Array.from(
      listRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)') ?? [],
    )

  // Closed items leave the Tab order and the accessibility tree (Compose clears
  // the hidden items' semantics). `inert` is set through the DOM because React
  // 18 has no boolean `inert` prop. If the menu closes (e.g. controlled) while
  // an item holds focus, move it to the toggle instead of dropping it.
  useLayoutEffect(() => {
    const list = listRef.current
    if (!list) return
    list.toggleAttribute('inert', !open)
    if (!open && list.contains(document.activeElement)) focusToggle()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: globalThis.MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu()
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleToggleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!open) return
    const forward = (event.key === 'Tab' && !event.shiftKey) || event.key === 'ArrowDown'
    if (!forward && event.key !== 'ArrowUp') return
    const items = getItems()
    const target = event.key === 'ArrowUp' ? items[items.length - 1] : items[0]
    if (!target) return
    event.preventDefault()
    target.focus()
  }

  const handleListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (moveMenuFocus(event, getItems())) return
    if (event.key !== 'Tab') return
    if (event.shiftKey) {
      // Shift+Tab goes back to the (close) toggle, keeping the menu open.
      event.preventDefault()
      focusToggle()
    } else {
      // APG: Tab closes the menu and continues in the page's Tab order. Moving
      // focus to the toggle first makes the native Tab leave the component.
      focusToggle()
      setOpen(false)
    }
  }

  const items = Children.toArray(children).filter(isValidElement)
  const count = items.length

  return (
    <div
      ref={(node) => {
        rootRef.current = node
        if (typeof ref === 'function') ref(node)
        else if (ref) (ref as { current: HTMLDivElement | null }).current = node
      }}
      {...rest}
      data-color={color}
      data-open={open || undefined}
      className={clsx(styles.root, className)}
    >
      <button
        ref={toggleRef}
        type="button"
        className={styles.fab}
        aria-label={open ? closeAriaLabel : ariaLabel}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen(!open)}
        onKeyDown={handleToggleKeyDown}
      >
        <span className={styles.fabIcon} aria-hidden="true">
          {open ? CloseIcon : icon}
        </span>
        <Ripple />
        <FocusRing />
      </button>

      {/* After the toggle in DOM order (focus order toggle → top item → …);
          positioned above it visually. */}
      <div
        ref={listRef}
        className={styles.list}
        role="menu"
        aria-label={ariaLabel}
        aria-hidden={open ? undefined : true}
        data-open={open || undefined}
        onKeyDown={handleListKeyDown}
      >
        <FabMenuContext.Provider value={{ close: closeMenu }}>
          {items.map((item, index) => (
            <div
              key={index}
              className={styles.itemSlot}
              // Items nearest the FAB (last) appear first when opening.
              style={{ '--_stagger': `${(count - 1 - index) * 30}ms` } as CSSProperties}
            >
              {item}
            </div>
          ))}
        </FabMenuContext.Provider>
      </div>
    </div>
  )
})

export interface FabMenuItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Leading icon (decorative). */
  icon?: ReactNode
  children?: ReactNode
}

/** A labelled action inside a `FabMenu`. */
export const FabMenuItem = forwardRef<HTMLButtonElement, FabMenuItemProps>(
  function FabMenuItem({ icon, className, children, onClick, ...rest }, ref) {
    const ctx = useContext(FabMenuContext)
    return (
      <button
        ref={ref}
        {...rest}
        type="button"
        role="menuitem"
        // Roving tabindex — the FabMenu moves focus into the items; they never
        // join the page Tab order themselves.
        tabIndex={-1}
        className={clsx(styles.item, className)}
        onClick={(event) => {
          onClick?.(event)
          ctx?.close()
        }}
      >
        {icon != null && (
          <span className={styles.itemIcon} aria-hidden="true">
            {icon}
          </span>
        )}
        <span className={styles.itemLabel}>{children}</span>
        <Ripple />
        <FocusRing />
      </button>
    )
  },
)
