import {
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type KeyboardEventHandler,
  type LiHTMLAttributes,
  type MouseEvent,
  type MouseEventHandler,
  type ReactNode,
  type Ref,
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
import {
  isContainerKeyActivation,
  isFromNestedInteractive,
} from '../../internal/isFromNestedInteractive'
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

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === 'function') ref(value)
  else if (ref) (ref as { current: T | null }).current = value
}

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
  /** Click handler. Providing it makes the row interactive (role="button"). */
  onClick?: MouseEventHandler<HTMLElement>
  /**
   * Key handler of the focusable row (the root for a static item). Runs
   * before the row's own Enter / Space activation — call
   * `event.preventDefault()` to suppress it.
   */
  onKeyDown?: KeyboardEventHandler<HTMLElement>
  /** Primary text (headline). */
  headline: ReactNode
  /** Small label above the headline. */
  overline?: ReactNode
  /** Secondary text below the headline. */
  supportingText?: ReactNode
  /** Leading element (icon, avatar, image, control). */
  leading?: ReactNode
  /** Trailing element (icon, control, metadata). */
  trailing?: ReactNode
  /** Trailing metadata text (right-aligned label). */
  trailingSupportingText?: ReactNode
  /** Marks the item selected (secondary-container fill). */
  selected?: boolean
  /** Disable the item and dim its content to 38%. */
  disabled?: boolean
}

/**
 * Material Design 3 list item.
 *
 * Auto-sizes to one- (56dp), two- (72dp) or three-line (88dp) based on the
 * presence of `overline` / `supportingText`; supporting text that wraps also
 * makes the item three-line, and content 60dp or taller aligns top. Passing `onClick` makes the row
 * interactive (role="button", keyboard activation, ripple, focus ring).
 * Colors follow ListTokens: headline OnSurface / BodyLarge, supporting &
 * overline OnSurfaceVariant, leading/trailing OnSurfaceVariant.
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
      onKeyDown,
      className,
      role,
      tabIndex,
      ...rest
    },
    ref,
  ) {
    const interactive = onClick != null
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

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      // The caller's handler first; preventDefault() suppresses activation
      // (isContainerKeyActivation checks defaultPrevented).
      onKeyDown?.(event)
      // Only when the row itself is focused — keys from controls in the
      // leading/trailing slots belong to them (docs/audits/list.md LS5).
      if (!disabled && isContainerKeyActivation(event)) {
        event.preventDefault()
        event.currentTarget.click()
      }
    }

    // Clicks on nested controls (trailing Switch, icon button…) activate only
    // that control, not the row as well.
    const handleClick = (event: MouseEvent<HTMLDivElement>) => {
      if (isFromNestedInteractive(event)) return
      onClick?.(event)
    }

    const content = (
      <>
        {leading != null && (
          <span className={styles.leading} aria-hidden="true">
            {leading}
          </span>
        )}
        <span className={styles.body}>
          {overline != null && <span className={styles.overline}>{overline}</span>}
          <span className={styles.headline}>{headline}</span>
          {supportingText != null && (
            <span ref={measured.supportingRef} className={styles.supporting}>
              {supportingText}
            </span>
          )}
        </span>
        {trailingSupportingText != null && (
          <span className={styles.trailingText}>{trailingSupportingText}</span>
        )}
        {trailing != null && <span className={styles.trailing}>{trailing}</span>}
        {interactive && !disabled && <Ripple ignoreNestedPress />}
        {interactive && !disabled && <FocusRing />}
      </>
    )

    // Interactive rows keep the <li> as the listitem and put the button role on
    // an inner element (role="button" is not valid on <li>).
    if (interactive) {
      return (
        <Root ref={ref} {...rest} className={clsx(styles.host, className)}>
          <div
            ref={measured.itemRef}
            data-lines={lineCount}
            data-align={align}
            data-interactive="true"
            data-selected={selected || undefined}
            data-disabled={disabled || undefined}
            role={role ?? 'button'}
            tabIndex={disabled ? undefined : tabIndex ?? 0}
            aria-disabled={disabled || undefined}
            onClick={disabled ? undefined : handleClick}
            onKeyDown={handleKeyDown}
            className={styles.item}
          >
            {content}
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
        {content}
      </Root>
    )
  },
)
