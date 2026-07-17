import {
  Children,
  cloneElement,
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from 'react'
import clsx from 'clsx'
import { Ripple } from '../../primitives/Ripple/Ripple'
import { FocusRing } from '../../primitives/FocusRing/FocusRing'
import styles from './Menu.module.css'

interface MenuContextValue {
  close: () => void
}

const MenuContext = createContext<MenuContextValue | null>(null)

export type MenuAlign = 'start' | 'end'

export interface MenuProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** The element that opens the menu (a single button-like element). */
  trigger: ReactElement
  /** `MenuItem`s. */
  children: ReactNode
  /** Controlled open state. */
  open?: boolean
  /** Uncontrolled initial open state. @default false */
  defaultOpen?: boolean
  /** Notified when the open state should change. */
  onOpenChange?: (open: boolean) => void
  /** Horizontal alignment to the trigger. @default 'start' */
  align?: MenuAlign
}

/** How long a pause resets the typeahead buffer (APG-typical). */
const TYPEAHEAD_RESET_MS = 500

/** Gap between the trigger and the menu (kept in sync with the CSS). */
const ANCHOR_GAP_PX = 4

/**
 * Material Design 3 Menu (dropdown).
 *
 * Anchors a `role="menu"` popup to a trigger. SurfaceContainer container, 4dp
 * corners, elevation 2, 112–280dp wide, 8dp vertical padding — per Compose
 * MenuTokens. Closes on outside click, Escape, Tab-out, or item selection.
 *
 * Keyboard (WAI-ARIA APG menu-button pattern): Enter/Space/ArrowDown open and
 * focus the first item (ArrowUp: the last); ArrowUp/Down cycle with wrap;
 * Home/End jump; printable characters move focus by typeahead; Escape and
 * item activation close and return focus to the trigger. Items use a roving
 * tabindex (-1) so the closed/open menu never pollutes the page Tab order;
 * disabled items are focusable but inert (`aria-disabled`).
 */
export const Menu = forwardRef<HTMLDivElement, MenuProps>(function Menu(
  {
    trigger,
    children,
    open: controlledOpen,
    defaultOpen = false,
    onOpenChange,
    align = 'start',
    className,
    onKeyDown,
    ...rest
  },
  ref,
) {
  const [uncontrolled, setUncontrolled] = useState(defaultOpen)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolled
  const wrapperRef = useRef<HTMLSpanElement>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [placement, setPlacement] = useState<'below' | 'above'>('below')
  // Where to move focus once the menu opens ('last' for ArrowUp on the trigger).
  const pendingFocus = useRef<'first' | 'last'>('first')
  const typeahead = useRef({ buffer: '', at: 0 })

  const setOpen = (value: boolean) => {
    if (!isControlled) setUncontrolled(value)
    onOpenChange?.(value)
  }

  // The trigger is always the wrapper's first element child; focusing it via
  // the DOM avoids fragile ref-merging with a user-provided element.
  const focusTrigger = () => {
    const el = wrapperRef.current?.firstElementChild as HTMLElement | null
    el?.focus()
  }

  const closeMenu = (restoreFocus: boolean) => {
    setOpen(false)
    if (restoreFocus) focusTrigger()
  }

  const getItems = () =>
    Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])

  // Collision handling (Compose falls back Below → Above): before paint,
  // flip above the trigger when the space below can't fit the menu and the
  // space above is larger.
  useLayoutEffect(() => {
    if (!open) {
      setPlacement('below')
      return
    }
    const anchor = wrapperRef.current?.getBoundingClientRect()
    const menuHeight = menuRef.current?.offsetHeight ?? 0
    if (!anchor) return
    const spaceBelow = window.innerHeight - anchor.bottom
    const spaceAbove = anchor.top
    setPlacement(
      spaceBelow < menuHeight + ANCHOR_GAP_PX && spaceAbove > spaceBelow ? 'above' : 'below',
    )
  }, [open])

  useEffect(() => {
    if (!open) return
    const items = getItems()
    const target = pendingFocus.current === 'last' ? items[items.length - 1] : items[0]
    pendingFocus.current = 'first'
    target?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: globalThis.MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const onDocKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu(true)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onDocKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onDocKeyDown)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event)
    const items = getItems()
    if (items.length === 0) return
    const current = items.indexOf(document.activeElement as HTMLElement)

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        items[(current + 1) % items.length]?.focus()
        return
      case 'ArrowUp':
        event.preventDefault()
        items[(current - 1 + items.length) % items.length]?.focus()
        return
      case 'Home':
        event.preventDefault()
        items[0]?.focus()
        return
      case 'End':
        event.preventDefault()
        items[items.length - 1]?.focus()
        return
      case 'Tab':
        // APG: Tab closes the menu and moves focus per the page's Tab order.
        setOpen(false)
        return
    }

    // Typeahead: printable characters move focus to the next matching item.
    if (event.key.length === 1 && /\S/.test(event.key) && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const now = Date.now()
      const state = typeahead.current
      if (now - state.at > TYPEAHEAD_RESET_MS) state.buffer = ''
      state.at = now
      state.buffer += event.key.toLowerCase()
      // A repeated single character cycles through matches; a growing buffer
      // keeps matching from the focused item.
      const searchFrom = state.buffer.length === 1 ? current + 1 : Math.max(current, 0)
      for (let offset = 0; offset < items.length; offset++) {
        const item = items[(searchFrom + offset + items.length) % items.length]
        if ((item.textContent ?? '').trim().toLowerCase().startsWith(state.buffer)) {
          item.focus()
          return
        }
      }
    }
  }

  const child = Children.only(trigger) as ReactElement<{
    onClick?: (event: MouseEvent) => void
    onKeyDown?: (event: KeyboardEvent) => void
  }>
  const triggerEl = cloneElement(child, {
    onClick: (event: MouseEvent) => {
      child.props.onClick?.(event)
      setOpen(!open)
    },
    onKeyDown: (event: KeyboardEvent) => {
      child.props.onKeyDown?.(event)
      if (event.defaultPrevented) return
      // Enter/Space open via the native click; the open effect focuses the
      // first item. Arrow keys open with an explicit target.
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        pendingFocus.current = event.key === 'ArrowUp' ? 'last' : 'first'
        if (open) {
          const items = getItems()
          ;(event.key === 'ArrowUp' ? items[items.length - 1] : items[0])?.focus()
        } else {
          setOpen(true)
        }
      }
    },
    'aria-haspopup': 'menu',
    'aria-expanded': open,
  } as Partial<typeof child.props>)

  const setMenuRef = (node: HTMLDivElement | null) => {
    menuRef.current = node
    if (typeof ref === 'function') ref(node)
    else if (ref) ref.current = node
  }

  return (
    <span ref={wrapperRef} className={styles.wrapper}>
      {triggerEl}
      <div
        ref={setMenuRef}
        {...rest}
        role="menu"
        data-open={open || undefined}
        data-align={align}
        data-placement={placement}
        className={clsx(styles.menu, className)}
        onKeyDown={handleMenuKeyDown}
      >
        <MenuContext.Provider value={{ close: () => closeMenu(true) }}>
          {children}
        </MenuContext.Provider>
      </div>
    </span>
  )
})

export interface MenuItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  leadingIcon?: ReactNode
  trailingIcon?: ReactNode
  children?: ReactNode
}

/** A selectable item inside a `Menu`. */
export const MenuItem = forwardRef<HTMLButtonElement, MenuItemProps>(
  function MenuItem(
    { leadingIcon, trailingIcon, disabled = false, className, children, onClick, ...rest },
    ref,
  ) {
    const ctx = useContext(MenuContext)
    return (
      <button
        ref={ref}
        {...rest}
        type="button"
        role="menuitem"
        // Roving tabindex — the menu manages focus; items never join the page
        // Tab order. Disabled items stay focusable but inert (APG guidance),
        // so `aria-disabled` instead of the `disabled` attribute.
        tabIndex={-1}
        aria-disabled={disabled || undefined}
        className={clsx(styles.item, className)}
        onClick={(event) => {
          if (disabled) return
          onClick?.(event)
          ctx?.close()
        }}
      >
        {leadingIcon != null && (
          <span className={styles.leading} aria-hidden="true">
            {leadingIcon}
          </span>
        )}
        <span className={styles.label}>{children}</span>
        {trailingIcon != null && (
          <span className={styles.trailing} aria-hidden="true">
            {trailingIcon}
          </span>
        )}
        {!disabled && <Ripple />}
        {!disabled && <FocusRing />}
      </button>
    )
  },
)
