'use client'

import {
  Children,
  cloneElement,
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
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
import { usePopupPosition, type PopupAnchorRect } from '../../internal/usePopupPosition'
import {
  createMenuTypeahead,
  handleMenuTypeahead,
  moveMenuFocus,
} from '../../internal/menuNavigation'
import {
  FORWARDED_TRIGGER_PROPS,
  TRIGGER_SLOT,
  applyTriggerProps,
  baseTriggerProps,
  findTriggerElement,
  innermostTrigger,
  type TriggerProps,
} from '../../internal/triggerSlot'
import { useControllableState } from '../../internal/useControllableState'
import styles from './Menu.module.css'

export type MenuAlign = 'start' | 'end'

export type MenuVariant = 'standard' | 'vertical'

export type MenuColor = 'standard' | 'vibrant'

/** Viewport coordinates of a point (MUI `anchorPosition`), e.g. `clientY` / `clientX`. */
export interface MenuAnchorPosition {
  top: number
  left: number
}

interface MenuContextValue {
  /** Close the whole menu tree and return focus to where it came from. */
  close: () => void
  /** Whether the root menu is open (submenus close with it). */
  open: boolean
  variant: MenuVariant
  color: MenuColor
}

const MenuContext = createContext<MenuContextValue | null>(null)

export type MenuSelectionMode = 'none' | 'single' | 'multiple'

interface MenuGroupContextValue {
  selectionMode: MenuSelectionMode
  closeOnSelect: boolean | undefined
  isSelected: (value: string) => boolean
  select: (event: MouseEvent<HTMLButtonElement>, value: string) => void
}

const MenuGroupContext = createContext<MenuGroupContextValue | null>(null)

const ITEM_SELECTOR = '[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]'

/** The items of `menu` itself — not those of its submenus. */
function getMenuItems(menu: HTMLElement | null): HTMLElement[] {
  if (!menu) return []
  return Array.from(menu.querySelectorAll<HTMLElement>(ITEM_SELECTOR)).filter(
    (el) => el.closest('[role="menu"]') === menu,
  )
}

function isRtl(el: Element) {
  return getComputedStyle(el).direction === 'rtl'
}

export interface MenuProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'color'> {
  /**
   * The element that opens the menu (a single button-like element). Omit it
   * for a context menu positioned with `anchorPosition` (then control `open`
   * and give the menu an `aria-label`).
   */
  trigger?: ReactElement
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
   * Open at a point instead of below the trigger (MUI `anchorPosition`):
   * viewport coordinates, e.g. `{ top: event.clientY, left: event.clientX }`
   * from an `onContextMenu` handler. The menu opens below and after the point,
   * flipping above it and clamping inside the viewport when it doesn't fit.
   */
  anchorPosition?: MenuAnchorPosition
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
 * Selection (ruling B33): a `MenuGroup` with `selectionMode="single"` exposes
 * its items as `menuitemradio`, `"multiple"` as `menuitemcheckbox` and keeps
 * the menu open while toggling. Submenus and context menus (ruling B34): a
 * `MenuItem` with `submenu` opens a nested menu beside it; `anchorPosition`
 * opens the menu at a point (e.g. from `onContextMenu`).
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
    anchorPosition,
    variant = 'standard',
    color = 'standard',
    className,
    onKeyDown,
    ...restProps
  },
  ref,
) {
  // Trigger props forwarded by an enclosing Tooltip (internal, #419).
  const { [FORWARDED_TRIGGER_PROPS]: forwarded, ...rest } = restProps as typeof restProps & {
    [FORWARDED_TRIGGER_PROPS]?: TriggerProps
  }
  const [open, setUncontrolled, isControlled] = useControllableState({
    value: controlledOpen,
    defaultValue: defaultOpen,
    name: 'Menu',
    state: 'open',
  })
  const wrapperRef = useRef<HTMLSpanElement>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  // Where to move focus once the menu opens ('last' for ArrowUp on the trigger).
  const pendingFocus = useRef<'first' | 'last'>('first')
  // Without a trigger (context menu): the element focused before opening.
  const returnFocus = useRef<HTMLElement | null>(null)
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

  // Focus the real trigger element via the DOM (avoids fragile ref-merging
  // with a user-provided element): the element carrying the trigger id, or
  // the first tabbable descendant outside the menu — not the wrapper's first
  // child, which is a Tooltip's wrapper when the trigger has a tooltip (#419).
  const focusTrigger = () => {
    if (!trigger) {
      const target = returnFocus.current
      returnFocus.current = null
      if (target?.isConnected) target.focus()
      return
    }
    const wrapper = wrapperRef.current
    const byId = document.getElementById(triggerId)
    const el =
      byId && wrapper?.contains(byId) && !menuRef.current?.contains(byId)
        ? byId
        : findTriggerElement(wrapper, menuRef.current)
    el?.focus()
  }

  const closeMenu = (restoreFocus: boolean) => {
    setOpen(false)
    if (restoreFocus) focusTrigger()
  }

  const getItems = () => getMenuItems(menuRef.current)

  // Positioning (Compose DropdownMenuPositionProvider): below the trigger,
  // flipped above when it doesn't fit there and the space above is larger,
  // clamped inside the viewport; top layer via the shared popup helper (B4).
  // With `anchorPosition`, the anchor is that point (ruling B34).
  const pointTop = anchorPosition?.top
  const pointLeft = anchorPosition?.left
  const getPointRect = useMemo(
    () =>
      pointTop === undefined || pointLeft === undefined
        ? undefined
        : (): PopupAnchorRect => ({
            top: pointTop,
            bottom: pointTop,
            left: pointLeft,
            right: pointLeft,
            width: 0,
            height: 0,
          }),
    [pointTop, pointLeft],
  )
  const side = usePopupPosition({
    open,
    anchorRef: wrapperRef,
    getAnchorRect: getPointRect,
    popupRef: menuRef,
    side: 'bottom',
    align: getPointRect ? 'start' : align,
    gap: getPointRect ? 0 : ANCHOR_GAP_PX,
    margin: VIEWPORT_MARGIN_PX,
  })
  const placement = side === 'top' ? 'above' : 'below'

  useEffect(() => {
    if (!open) return
    const active = document.activeElement as HTMLElement | null
    if (!trigger && active && !wrapperRef.current?.contains(active)) returnFocus.current = active
    const items = getItems()
    const target = pendingFocus.current === 'last' ? items[items.length - 1] : items[0]
    pendingFocus.current = 'first'
    target?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // Escape closes only the menu: preventDefault marks it consumed so an
    // enclosing modal (useModal, which listens after `document`) ignores it.
    // An open submenu consumes Escape first and closes only itself.
    const onDocKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      event.preventDefault()
      closeMenu(true)
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

    if (event.key === 'Tab') {
      // APG: Tab closes the menu (and its submenus) and moves focus per the
      // page's Tab order.
      setOpen(false)
      return
    }

    // Keys from a submenu that it did not handle itself.
    const target = event.target as HTMLElement
    if (target.closest?.('[role="menu"]') !== menuRef.current) return

    const items = getItems()
    if (items.length === 0) return

    if (moveMenuFocus(event, items)) return

    // Typeahead: printable characters move focus to the next matching item.
    handleMenuTypeahead(event, items, typeahead.current)
  }

  let triggerId = `${autoId}-trigger`
  let triggerEl: ReactElement | null = null
  const menuId = rest.id ?? `${autoId}-menu`
  if (trigger) {
    const child = Children.only(trigger) as ReactElement<Record<string, unknown>>
    // What the trigger already carries: its own props, or — when it is a
    // Tooltip — the props an outer wrapper forwarded. Ours are forwarded
    // through a Tooltip so they land on the real button (#419).
    const base = baseTriggerProps(child, forwarded) as {
      id?: string
      onClick?: (event: MouseEvent) => void
      onKeyDown?: (event: KeyboardEvent) => void
    }
    // APG menu button: the trigger controls the menu, and the menu is named
    // by the trigger unless it has its own label. Consumer ids are kept.
    triggerId = (innermostTrigger(child).props.id as string | undefined) ?? base.id ?? triggerId
    triggerEl = applyTriggerProps(child, forwarded, {
      id: triggerId,
      'aria-controls': menuId,
      onClick: (event: MouseEvent) => {
        base.onClick?.(event)
        setOpen(!open)
      },
      onKeyDown: (event: KeyboardEvent) => {
        base.onKeyDown?.(event)
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
    })
  }
  const labelledBy =
    !trigger || rest['aria-label'] != null || rest['aria-labelledby'] != null
      ? undefined
      : triggerId

  const setMenuRef = (node: HTMLDivElement | null) => {
    menuRef.current = node
    if (typeof ref === 'function') ref(node)
    else if (ref) ref.current = node
  }

  const closeAll = () => closeMenu(true)
  const ctx: MenuContextValue = { close: closeAll, open, variant, color }

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
        data-align={getPointRect ? 'start' : align}
        data-placement={placement}
        data-anchor={getPointRect ? 'position' : undefined}
        data-variant={variant}
        data-color={color}
        className={clsx(styles.menu, className)}
        onKeyDown={handleMenuKeyDown}
      >
        <MenuContext.Provider value={ctx}>{children}</MenuContext.Provider>
      </div>
    </span>
  )
})

// Menu forwards trigger props it receives from an enclosing Tooltip.
;(Menu as unknown as Record<string, unknown>)[TRIGGER_SLOT] = 'trigger'

/**
 * Hover intent for submenus: how long the pointer rests on the parent item
 * before the submenu opens, and how long it may leave the item / submenu
 * before the submenu closes (material-web `md-sub-menu` hoverOpenDelay /
 * hoverCloseDelay, sub-menu.ts:56-61).
 */
export const SUBMENU_HOVER_DELAY_MS = 400

export interface MenuItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Icon at the start of the item (decorative). */
  startIcon?: ReactNode
  /** Icon at the end of the item (decorative). */
  endIcon?: ReactNode
  /**
   * Selection state. When set (even to `false`) the item becomes a
   * `role="menuitemcheckbox"` (`menuitemradio` inside a single-select
   * `MenuGroup`) with `aria-checked`. A selected item shows the selected
   * container colors (vertical variant: tertiary container, morphing to a
   * 12dp corner shape; baseline: secondary container). Inside a `MenuGroup`
   * with a `selectionMode`, leave it unset and give the item a `value`.
   */
  selected?: boolean
  /**
   * Icon shown at the start while the item is selected (Compose
   * `selectedLeadingIcon` / `checkedLeadingIcon`), e.g. a check mark. It
   * replaces `startIcon`; without a `startIcon` it expands into view on
   * selection.
   */
  selectedIcon?: ReactNode
  /** Secondary text below the label (BodyMedium); it describes the item. */
  supportingText?: ReactNode
  /**
   * Whether activating the item closes the menu. Defaults to the group's
   * `closeOnSelect`, else `false` in a multi-select group (it stays open
   * until dismissed) and `true` otherwise.
   */
  closeOnSelect?: boolean
  /**
   * Items of a submenu (`MenuItem`s / `MenuGroup`s) opened beside this item:
   * on hover (after a short delay), click, Enter / Space, or ArrowRight
   * (ArrowLeft in RTL); ArrowLeft (RTL: ArrowRight) or Escape returns to
   * this item. Pair it with an `endIcon` chevron, which mirrors in RTL.
   */
  submenu?: ReactNode
  children?: ReactNode
}

/** A selectable item inside a `Menu`. */
export const MenuItem = forwardRef<HTMLButtonElement, MenuItemProps>(function MenuItem(
  {
    startIcon,
    endIcon,
    selected,
    selectedIcon,
    supportingText,
    closeOnSelect,
    submenu,
    value,
    disabled = false,
    className,
    children,
    onClick,
    onKeyDown,
    id: idProp,
    ...rest
  },
  ref,
) {
  const ctx = useContext(MenuContext)
  const group = useContext(MenuGroupContext)
  const autoId = useId()
  const id = idProp ?? `${autoId}-item`
  const hasSubmenu = submenu != null && submenu !== false

  const mode: MenuSelectionMode = hasSubmenu ? 'none' : (group?.selectionMode ?? 'none')
  const key = value == null ? undefined : String(value)
  const isSelected =
    selected ?? (mode !== 'none' ? key !== undefined && group!.isSelected(key) : undefined)
  const role =
    hasSubmenu || isSelected === undefined
      ? 'menuitem'
      : mode === 'single'
        ? 'menuitemradio'
        : 'menuitemcheckbox'

  // ---- Submenu (ruling B34) ------------------------------------------
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const subRef = useRef<HTMLDivElement | null>(null)
  const [subOpen, setSubOpen] = useState(false)
  const focusFirstOnOpen = useRef(false)
  const timers = useRef<{
    open?: ReturnType<typeof setTimeout>
    close?: ReturnType<typeof setTimeout>
  }>({})
  const subTypeahead = useRef(createMenuTypeahead())
  const subId = `${autoId}-submenu`
  const rootOpen = ctx?.open ?? false
  const variant = ctx?.variant ?? 'standard'

  const clearTimers = () => {
    clearTimeout(timers.current.open)
    clearTimeout(timers.current.close)
  }
  useEffect(() => clearTimers, [])
  // Submenus close with the root menu.
  useEffect(() => {
    if (!rootOpen) {
      clearTimers()
      setSubOpen(false)
    }
  }, [rootOpen])
  useEffect(() => {
    if (!subOpen || !focusFirstOnOpen.current) return
    focusFirstOnOpen.current = false
    getMenuItems(subRef.current)[0]?.focus()
  }, [subOpen])

  const openSubmenu = (focusFirst: boolean) => {
    clearTimers()
    if (focusFirst) {
      if (subOpen) getMenuItems(subRef.current)[0]?.focus()
      else focusFirstOnOpen.current = true
    }
    setSubOpen(true)
  }
  const closeSubmenu = (restoreFocus: boolean) => {
    clearTimers()
    // Keep focus in the menu tree: a focused item inside the closing
    // submenu would otherwise drop focus to <body>.
    if (restoreFocus || subRef.current?.contains(document.activeElement)) {
      buttonRef.current?.focus()
    }
    setSubOpen(false)
  }

  // Beside the parent item: vertically at the item, horizontally at the
  // parent menu's edge so the submenu never overlaps it (m3 guidelines).
  const getSubmenuAnchor = useCallback((): PopupAnchorRect => {
    const item = buttonRef.current!.getBoundingClientRect()
    const parent = buttonRef.current!.closest('[role="menu"]')?.getBoundingClientRect() ?? item
    return {
      top: item.top,
      bottom: item.bottom,
      height: item.height,
      left: parent.left,
      right: parent.right,
      width: parent.width,
    }
  }, [])
  const subSide = usePopupPosition({
    open: hasSubmenu && subOpen,
    anchorRef: buttonRef,
    getAnchorRect: getSubmenuAnchor,
    popupRef: subRef,
    side: 'end',
    inlineAlign: 'start',
    // Vertical menus keep their 2dp segmented gap; baseline submenus touch
    // the parent menu (md-sub-menu anchor corner START_END).
    gap: variant === 'vertical' ? 2 : 0,
    margin: VIEWPORT_MARGIN_PX,
  })

  const handleSubmenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const sub = subRef.current
    const target = event.target as HTMLElement
    if (!sub || target.closest?.('[role="menu"]') !== sub) return
    const closeKey = isRtl(sub) ? 'ArrowRight' : 'ArrowLeft'
    if (event.key === 'Escape' || event.key === closeKey) {
      // Consumed: the root menu's Escape listener and parent menus ignore it.
      event.preventDefault()
      event.stopPropagation()
      closeSubmenu(true)
      return
    }
    if (event.key === 'Tab') return // bubbles: closes the whole tree
    const items = getMenuItems(sub)
    if (moveMenuFocus(event, items) || handleMenuTypeahead(event, items, subTypeahead.current)) {
      event.stopPropagation()
    }
  }

  const setButtonRef = (node: HTMLButtonElement | null) => {
    buttonRef.current = node
    if (typeof ref === 'function') ref(node)
    else if (ref) ref.current = node
  }

  // ---- Content ---------------------------------------------------------
  const showSelectedIcon = selectedIcon != null && isSelected === true
  // Only a selected icon: the slot collapses while unselected (Compose
  // AnimatedVisibility expandHorizontally + fade), keeping the icon for the
  // exit motion.
  const hasLeading = startIcon != null || selectedIcon != null
  const leadingCollapsed = startIcon == null && !showSelectedIcon
  const leadingIcon = showSelectedIcon || startIcon == null ? selectedIcon : startIcon
  const labelId = `${autoId}-label`
  const supportingId = `${autoId}-supporting`
  const hasSupporting = supportingText != null && supportingText !== false
  const ariaLabelled = rest['aria-label'] != null || rest['aria-labelledby'] != null

  const label = (
    <span className={styles.label} id={hasSupporting ? labelId : undefined}>
      {children}
    </span>
  )

  const button = (
    <button
      ref={setButtonRef}
      // The label names the item; the supporting text describes it.
      aria-labelledby={hasSupporting && !ariaLabelled ? labelId : undefined}
      {...rest}
      aria-describedby={
        hasSupporting
          ? clsx(rest['aria-describedby'], supportingId) || undefined
          : rest['aria-describedby']
      }
      id={id}
      value={value}
      type="button"
      role={role}
      aria-checked={role === 'menuitem' ? undefined : isSelected}
      aria-haspopup={hasSubmenu ? 'menu' : undefined}
      aria-expanded={hasSubmenu ? subOpen : undefined}
      aria-controls={hasSubmenu ? subId : undefined}
      // Roving tabindex — the menu manages focus; items never join the page
      // Tab order. Disabled items stay focusable but inert (APG guidance),
      // so `aria-disabled` instead of the `disabled` attribute.
      tabIndex={-1}
      aria-disabled={disabled || undefined}
      data-supporting-text={hasSupporting || undefined}
      className={clsx(styles.item, className)}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        if (event.defaultPrevented || !hasSubmenu || disabled) return
        const openKey = isRtl(event.currentTarget) ? 'ArrowLeft' : 'ArrowRight'
        if (event.key === openKey) {
          event.preventDefault()
          event.stopPropagation()
          openSubmenu(true)
        }
      }}
      onClick={(event) => {
        if (disabled) return
        onClick?.(event)
        if (hasSubmenu) {
          // APG: Enter / Space (and a click) open the submenu and focus its
          // first item; they never close the menu.
          openSubmenu(true)
          return
        }
        if (mode !== 'none' && key !== undefined) group!.select(event, key)
        const shouldClose = closeOnSelect ?? group?.closeOnSelect ?? mode !== 'multiple'
        if (shouldClose) ctx?.close()
      }}
    >
      {hasLeading && (
        <span
          className={styles.leading}
          data-collapsed={leadingCollapsed || undefined}
          aria-hidden="true"
        >
          {leadingIcon}
        </span>
      )}
      {hasSupporting ? (
        <span className={styles.text}>
          {label}
          <span className={styles.supportingText} id={supportingId}>
            {supportingText}
          </span>
        </span>
      ) : (
        label
      )}
      {endIcon != null && (
        <span className={styles.trailing} aria-hidden="true">
          {endIcon}
        </span>
      )}
      {!disabled && <Ripple />}
      {!disabled && <FocusRing />}
    </button>
  )

  if (!hasSubmenu) return button

  // Hover intent: resting on the item opens the submenu, leaving the item and
  // the submenu closes it — each after a delay that bridges the way between
  // them.
  const onHoverLeave = () => {
    clearTimers()
    if (subOpen) {
      timers.current.close = setTimeout(() => closeSubmenu(false), SUBMENU_HOVER_DELAY_MS)
    }
  }

  // The submenu is the item's next sibling (APG menu pattern: the parent
  // item's `aria-controls` names it), so the items' positional shapes
  // (`:first-of-type` / `:last-of-type`) are unaffected.
  return (
    <>
      {cloneElement(button, {
        onMouseEnter: (event: MouseEvent<HTMLButtonElement>) => {
          rest.onMouseEnter?.(event)
          if (disabled) return
          clearTimers()
          if (!subOpen) {
            timers.current.open = setTimeout(() => openSubmenu(false), SUBMENU_HOVER_DELAY_MS)
          }
        },
        onMouseLeave: (event: MouseEvent<HTMLButtonElement>) => {
          rest.onMouseLeave?.(event)
          onHoverLeave()
        },
      })}
      <div
        ref={subRef}
        id={subId}
        role="menu"
        aria-labelledby={id}
        data-open={subOpen || undefined}
        data-submenu=""
        data-side={subSide}
        data-variant={variant}
        data-color={ctx?.color ?? 'standard'}
        className={styles.menu}
        onKeyDown={handleSubmenuKeyDown}
        onMouseEnter={clearTimers}
        onMouseLeave={onHoverLeave}
      >
        {/* A submenu is its own selection scope. */}
        <MenuGroupContext.Provider value={null}>{submenu}</MenuGroupContext.Provider>
      </div>
    </>
  )
})

interface MenuGroupBaseProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'onChange' | 'defaultValue'
> {
  /** Optional section label rendered above the group's items. */
  label?: ReactNode
  /**
   * Default for the items' `closeOnSelect`: `false` keeps the menu open while
   * the items are activated. @default `false` for `selectionMode="multiple"`,
   * else `true`
   */
  closeOnSelect?: boolean
  /** `MenuItem`s (and `MenuDivider`s). */
  children: ReactNode
}

/** A plain group of items (no selection model). */
export interface MenuGroupNoSelectionProps extends MenuGroupBaseProps {
  /** @default 'none' */
  selectionMode?: 'none'
  value?: never
  /** Unused without a selection model (kept for HTMLAttributes compatibility). */
  defaultValue?: HTMLAttributes<HTMLDivElement>['defaultValue']
  /** Native `change` events bubbling from descendants. */
  onChange?: HTMLAttributes<HTMLDivElement>['onChange']
}

/** Single select: items are `menuitemradio`; selecting closes the menu. */
export interface MenuGroupSingleSelectionProps extends MenuGroupBaseProps {
  selectionMode: 'single'
  /** Controlled selected item value (`null` = none). */
  value?: string | null
  /** Uncontrolled initial selected item value. @default null */
  defaultValue?: string | null
  /** Fires with the activating event and the selected value. */
  onChange?: (event: MouseEvent<HTMLButtonElement>, value: string | null) => void
}

/** Multi select: items are `menuitemcheckbox`; the menu stays open. */
export interface MenuGroupMultipleSelectionProps extends MenuGroupBaseProps {
  selectionMode: 'multiple'
  /** Controlled selected item values. */
  value?: string[]
  /** Uncontrolled initial selected item values. @default [] */
  defaultValue?: string[]
  /** Fires with the activating event and the next selected values. */
  onChange?: (event: MouseEvent<HTMLButtonElement>, value: string[]) => void
}

export type MenuGroupProps =
  MenuGroupNoSelectionProps | MenuGroupSingleSelectionProps | MenuGroupMultipleSelectionProps

type SelectionValue = string | null | string[]

/**
 * A group of items inside a `Menu` (`role="group"`, named by its `label`).
 *
 * In a `variant="vertical"` menu it is a visually distinct container (Compose
 * `DropdownMenuGroup`): surface-container-low at elevation 2 whose corner
 * shape depends on its position in the menu (single group 16dp; first
 * 16/8dp, middle 8dp, last 8/16dp), morphing to the 8dp inactive shape while
 * another group is hovered. In a baseline menu it only groups (and labels)
 * its items.
 *
 * `selectionMode` (ruling B33) adds a selection model: give each `MenuItem` a
 * `value`; the group owns the state via `value` / `defaultValue` /
 * `onChange(event, value)`. `single` exposes `menuitemradio` items (selecting
 * one closes the menu), `multiple` exposes `menuitemcheckbox` items and keeps
 * the menu open until it is dismissed (m3 guidelines).
 */
export const MenuGroup = forwardRef<HTMLDivElement, MenuGroupProps>(function MenuGroup(props, ref) {
  const {
    label,
    className,
    children,
    selectionMode = 'none',
    value,
    defaultValue,
    onChange,
    closeOnSelect,
    ...rest
  } = props as MenuGroupBaseProps & {
    selectionMode?: MenuSelectionMode
    value?: SelectionValue
    defaultValue?: SelectionValue
    onChange?: (event: MouseEvent<HTMLButtonElement>, value: SelectionValue) => void
  }
  const labelId = useId()
  const multiple = selectionMode === 'multiple'
  const [current, setInternal, isControlled] = useControllableState<SelectionValue>({
    value,
    defaultValue:
      selectionMode === 'none' || defaultValue === undefined
        ? multiple
          ? []
          : null
        : defaultValue,
    name: 'MenuGroup',
    state: 'value',
  })

  const latest = useRef({ current, onChange, isControlled })
  latest.current = { current, onChange, isControlled }

  const selection = useMemo<MenuGroupContextValue>(
    () => ({
      selectionMode,
      closeOnSelect,
      isSelected: (v) => (Array.isArray(current) ? current.includes(v) : current === v),
      select: (event, v) => {
        const prev = latest.current.current
        let next: SelectionValue
        if (selectionMode === 'multiple') {
          const list = Array.isArray(prev) ? prev : []
          next = list.includes(v) ? list.filter((x) => x !== v) : [...list, v]
        } else {
          // Radio semantics: activating the selected item keeps it selected.
          if (prev === v) return
          next = v
        }
        if (!latest.current.isControlled) setInternal(next)
        latest.current.onChange?.(event, next)
      },
    }),
    [selectionMode, closeOnSelect, current, setInternal],
  )

  return (
    <div
      ref={ref}
      {...rest}
      role="group"
      aria-labelledby={label != null ? labelId : undefined}
      data-selection-mode={selectionMode === 'none' ? undefined : selectionMode}
      className={clsx(styles.group, className)}
    >
      {label != null && (
        // aria-labelledby resolves aria-hidden references, while hiding the
        // bare text node keeps the menu's required-children structure clean.
        <span id={labelId} className={styles.groupLabel} aria-hidden="true">
          {label}
        </span>
      )}
      <MenuGroupContext.Provider value={selection}>{children}</MenuGroupContext.Provider>
    </div>
  )
})

export type MenuDividerProps = HTMLAttributes<HTMLHRElement>

/** A separator between menu items (native `<hr>`, `role="separator"`). */
export const MenuDivider = forwardRef<HTMLHRElement, MenuDividerProps>(function MenuDivider(
  { className, ...rest },
  ref,
) {
  return <hr ref={ref} {...rest} className={clsx(styles.divider, className)} />
})
