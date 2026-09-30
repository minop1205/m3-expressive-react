import {
  forwardRef,
  type HTMLAttributes,
  type KeyboardEventHandler,
  type LiHTMLAttributes,
  type MouseEvent,
  type MouseEventHandler,
  type ReactNode,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import clsx from 'clsx'
import { Ripple } from '../../primitives/Ripple/Ripple'
import { FocusRing } from '../../primitives/FocusRing/FocusRing'
import { ListParentContext } from './ListContext'
import { isFromNestedInteractive } from '../../internal/isFromNestedInteractive'
import { assignRef } from '../../internal/assignRef'
import styles from './List.module.css'

export interface ListProps extends HTMLAttributes<HTMLUListElement> {
  children?: ReactNode
}

/** MD3 list container — a vertical `<ul role="list">` with 8dp block padding. */
export const List = forwardRef<HTMLUListElement, ListProps>(function List(
  { className, children, ...rest },
  ref,
) {
  return (
    <ul ref={ref} {...rest} className={clsx(styles.list, className)}>
      <ListParentContext.Provider value="list">{children}</ListParentContext.Provider>
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
      const style = window.getComputedStyle(item)
      const content =
        item.getBoundingClientRect().height -
        parseFloat(style.paddingTop) -
        parseFloat(style.paddingBottom)
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
  /** Marks the item selected (secondary-container fill). */
  selected?: boolean
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
      className,
      role,
      tabIndex,
      ...rest
    },
    ref,
  ) {
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
      <span className={styles.trailing}>{trailing}</span>
    )

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
                tabIndex={tabIndex}
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
                tabIndex={tabIndex}
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
