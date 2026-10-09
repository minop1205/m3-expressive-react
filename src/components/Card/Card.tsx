import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type Ref,
} from 'react'
import clsx from 'clsx'
import { Ripple } from '../../primitives/Ripple/Ripple'
import { FocusRing } from '../../primitives/FocusRing/FocusRing'
import {
  findNestedInteractive,
  isContainerKeyActivation,
  isFromNestedInteractive,
} from '../../internal/isFromNestedInteractive'
import { assignRef } from '../../internal/assignRef'
import { devWarnOnce } from '../../internal/devWarning'
import styles from './Card.module.css'

export type CardVariant = 'filled' | 'elevated' | 'outlined'

/** Link props shared by `Card` and `CardActionArea` (B5: `href` → `<a>`). */
export interface CardLinkProps {
  /**
   * Make the surface a link: renders an `<a href>` (Enter activates; middle
   * click, open-in-new-tab and the status-bar URL work natively).
   */
  href?: string
  /** `<a target>` — only with `href`. */
  target?: string
  /** `<a rel>` — only with `href`. */
  rel?: string
  /** `<a download>` — only with `href`. */
  download?: boolean | string
}

export interface CardProps extends HTMLAttributes<HTMLDivElement>, CardLinkProps {
  /** Container style. @default 'filled' */
  variant?: CardVariant
  /**
   * Show the disabled appearance (container and content at 38%). A clickable
   * or link card also stops responding (`aria-disabled`, removed from the Tab
   * order).
   */
  disabled?: boolean
  /**
   * Apply the MD3 dragged appearance — raised elevation (filled / outlined
   * 6dp, elevated 8dp) and the 0.16 on-surface state layer — for
   * drag-and-drop. Works on static and clickable cards.
   */
  dragged?: boolean
  children?: ReactNode
}

const NESTED_WARNING =
  'A clickable Card (onClick / href) contains an interactive element. Nested ' +
  'controls inside a button / link are invalid (axe nested-interactive) and may ' +
  'not be exposed to assistive technology. Use a static <Card> with ' +
  '<CardActionArea> for the primary action and <CardActions> for the buttons.'

/** Shared activation surface of `Card` (whole card) and `CardActionArea`. */
function useActionSurface({
  interactive,
  disabled,
  onClick,
  onKeyDown,
  onKeyUp,
  isLink,
}: {
  interactive: boolean
  disabled: boolean
  onClick?: (event: MouseEvent<HTMLElement>) => void
  onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void
  onKeyUp?: (event: KeyboardEvent<HTMLElement>) => void
  isLink: boolean
}) {
  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    onKeyDown?.(event)
    // Links activate natively on Enter only (never Space). The button-like
    // <div> activates on Enter / Space, and only when it is the focused
    // element — keys from nested controls belong to them (card.md CD1).
    if (isLink) return
    if (interactive && !disabled && isContainerKeyActivation(event)) {
      event.preventDefault()
      // Like a native <button>: Enter activates on keydown, Space on keyup
      // (handled below) — and a held Space never auto-repeats (#423).
      if (event.key === 'Enter') event.currentTarget.click()
    }
  }

  const handleKeyUp = (event: KeyboardEvent<HTMLElement>) => {
    onKeyUp?.(event)
    if (isLink || !interactive || disabled) return
    if (event.key === ' ' && event.target === event.currentTarget && !event.defaultPrevented) {
      event.currentTarget.click()
    }
  }

  // Clicks on nested interactive elements activate only that element.
  const handleClick = (event: MouseEvent<HTMLElement>) => {
    if (isFromNestedInteractive(event)) {
      // A nested control inside a link: keep the link from navigating too.
      if (isLink) event.preventDefault()
      return
    }
    onClick?.(event)
  }

  return { handleKeyDown, handleKeyUp, handleClick }
}

/**
 * Material Design 3 Card.
 *
 * A container with the three MD3 styles (filled / elevated / outlined),
 * corner-medium (12dp) shape.
 *
 * - **Static** (default): a `<div>`; compose actions inside with
 *   `CardActionArea` (the primary action — a button or link wrapping the
 *   content) and `CardActions` (a row of buttons beside it).
 * - **`onClick`**: the whole card is one button (`role="button"`, Enter /
 *   Space, ripple, focus ring, state elevation).
 * - **`href`**: the whole card is one link (`<a>`, Enter only).
 *
 * A clickable / link card must not contain other interactive elements (a
 * development warning points to `CardActionArea` + `CardActions`).
 */
export const Card = forwardRef<HTMLElement, CardProps>(function Card(
  {
    variant = 'filled',
    disabled = false,
    dragged = false,
    href,
    target,
    rel,
    download,
    onClick,
    onKeyDown,
    className,
    children,
    role,
    tabIndex,
    ...rest
  },
  ref,
) {
  const isLink = href != null
  const interactive = onClick != null || isLink
  const { handleKeyDown, handleKeyUp, handleClick } = useActionSurface({
    interactive,
    disabled,
    onClick: onClick as ((event: MouseEvent<HTMLElement>) => void) | undefined,
    onKeyDown: onKeyDown as ((event: KeyboardEvent<HTMLElement>) => void) | undefined,
    onKeyUp: (rest as HTMLAttributes<HTMLElement>).onKeyUp,
    isLink,
  })

  const rootRef = useRef<HTMLElement | null>(null)
  const setRef = useCallback(
    (node: HTMLElement | null) => {
      rootRef.current = node
      assignRef(ref, node)
    },
    [ref],
  )

  useEffect(() => {
    if (interactive && rootRef.current && findNestedInteractive(rootRef.current)) {
      devWarnOnce(NESTED_WARNING)
    }
  })

  const common: HTMLAttributes<HTMLElement> & Record<`data-${string}`, unknown> = {
    ...(rest as HTMLAttributes<HTMLElement>),
    'data-variant': variant,
    'data-interactive': interactive || undefined,
    'data-disabled': disabled || undefined,
    'data-dragged': dragged || undefined,
    className: clsx(styles.card, isLink && styles.link, className),
    onKeyDown: handleKeyDown,
    onKeyUp: handleKeyUp,
  }
  const content = (
    <>
      {children}
      {((interactive && !disabled) || dragged) && (
        <Ripple disabled={!interactive || disabled} dragged={dragged} ignoreNestedPress />
      )}
      {interactive && !disabled && <FocusRing />}
    </>
  )

  if (isLink) {
    return (
      <a
        ref={setRef as (node: HTMLAnchorElement | null) => void}
        {...common}
        // A disabled link has no href (not focusable, not followable).
        href={disabled ? undefined : href}
        target={target}
        rel={rel}
        download={download}
        role={role ?? (disabled ? 'link' : undefined)}
        tabIndex={tabIndex}
        aria-disabled={disabled || undefined}
        onClick={disabled ? undefined : handleClick}
      >
        {content}
      </a>
    )
  }

  return (
    <div
      ref={setRef as (node: HTMLDivElement | null) => void}
      {...common}
      role={interactive ? role ?? 'button' : role}
      tabIndex={interactive && !disabled ? tabIndex ?? 0 : tabIndex}
      aria-disabled={interactive && disabled ? true : undefined}
      onClick={interactive && !disabled ? handleClick : undefined}
    >
      {content}
    </div>
  )
})

export interface CardActionAreaProps extends HTMLAttributes<HTMLElement>, CardLinkProps {
  /** Disable the action (dimmed by the card's `disabled`, not by this prop). */
  disabled?: boolean
  children?: ReactNode
}

/**
 * The primary action of a static `Card` (MUI `CardActionArea`): wraps the
 * card's content in one button (`onClick` → `role="button"`, Enter / Space)
 * or link (`href` → `<a>`, Enter), with the ripple, focus ring and the card's
 * hover / pressed elevation. Its accessible name comes from its content.
 * Place other actions in a sibling `CardActions`, never inside it.
 */
export const CardActionArea = forwardRef<HTMLElement, CardActionAreaProps>(
  function CardActionArea(
    {
      href,
      target,
      rel,
      download,
      disabled = false,
      onClick,
      onKeyDown,
      className,
      children,
      role,
      tabIndex,
      ...rest
    },
    ref,
  ) {
    const isLink = href != null
    const { handleKeyDown, handleKeyUp, handleClick } = useActionSurface({
      interactive: true,
      disabled,
      onClick,
      onKeyDown,
      onKeyUp: (rest as HTMLAttributes<HTMLElement>).onKeyUp,
      isLink,
    })
    const content = (
      <>
        {children}
        {!disabled && <Ripple ignoreNestedPress />}
        {!disabled && <FocusRing />}
      </>
    )
    const common: HTMLAttributes<HTMLElement> & Record<`data-${string}`, unknown> = {
      ...rest,
      'data-disabled': disabled || undefined,
      className: clsx(styles.actionArea, className),
      onKeyDown: handleKeyDown,
      onKeyUp: handleKeyUp,
      onClick: disabled ? undefined : handleClick,
      'aria-disabled': disabled || undefined,
    }
    if (isLink) {
      return (
        <a
          ref={ref as Ref<HTMLAnchorElement>}
          {...common}
          href={disabled ? undefined : href}
          target={target}
          rel={rel}
          download={download}
          role={role ?? (disabled ? 'link' : undefined)}
          tabIndex={tabIndex}
        >
          {content}
        </a>
      )
    }
    return (
      <div
        ref={ref as Ref<HTMLDivElement>}
        {...common}
        role={role ?? 'button'}
        tabIndex={disabled ? undefined : tabIndex ?? 0}
      >
        {content}
      </div>
    )
  },
)

export interface CardActionsProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode
}

/**
 * A row of actions at the end of a `Card` (MUI `CardActions`) — buttons,
 * icon buttons or chips placed beside (not inside) a `CardActionArea`.
 * End-aligned, 8dp apart, with 16dp padding at the sides and bottom.
 */
export const CardActions = forwardRef<HTMLDivElement, CardActionsProps>(
  function CardActions({ className, children, ...rest }, ref) {
    return (
      <div ref={ref} {...rest} className={clsx(styles.actions, className)}>
        {children}
      </div>
    )
  },
)
