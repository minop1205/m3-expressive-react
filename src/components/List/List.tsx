import {
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type LiHTMLAttributes,
  type MouseEvent,
  type MouseEventHandler,
  type ReactNode,
  useContext,
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

export interface ListItemProps
  extends Omit<LiHTMLAttributes<HTMLLIElement>, 'onChange' | 'onClick'> {
  /** Click handler. Providing it makes the row interactive (role="button"). */
  onClick?: MouseEventHandler<HTMLElement>
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
 * presence of `overline` / `supportingText`. Passing `onClick` makes the row
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
    const lines = 1 + (supportingText != null ? 1 : 0) + (overline != null ? 1 : 0)
    const lineCount = Math.min(lines, 3)

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
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
            <span className={styles.supporting}>{supportingText}</span>
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
            data-lines={lineCount}
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
        ref={ref}
        {...rest}
        data-lines={lineCount}
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
