import {
  Children,
  cloneElement,
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useId,
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
import { usePopupPosition } from '../../internal/usePopupPosition'
import {
  createMenuTypeahead,
  handleMenuTypeahead,
  moveMenuFocus,
} from '../../internal/menuNavigation'
import styles from './Menu.module.css'

interface MenuContextValue {
  close: () => void
}

const MenuContext = createContext<MenuContextValue | null>(null)

export type MenuAlign = 'start' | 'end'

export type MenuVariant = 'standard' | 'vertical'

export type MenuColor = 'standard' | 'vibrant'

export interface MenuProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'color'> {
  /** The element that opens the menu (a single button-like element). */
  trigger: ReactElement
  /** `MenuItem`s — or, for the `vertical` variant, `MenuGroup`s. */
  children: ReactNode
  /** Controlled open state. */
  open?: boolean
  /** Uncontrolled initial open state. @default false */
  defaultOpen?: boolean
  /** Notified when the open state should change. */
  onOpenChange?: (open: boolean) => void
  /** Horizontal alignment to the trigger. @default 'start' */
  align?: MenuAlign
  /**
   * `'standard'` is the baseline dropdown menu; `'vertical'` is the MD3
   * Expressive vertical menu (segmented `MenuGroup` containers, 44dp items,
   * selected states with shape morph). @default 'standard'
   */
  variant?: MenuVariant
  /**
   * Color option for the `vertical` variant: `'standard'` (surface based) or
   * `'vibrant'` (tertiary based, higher emphasis). @default 'standard'
   */
  color?: MenuColor
}

/** Gap between the trigger and the menu. */
const ANCHOR_GAP_PX = 4

/** Minimum distance the menu keeps from the viewport edges when clamped. */
const VIEWPORT_MARGIN_PX = 8

/**
 * Material Design 3 Menu (dropdown).
 *
 * Anchors a `role="menu"` popup to a trigger. SurfaceContainer container, 4dp
 * corners, elevation 2, 112–280dp wide, 8dp vertical padding — per Compose
 * MenuTokens. Closes on outside press, Escape, Tab-out (or any focus move out
 * of it), or item selection. The trigger gets `aria-controls`, and the menu
 * is named by the trigger (`aria-labelledby`) unless it has its own label.
 * The menu is drawn in the top layer (Popover API) below the trigger — above
 * it when it doesn't fit below — and kept inside the viewport, so ancestors'
 * `overflow` / `z-index` can't clip it; it follows scrolling and layout shifts.
 *
 * `variant="vertical"` renders the MD3 Expressive vertical menu (Compose
 * `DropdownMenuPopup`/`DropdownMenuGroup`): a transparent popup that stacks
 * `MenuGroup` containers (surface-container-low, elevation 2, 2dp gap) with
 * 44dp items, 20dp icons, positional corner shapes, and a tertiary-based
 * selected state with a springy shape morph. `color="vibrant"` switches the
 * groups and items to the tertiary-container based high-emphasis mapping.
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
    variant = 'standard',
    color = 'standard',
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
  // Where to move focus once the menu opens ('last' for ArrowUp on the trigger).
  const pendingFocus = useRef<'first' | 'last'>('first')
  const typeahead = useRef(createMenuTypeahead())
  const autoId = useId()

  // Read through a ref: the document listeners below are bound once per
  // open, so they must not call a stale `onOpenChange`.
  const latest = useRef({ isControlled, onOpenChange })
  latest.current = { isControlled, onOpenChange }
  const setOpen = (value: boolean) => {
    if (!latest.current.isControlled) setUncontrolled(value)
    latest.current.onOpenChange?.(value)
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
    Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>(
        '[role="menuitem"], [role="menuitemcheckbox"]',
      ) ?? [],
    )

  // Positioning (Compose DropdownMenuPositionProvider): below the trigger,
  // flipped above when it doesn't fit there and the space above is larger,
  // clamped inside the viewport; top layer via the shared popup helper (B4).
  const side = usePopupPosition({
    open,
    anchorRef: wrapperRef,
    popupRef: menuRef,
    side: 'bottom',
    align,
    gap: ANCHOR_GAP_PX,
    margin: VIEWPORT_MARGIN_PX,
  })
  const placement = side === 'top' ? 'above' : 'below'

  useEffect(() => {
    if (!open) return
    const items = getItems()
    const target = pendingFocus.current === 'last' ? items[items.length - 1] : items[0]
    pendingFocus.current = 'first'
    target?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    // `pointerdown`, like Tooltip: a page that prevents the default of
    // pointerdown (drag libraries) suppresses the compatibility mousedown.
    const onPointerDown = (event: globalThis.PointerEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const onDocKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu(true)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onDocKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onDocKeyDown)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event)
    // A consumer onKeyDown that calls preventDefault() opts out.
    if (event.defaultPrevented) return
    const items = getItems()
    if (items.length === 0) return

    if (moveMenuFocus(event, items)) return

    if (event.key === 'Tab') {
      // APG: Tab closes the menu and moves focus per the page's Tab order.
      setOpen(false)
      return
    }

    // Typeahead: printable characters move focus to the next matching item.
    handleMenuTypeahead(event, items, typeahead.current)
  }

  const child = Children.only(trigger) as ReactElement<{
    id?: string
    onClick?: (event: MouseEvent) => void
    onKeyDown?: (event: KeyboardEvent) => void
  }>
  // APG menu button: the trigger controls the menu, and the menu is named
  // by the trigger unless it has its own label. Consumer ids are kept.
  const menuId = rest.id ?? `${autoId}-menu`
  const triggerId = child.props.id ?? `${autoId}-trigger`
  const labelledBy =
    rest['aria-label'] != null || rest['aria-labelledby'] != null ? undefined : triggerId
  const triggerEl = cloneElement(child, {
    id: triggerId,
    'aria-controls': menuId,
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
    <span
      ref={wrapperRef}
      className={styles.wrapper}
      onBlur={(event) => {
        // Focus moved out (e.g. programmatically): close, like Tab-out. A
        // null relatedTarget (window switch, press on a non-focusable area)
        // doesn't count — outside presses are handled on pointerdown.
        const next = event.relatedTarget as Node | null
        if (open && next && !wrapperRef.current?.contains(next)) setOpen(false)
      }}
    >
      {triggerEl}
      <div
        ref={setMenuRef}
        aria-labelledby={labelledBy}
        {...rest}
        id={menuId}
        role="menu"
        data-open={open || undefined}
        data-align={align}
        data-placement={placement}
        data-variant={variant}
        data-color={color}
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
  /** Icon at the start of the item (decorative). */
  startIcon?: ReactNode
  /** Icon at the end of the item (decorative). */
  endIcon?: ReactNode
  /**
   * Selection state (for the menu's `vertical` variant). When set (even to
   * `false`) the item becomes a `role="menuitemcheckbox"` with `aria-checked`;
   * a selected item shows the tertiary-container mapping and morphs to a 12dp
   * corner shape.
   */
  selected?: boolean
  children?: ReactNode
}

/** A selectable item inside a `Menu`. */
export const MenuItem = forwardRef<HTMLButtonElement, MenuItemProps>(
  function MenuItem(
    {
      startIcon,
      endIcon,
      selected,
      disabled = false,
      className,
      children,
      onClick,
      ...rest
    },
    ref,
  ) {
    const ctx = useContext(MenuContext)
    return (
      <button
        ref={ref}
        {...rest}
        type="button"
        role={selected === undefined ? 'menuitem' : 'menuitemcheckbox'}
        aria-checked={selected === undefined ? undefined : selected}
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
        {startIcon != null && (
          <span className={styles.leading} aria-hidden="true">
            {startIcon}
          </span>
        )}
        <span className={styles.label}>{children}</span>
        {endIcon != null && (
          <span className={styles.trailing} aria-hidden="true">
            {endIcon}
          </span>
        )}
        {!disabled && <Ripple />}
        {!disabled && <FocusRing />}
      </button>
    )
  },
)

export interface MenuGroupProps extends HTMLAttributes<HTMLDivElement> {
  /** Optional section label rendered above the group's items. */
  label?: ReactNode
  /** `MenuItem`s (and `MenuDivider`s). */
  children: ReactNode
}

/**
 * A visually distinct group of items inside a `variant="vertical"` `Menu`
 * (Compose `DropdownMenuGroup`): a surface-container-low container at
 * elevation 2 whose corner shape depends on its position in the menu (single
 * group 16dp; first 16/8dp, middle 8dp, last 8/16dp), morphing to the 8dp
 * inactive shape while another group is hovered.
 */
export const MenuGroup = forwardRef<HTMLDivElement, MenuGroupProps>(function MenuGroup(
  { label, className, children, ...rest },
  ref,
) {
  const labelId = useId()
  return (
    <div
      ref={ref}
      {...rest}
      role="group"
      aria-labelledby={label != null ? labelId : undefined}
      className={clsx(styles.group, className)}
    >
      {label != null && (
        // aria-labelledby resolves aria-hidden references, while hiding the
        // bare text node keeps the menu's required-children structure clean.
        <span id={labelId} className={styles.groupLabel} aria-hidden="true">
          {label}
        </span>
      )}
      {children}
    </div>
  )
})

export type MenuDividerProps = HTMLAttributes<HTMLHRElement>

/** A separator between menu items (native `<hr>`, `role="separator"`). */
export const MenuDivider = forwardRef<HTMLHRElement, MenuDividerProps>(
  function MenuDivider({ className, ...rest }, ref) {
    return <hr ref={ref} {...rest} className={clsx(styles.divider, className)} />
  },
)
