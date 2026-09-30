import {
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react'
import clsx from 'clsx'
import { Ripple } from '../../primitives/Ripple/Ripple'
import { FocusRing } from '../../primitives/FocusRing/FocusRing'
import {
  isContainerKeyActivation,
  isFromNestedInteractive,
} from '../../internal/isFromNestedInteractive'
import styles from './Card.module.css'

export type CardVariant = 'filled' | 'elevated' | 'outlined'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Container style. @default 'filled' */
  variant?: CardVariant
  /**
   * Show the disabled appearance (container and content at 38%). A clickable
   * card also stops responding (`aria-disabled`, removed from the Tab order).
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

/**
 * Material Design 3 Card.
 *
 * A container `<div>` with the three MD3 styles (filled / elevated / outlined),
 * corner-medium (12dp) shape. Passing `onClick` makes the whole card
 * interactive — it gains `role="button"`, keyboard activation, a hover
 * elevation bump, the state-layer ripple, and the focus ring.
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  {
    variant = 'filled',
    disabled = false,
    dragged = false,
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
  const interactive = onClick != null

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event)
    // Only when the card itself is focused — keys from nested controls
    // (buttons, inputs) belong to those controls (docs/audits/card.md CD1).
    if (interactive && !disabled && isContainerKeyActivation(event)) {
      event.preventDefault()
      event.currentTarget.click()
    }
  }

  // Clicks on nested interactive elements activate only that element.
  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    if (isFromNestedInteractive(event)) return
    onClick?.(event)
  }

  return (
    <div
      ref={ref}
      {...rest}
      data-variant={variant}
      data-interactive={interactive || undefined}
      data-disabled={disabled || undefined}
      data-dragged={dragged || undefined}
      role={interactive ? role ?? 'button' : role}
      tabIndex={interactive && !disabled ? tabIndex ?? 0 : tabIndex}
      aria-disabled={interactive && disabled ? true : undefined}
      onClick={interactive && !disabled ? handleClick : undefined}
      onKeyDown={handleKeyDown}
      className={clsx(styles.card, className)}
    >
      {children}
      {((interactive && !disabled) || dragged) && (
        <Ripple disabled={!interactive || disabled} dragged={dragged} ignoreNestedPress />
      )}
      {interactive && !disabled && <FocusRing />}
    </div>
  )
})
