import {
  Children,
  createContext,
  forwardRef,
  Fragment,
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
  type ReactElement,
  type ReactNode,
} from 'react'
import clsx from 'clsx'
import { Ripple } from '../../primitives/Ripple/Ripple'
import { FocusRing } from '../../primitives/FocusRing/FocusRing'
import { moveMenuFocus } from '../../internal/menuNavigation'
import { effectsSprings } from '../../tokens/motion'
import styles from './FabMenu.module.css'

export type FabMenuColor = 'primary' | 'secondary' | 'tertiary'

/** Size of the closed FAB (Fab vocabulary). @default 'regular' */
export type FabMenuSize = 'regular' | 'medium' | 'large'

const CloseIcon = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
  </svg>
)

/** Children as a flat list of elements — Fragments are unwrapped (#205). */
function flattenChildren(children: ReactNode, prefix = ''): ReactElement[] {
  const out: ReactElement[] = []
  Children.toArray(children).forEach((child, index) => {
    if (!isValidElement(child)) return
    const key = `${prefix}${child.key ?? index}`
    if (child.type === Fragment) {
      out.push(...flattenChildren((child.props as { children?: ReactNode }).children, `${key}/`))
    } else {
      out.push(<Fragment key={key}>{child}</Fragment>)
    }
  })
  return out
}

/**
 * Stagger delays per Compose `FloatingActionButtonMenu`: an integer count of
 * visible items animates on the SlowEffects spring (critically damped, with a
 * visibility threshold of 1 item) — opening reveals the bottom item first,
 * closing hides the top item first. Returns, per item (top = index 0), the
 * time at which the count reaches it.
 */
function staggerDelays(count: number): { enter: number[]; exit: number[] } {
  const w = Math.sqrt(effectsSprings.slow.stiffness)
  // Critically damped step response: p(t) = 1 - (1 + wt)e^(-wt).
  const timeAt = (p: number) => {
    if (p <= 0) return 0
    let lo = 0
    let hi = 2
    for (let i = 0; i < 40; i++) {
      const t = (lo + hi) / 2
      if (1 - (1 + w * t) * Math.exp(-w * t) < p) lo = t
      else hi = t
    }
    return Math.round(hi * 1000)
  }
  const enter: number[] = []
  const exit: number[] = []
  for (let index = 0; index < count; index++) {
    const fromBottom = count - index
    // The spring settles (snaps to the target) once within one item of it.
    enter.push(timeAt(Math.min(fromBottom, count - 1) / count))
    exit.push(timeAt(index / count))
  }
  return { enter, exit }
}

let warnedCloseAriaLabel = false

interface FabMenuContextValue {
  close: () => void
}
const FabMenuContext = createContext<FabMenuContextValue | null>(null)

export interface FabMenuProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** FAB icon shown while the menu is closed. */
  icon: ReactNode
  /**
   * Color set. Items use its `*-container` roles; the open close button its
   * base roles (e.g. `primary` / `on-primary`). @default 'primary'
   */
  color?: FabMenuColor
  /**
   * Closed FAB colors: `true` (the default) uses the tonal `*-container`
   * roles, `false` the high-emphasis base roles (same as the open close
   * button) — the Fab `tonal` prop. @default true
   */
  tonal?: boolean
  /**
   * Size of the closed FAB — the menu can open from any FAB size (Fab
   * vocabulary). The close button is always 56dp, pinned to the top-trailing
   * corner of the FAB's footprint. @default 'regular'
   */
  size?: FabMenuSize
  /** Controlled open state. */
  open?: boolean
  /** Uncontrolled initial open state. @default false */
  defaultOpen?: boolean
  /** Notified when the open state changes. */
  onOpenChange?: (open: boolean) => void
  /**
   * Accessible label for the toggle — describes the menu it opens. It stays
   * the same while open; the state is exposed through `aria-expanded`. Also
   * names the menu.
   */
  ariaLabel: string
  /**
   * @deprecated Ignored — the toggle keeps `ariaLabel` in both states and
   * exposes open / closed through `aria-expanded` (m3 / APG). Will be removed
   * in v2.
   */
  closeAriaLabel?: string
  /** `FabMenuItem`s (up to six). */
  children?: ReactNode
}

/**
 * Material Design 3 (Expressive) FAB menu.
 *
 * A FAB (regular / medium / large) that opens into a vertical stack of
 * labelled action items anchored to its top-trailing edge. The FAB morphs into
 * a 56dp close button pinned to the top-trailing corner of its footprint
 * (container primaryContainer → primary, icon onPrimaryContainer → onPrimary)
 * and the items reveal from the trailing edge, bottom item first — per
 * m3.material.io / Compose FloatingActionButtonMenu. Items use the
 * container/on-container roles of the chosen color set (primary / secondary /
 * tertiary). Closes on outside click, Escape, or item selection. Items may be
 * passed directly or inside Fragments.
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
    tonal = true,
    size = 'regular',
    open: controlledOpen,
    defaultOpen = false,
    onOpenChange,
    ariaLabel,
    closeAriaLabel,
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

  useEffect(() => {
    if (closeAriaLabel === undefined || warnedCloseAriaLabel) return
    warnedCloseAriaLabel = true
    console.warn(
      'FabMenu: `closeAriaLabel` is deprecated and ignored — the toggle keeps `ariaLabel` ' +
        'and exposes the open state through aria-expanded. It will be removed in v2.',
    )
  }, [closeAriaLabel])

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
    // Escape closes only the menu: preventDefault marks it consumed so an
    // enclosing modal (useModal, which listens after `document`) ignores it.
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      event.preventDefault()
      closeMenu()
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

  const items = flattenChildren(children)
  const count = items.length
  const delays = staggerDelays(count)

  return (
    <div
      ref={(node) => {
        rootRef.current = node
        if (typeof ref === 'function') ref(node)
        else if (ref) (ref as { current: HTMLDivElement | null }).current = node
      }}
      {...rest}
      data-color={color}
      data-tonal={tonal || undefined}
      data-size={size}
      data-open={open || undefined}
      className={clsx(styles.root, className)}
    >
      {/* The closed FAB's footprint; the close button shrinks into its
          top-trailing corner (Compose ToggleFloatingActionButton). */}
      <span className={styles.fabSlot}>
        <button
          ref={toggleRef}
          type="button"
          className={styles.fab}
          aria-label={ariaLabel}
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
      </span>

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
              key={item.key}
              className={styles.itemSlot}
              // Opening reveals the bottom item first, closing hides the top
              // item first (Compose's SlowEffects item-count spring).
              style={
                {
                  '--_enter-delay': `${delays.enter[index]}ms`,
                  '--_exit-delay': `${delays.exit[index]}ms`,
                } as CSSProperties
              }
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
