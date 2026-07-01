import {
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import clsx from 'clsx'
import { Ripple } from '../../primitives/Ripple/Ripple'
import { FocusRing } from '../../primitives/FocusRing/FocusRing'
import styles from './Card.module.css'

export type CardVariant = 'filled' | 'elevated' | 'outlined'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Container style. @default 'filled' */
  variant?: CardVariant
  /** Disable interaction and dim the card (only meaningful when `onClick` is set). */
  disabled?: boolean
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
    if (
      interactive &&
      !disabled &&
      !event.defaultPrevented &&
      (event.key === 'Enter' || event.key === ' ')
    ) {
      event.preventDefault()
      event.currentTarget.click()
    }
  }

  return (
    <div
      ref={ref}
      {...rest}
      data-variant={variant}
      data-interactive={interactive || undefined}
      data-disabled={disabled || undefined}
      role={interactive ? role ?? 'button' : role}
      tabIndex={interactive && !disabled ? tabIndex ?? 0 : tabIndex}
      aria-disabled={interactive && disabled ? true : undefined}
      onClick={disabled ? undefined : onClick}
      onKeyDown={handleKeyDown}
      className={clsx(styles.card, className)}
    >
      {children}
      {interactive && !disabled && <Ripple />}
      {interactive && !disabled && <FocusRing />}
    </div>
  )
})
