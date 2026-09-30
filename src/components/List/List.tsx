import {
  forwardRef,
  type FocusEvent,
  type HTMLAttributes,
  type KeyboardEvent,
  type KeyboardEventHandler,
  type LiHTMLAttributes,
  type MouseEvent,
  type MouseEventHandler,
  type ReactNode,
  type SyntheticEvent,
  useCallback,
  useContext,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import clsx from 'clsx'
import { Ripple } from '../../primitives/Ripple/Ripple'
import { FocusRing } from '../../primitives/FocusRing/FocusRing'
import {
  ListNavContext,
  ListParentContext,
  type ListNav,
  type ListSelectionMode,
} from './ListContext'
import {
  isContainerKeyActivation,
  isFromNestedInteractive,
} from '../../internal/isFromNestedInteractive'
import { assignRef } from '../../internal/assignRef'
import styles from './List.module.css'

export type ListVariant = 'standard' | 'segmented'

interface ListBaseProps
  extends Omit<HTMLAttributes<HTMLUListElement>, 'onChange' | 'defaultValue'> {
  /**
   * `standard`: items on a transparent container. `segmented`: each item is
   * its own surface-colored segment, 2dp apart, with 16dp outer corners on
   * the first and last item (Compose `SegmentedListItem`). Both use the
   * Expressive item shapes. @default 'standard'
   */
  variant?: ListVariant
  children?: ReactNode
}

/** No selection model: a plain list (static, single-action or multi-action rows). */
export interface ListNoSelectionProps extends ListBaseProps {
  /** @default 'none' */
  selectionMode?: 'none'
  value?: never
  /** Unused without a selection model (kept for HTMLAttributes compatibility). */
  defaultValue?: HTMLAttributes<HTMLUListElement>['defaultValue']
  /** Native `change` events bubbling from descendants. */
  onChange?: HTMLAttributes<HTMLUListElement>['onChange']
}

/** Single-select list: `role="listbox"`, items are `option`s with `aria-selected`. */
export interface ListSingleSelectionProps extends ListBaseProps {
  selectionMode: 'single'
  /** Controlled selected item value (`null` = none). */
  value?: string | null
  /** Uncontrolled initial selected item value. @default null */
  defaultValue?: string | null
  /** Fires with the triggering event and the next selected value. */
  onChange?: (event: SyntheticEvent, value: string | null) => void
}

/** Multi-select list: `role="listbox"` + `aria-multiselectable`. */
export interface ListMultipleSelectionProps extends ListBaseProps {
  selectionMode: 'multiple'
  /** Controlled selected item values. */
  value?: string[]
  /** Uncontrolled initial selected item values. @default [] */
  defaultValue?: string[]
  /** Fires with the triggering event and the next selected values. */
  onChange?: (event: SyntheticEvent, value: string[]) => void
}

export type ListProps =
  | ListNoSelectionProps
  | ListSingleSelectionProps
  | ListMultipleSelectionProps

type SelectionValue = string | null | string[]

/** Controls that use the arrow keys themselves (the list leaves them alone). */
const ARROW_KEY_OWNER = [
  'input:not([type="checkbox"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="image"])',
  'textarea',
  'select',
  '[contenteditable]:not([contenteditable="false"])',
  '[role="slider"]',
  '[role="spinbutton"]',
  '[role="combobox"]',
  '[role="textbox"]',
  '[role="radio"]',
].join(',')

const TRAILING_FOCUSABLE =
  'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'

const isEnabled = (el: Element) =>
  !el.matches(':disabled, [aria-disabled="true"]') && !el.closest('[inert]')

/** The list's rows (primary actions / options) in DOM order. */
function navItems(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>('[data-list-nav]'))
}

/** Arrow-key sequence: every enabled row plus the focusable controls in the
 * rows' trailing slots (m3 "multi-action lists: arrows move through all
 * focusable actions in the items"). */
function arrowSequence(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      `[data-list-nav], [data-list-trailing] :is(${TRAILING_FOCUSABLE})`,
    ),
  ).filter(
    (el) => isEnabled(el) && (el.hasAttribute('data-list-nav') || el.tabIndex >= 0),
  )
}

/**
 * MD3 (Expressive) list container — a vertical `<ul>` with 8dp block padding.
 *
 * Items use the Expressive shapes (B18): 4dp corners at rest, 12dp while
 * hovered, 16dp while focused / pressed / selected, morphing with the
 * FastSpatial spring of the motion scheme (instant under reduced motion).
 * `variant="segmented"` separates the items into surface-colored segments.
 *
 * Keyboard (m3 List accessibility): the focusable rows share **one Tab stop**
 * — the selected row, else the first (then the last focused one); **Down /
 * Right** move to the next row and **Up / Left** to the previous one,
 * wrapping at the ends (Left / Right mirrored in RTL), Home / End jump to
 * the ends. Controls in the rows' trailing slots stay Tab stops and are part
 * of the arrow sequence.
 *
 * Selection (B17): set `selectionMode="single" | "multiple"` and give each
 * `ListItem` a `value`; the list owns the state via `value` / `defaultValue` /
 * `onChange(event, value)`. It then renders `role="listbox"` (label it with
 * `aria-label` describing the choice) and its items `role="option"` with
 * `aria-selected`; Enter / Space or a click selects. Options cannot hold
 * interactive controls (that is a multi-action list, not a selection list),
 * and selection should not rely on color alone — add a leading / trailing
 * check indicator.
 */
export const List = forwardRef<HTMLUListElement, ListProps>(function List(props, ref) {
  const {
    variant = 'standard',
    selectionMode = 'none',
    value,
    defaultValue,
    onChange,
    className,
    children,
    onKeyDown,
    onFocus,
    role,
    ...rest
  } = props as ListBaseProps & {
    selectionMode?: ListSelectionMode
    value?: SelectionValue
    defaultValue?: SelectionValue
    onChange?: (event: SyntheticEvent, value: SelectionValue) => void
  }
  const multiple = selectionMode === 'multiple'
  const selecting = selectionMode !== 'none'

  const [inner, setInner] = useState<SelectionValue>(
    () => (defaultValue as SelectionValue | undefined) ?? (multiple ? [] : null),
  )
  const controlled = value !== undefined
  const current = controlled ? value : inner

  const [tabStop, setTabStop] = useState<string | null>(null)
  const rootRef = useRef<HTMLUListElement | null>(null)
  const setRef = useCallback(
    (node: HTMLUListElement | null) => {
      rootRef.current = node
      assignRef(ref, node)
    },
    [ref],
  )

  const currentRef = useRef(current)
  currentRef.current = current
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const isSelected = useCallback(
    (v: string) =>
      Array.isArray(current) ? current.includes(v) : current != null && current === v,
    [current],
  )

  const toggle = useCallback(
    (event: SyntheticEvent, v: string) => {
      const prev = currentRef.current
      let next: SelectionValue
      if (multiple) {
        const list = Array.isArray(prev) ? prev : []
        next = list.includes(v) ? list.filter((x) => x !== v) : [...list, v]
      } else {
        // Single select behaves like a radio group: re-activating the
        // selected option keeps it.
        if (prev === v) return
        next = v
      }
      if (!controlled) setInner(next)
      onChangeRef.current?.(event, next)
    },
    [multiple, controlled],
  )

  // Resolve the roving Tab stop after every render: keep the current one
  // while it is an enabled row, else the selected row, else the first.
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    const rows = navItems(root).filter(isEnabled)
    if (rows.some((el) => el.dataset.listNav === tabStop)) return
    const next =
      rows.find((el) => el.getAttribute('aria-selected') === 'true' || el.hasAttribute('data-list-selected')) ??
      rows[0]
    const id = next?.dataset.listNav ?? null
    if (id !== tabStop) setTabStop(id)
  })

  const handleFocus = (event: FocusEvent<HTMLUListElement>) => {
    onFocus?.(event)
    const row = (event.target as HTMLElement).closest?.('[data-list-nav]') as HTMLElement | null
    if (row && row === event.target && rootRef.current?.contains(row)) {
      const id = row.dataset.listNav ?? null
      if (id !== tabStop) setTabStop(id)
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    onKeyDown?.(event)
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return
    const root = rootRef.current
    const target = event.target as HTMLElement
    if (!root) return
    const rtl = window.getComputedStyle(root).direction === 'rtl'
    let delta: number | 'first' | 'last'
    switch (event.key) {
      case 'ArrowDown':
        delta = 1
        break
      case 'ArrowUp':
        delta = -1
        break
      case 'ArrowRight':
        delta = rtl ? -1 : 1
        break
      case 'ArrowLeft':
        delta = rtl ? 1 : -1
        break
      case 'Home':
        delta = 'first'
        break
      case 'End':
        delta = 'last'
        break
      default:
        return
    }
    const seq = arrowSequence(root)
    const index = seq.indexOf(target)
    if (index < 0) return
    if (!target.hasAttribute('data-list-nav') && target.matches(ARROW_KEY_OWNER)) return
    const next =
      delta === 'first'
        ? 0
        : delta === 'last'
          ? seq.length - 1
          : (index + delta + seq.length) % seq.length
    event.preventDefault()
    seq[next].focus()
  }

  const nav = useMemo<ListNav>(
    () => ({ selectionMode, isSelected, toggle, tabStop }),
    [selectionMode, isSelected, toggle, tabStop],
  )

  return (
    <ul
      ref={setRef}
      {...rest}
      role={role ?? (selecting ? 'listbox' : undefined)}
      aria-multiselectable={selecting && multiple ? true : undefined}
      data-variant={variant}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      className={clsx(styles.list, className)}
    >
      <ListNavContext.Provider value={nav}>
        <ListParentContext.Provider value="list">{children}</ListParentContext.Provider>
      </ListNavContext.Provider>
    </ul>
  )
})

/** Content box height (px) from which the item aligns its content to the
 * top (Compose `ListItemDefaults.verticalAlignment`: 60dp). */
const TOP_ALIGN_MIN_CONTENT = 60

/**
 * Measures what props alone cannot tell (docs/audits/list.md LS2): whether
 * the supporting text wraps (Compose `ListItemType` then treats the item as
 * three-line, 88dp) and whether the content box is 60dp or taller (then the
 * content aligns top). No-op without ResizeObserver (SSR, jsdom).
 */
function useMeasuredLayout(hasSupporting: boolean) {
  const [item, setItem] = useState<HTMLElement | null>(null)
  const supportingRef = useRef<HTMLSpanElement>(null)
  const [layout, setLayout] = useState({ multiline: false, tall: false })

  useLayoutEffect(() => {
    if (!item || typeof ResizeObserver === 'undefined') return
    const measure = () => {
      const supporting = supportingRef.current
      let multiline = false
      if (supporting) {
        const lineHeight = parseFloat(window.getComputedStyle(supporting).lineHeight)
        multiline =
          lineHeight > 0 && supporting.getBoundingClientRect().height > lineHeight * 1.5
      }
      // Measure the slots themselves, not the item box: the box is at least
      // the line-count min-height, so deriving content from it made the
      // alignment depend on when the measure ran (VRT flake on the segmented
      // story). The slots aren't stretched in either alignment.
      let content = 0
      item
        .querySelectorAll<HTMLElement>(
          `.${styles.leading}, .${styles.body}, .${styles.trailingText}, .${styles.trailing}`,
        )
        .forEach((slot) => {
          if (slot.closest(`.${styles.item}`) !== item) return
          content = Math.max(content, slot.getBoundingClientRect().height)
        })
      const tall = content >= TOP_ALIGN_MIN_CONTENT - 0.5
      setLayout((prev) =>
        prev.multiline === multiline && prev.tall === tall ? prev : { multiline, tall },
      )
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(item)
    if (supportingRef.current) observer.observe(supportingRef.current)
    return () => observer.disconnect()
  }, [item, hasSupporting])

  return { itemRef: setItem, supportingRef, ...layout }
}

export interface ListItemProps
  extends Omit<LiHTMLAttributes<HTMLLIElement>, 'onChange' | 'onClick' | 'onKeyDown'> {
  /**
   * Click handler. Providing it makes the row actionable: the leading slot
   * and the text become one `<button>` (the primary action).
   */
  onClick?: MouseEventHandler<HTMLElement>
  /** Make the row a link: the primary action becomes an `<a href>`. */
  href?: string
  /** `<a target>` — only with `href`. */
  target?: string
  /** `<a rel>` — only with `href`. */
  rel?: string
  /**
   * Key handler of the focusable element — the primary action of an
   * actionable row, else the root. Runs before the row's own activation:
   * `event.preventDefault()` suppresses it.
   */
  onKeyDown?: KeyboardEventHandler<HTMLElement>
  /** Primary text (headline). */
  headline: ReactNode
  /** Small label above the headline. */
  overline?: ReactNode
  /** Secondary text below the headline. */
  supportingText?: ReactNode
  /**
   * Leading element (icon, avatar, image, video; or a checkbox / radio /
   * switch on a static row). Not hidden from assistive technology — give
   * decorative icons `aria-hidden` and images an `alt`. On an actionable row
   * it is part of the primary action, so do not put controls here.
   */
  leading?: ReactNode
  /**
   * Trailing element (icon, metadata, or controls such as a Switch / icon
   * button). On an actionable row it is rendered **beside** the primary
   * action, not inside it, so its controls stay separately focusable
   * (multi-action list). Non-interactive trailing content lets clicks
   * through to the row.
   */
  trailing?: ReactNode
  /** Trailing metadata text (right-aligned label). */
  trailingSupportingText?: ReactNode
  /**
   * Marks the item selected (secondary-container fill). Inside a `List` with
   * a `selectionMode`, the list's `value` decides instead.
   */
  selected?: boolean
  /**
   * The item's value in a `List` with a `selectionMode` (B17): the item then
   * renders `role="option"` with `aria-selected`.
   */
  value?: string
  /** Disable the item and dim its content to 38%. */
  disabled?: boolean
}

/** Props that belong on the focusable primary action rather than the root. */
function splitActionProps(rest: Record<string, unknown>) {
  const root: Record<string, unknown> = {}
  const action: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(rest)) {
    if (key.startsWith('aria-') || key === 'onFocus' || key === 'onBlur') action[key] = value
    else root[key] = value
  }
  return { root, action }
}

/**
 * Material Design 3 list item.
 *
 * Auto-sizes to one- (56dp), two- (72dp) or three-line (88dp) based on the
 * presence of `overline` / `supportingText`; supporting text that wraps also
 * makes the item three-line, and content 60dp or taller aligns top.
 * Colors follow ListTokens: headline OnSurface / BodyLarge, supporting &
 * overline OnSurfaceVariant, leading/trailing OnSurfaceVariant.
 *
 * **Actionable rows** (`onClick` → `<button>`, `href` → `<a>`, B5): the
 * leading slot and the text form the primary action, which covers the whole
 * row (ripple, focus ring, click target); `trailing` is rendered as its
 * sibling, so trailing controls (Switch, icon button) are not nested inside
 * the button (MUI `ListItemButton` + `secondaryAction`). `role`, `tabIndex`,
 * `onKeyDown` and `aria-*` props go to the primary action.
 *
 * Renders an `<li>`, except inside a `SwipeToDismiss` in a `List`, where the
 * SwipeToDismiss root is the `<li>` and the item renders a `<div>`.
 */
export const ListItem = forwardRef<HTMLLIElement, ListItemProps>(
  function ListItem(
    {
      headline,
      overline,
      supportingText,
      leading,
      trailing,
      trailingSupportingText,
      selected = false,
      disabled = false,
      onClick,
      href,
      target,
      rel,
      onKeyDown,
      value,
      className,
      role,
      tabIndex,
      ...rest
    },
    ref,
  ) {
    const nav = useContext(ListNavContext)
    const navId = useId()
    // Roving Tab stop managed by the List (before it resolves: every row).
    const rovingTabIndex = nav && nav.tabStop != null ? (nav.tabStop === navId ? 0 : -1) : 0
    const isLink = href != null
    const actionable = onClick != null || isLink
    // Inside a SwipeToDismiss in a List, the SwipeToDismiss root is the <li>
    // and this item renders a <div> (docs/decisions/phase-b-api.md B21).
    // (Typed as 'li': the props / ref shape is the same for both tags.)
    const Root = (useContext(ListParentContext) === 'swipe' ? 'div' : 'li') as 'li'
    const measured = useMeasuredLayout(supportingText != null)
    const lines = 1 + (supportingText != null ? 1 : 0) + (overline != null ? 1 : 0)
    const lineCount = measured.multiline ? 3 : Math.min(lines, 3)
    const align = measured.tall ? 'top' : undefined
    const setItemRef = measured.itemRef
    // Static items: the root is the measured row (stable callback — a new
    // one per render would re-run the ref and loop through setState).
    const rootItemRef = useCallback(
      (node: HTMLLIElement | null) => {
        setItemRef(node)
        assignRef(ref, node)
      },
      [ref, setItemRef],
    )

    const leadingNode = leading != null && <span className={styles.leading}>{leading}</span>
    const bodyNode = (
      <span className={styles.body}>
        {overline != null && <span className={styles.overline}>{overline}</span>}
        <span className={styles.headline}>{headline}</span>
        {supportingText != null && (
          <span ref={measured.supportingRef} className={styles.supporting}>
            {supportingText}
          </span>
        )}
      </span>
    )
    const trailingTextNode = trailingSupportingText != null && (
      <span className={styles.trailingText}>{trailingSupportingText}</span>
    )
    const trailingNode = trailing != null && (
      <span className={styles.trailing} data-list-trailing="">
        {trailing}
      </span>
    )

    // Selection list (B17): the item itself is the option.
    if (nav && nav.selectionMode !== 'none') {
      const optionValue = value ?? navId
      const isSelected = nav.isSelected(optionValue)
      const handleOptionClick = (event: MouseEvent<HTMLLIElement>) => {
        if (isFromNestedInteractive(event)) return
        nav.toggle(event, optionValue)
        onClick?.(event)
      }
      const handleOptionKeyDown = (event: KeyboardEvent<HTMLLIElement>) => {
        onKeyDown?.(event)
        if (!disabled && isContainerKeyActivation(event)) {
          event.preventDefault()
          event.currentTarget.click()
        }
      }
      return (
        <Root
          ref={rootItemRef}
          {...rest}
          data-list-nav={navId}
          role={role ?? 'option'}
          aria-selected={isSelected}
          aria-disabled={disabled || undefined}
          tabIndex={disabled ? undefined : tabIndex ?? rovingTabIndex}
          data-lines={lineCount}
          data-align={align}
          data-interactive="true"
          data-selected={isSelected || undefined}
          data-disabled={disabled || undefined}
          onClick={disabled ? undefined : handleOptionClick}
          onKeyDown={handleOptionKeyDown}
          className={clsx(styles.item, className)}
        >
          {leadingNode}
          {bodyNode}
          {trailingTextNode}
          {trailingNode}
          {!disabled && <Ripple ignoreNestedPress />}
          {!disabled && <FocusRing />}
        </Root>
      )
    }

    if (actionable) {
      const { root, action } = splitActionProps(rest as Record<string, unknown>)
      // Clicks on a control placed in the leading slot / text activate only
      // that control, not the row as well.
      const handleClick = (event: MouseEvent<HTMLElement>) => {
        if (isFromNestedInteractive(event)) {
          if (isLink) event.preventDefault()
          return
        }
        onClick?.(event)
      }
      const actionContent = (
        <>
          {leadingNode}
          {bodyNode}
          {trailingTextNode}
          {!disabled && <Ripple ignoreNestedPress />}
          {!disabled && <FocusRing />}
        </>
      )
      const actionCommon = {
        ...action,
        'data-list-nav': navId,
        'data-list-selected': selected || undefined,
        className: styles.action,
        onKeyDown,
        onClick: disabled ? undefined : handleClick,
      }
      return (
        <Root ref={ref} {...root} className={clsx(styles.host, className)}>
          <div
            ref={measured.itemRef}
            data-lines={lineCount}
            data-align={align}
            data-interactive="true"
            data-selected={selected || undefined}
            data-disabled={disabled || undefined}
            className={styles.item}
          >
            {isLink ? (
              <a
                {...actionCommon}
                // A disabled link has no href (not focusable, not followable).
                href={disabled ? undefined : href}
                target={target}
                rel={rel}
                role={role ?? (disabled ? 'link' : undefined)}
                tabIndex={disabled ? tabIndex : tabIndex ?? rovingTabIndex}
                aria-disabled={disabled || undefined}
              >
                {actionContent}
              </a>
            ) : (
              <button
                {...actionCommon}
                type="button"
                role={role}
                disabled={disabled}
                tabIndex={tabIndex ?? rovingTabIndex}
              >
                {actionContent}
              </button>
            )}
            {trailingNode}
          </div>
        </Root>
      )
    }

    return (
      <Root
        ref={rootItemRef}
        {...rest}
        data-lines={lineCount}
        data-align={align}
        data-selected={selected || undefined}
        data-disabled={disabled || undefined}
        role={role}
        tabIndex={tabIndex}
        onKeyDown={onKeyDown}
        className={clsx(styles.item, className)}
      >
        {leadingNode}
        {bodyNode}
        {trailingTextNode}
        {trailingNode}
      </Root>
    )
  },
)
