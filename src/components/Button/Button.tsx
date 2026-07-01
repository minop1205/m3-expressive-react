import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import clsx from 'clsx'
import { Ripple } from '../../primitives/Ripple/Ripple'
import { FocusRing } from '../../primitives/FocusRing/FocusRing'
import styles from './Button.module.css'

export type ButtonVariant = 'elevated' | 'filled' | 'tonal' | 'outlined' | 'text'

/** Expressive size scale: 32 / 40 / 56 / 96 / 136 dp container heights. */
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

/** `round` is the stadium default; `square` opts into the less-rounded shape. */
export type ButtonShape = 'round' | 'square'

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color'> {
  /** Visual emphasis. @default 'filled' */
  variant?: ButtonVariant
  /** Container size on the Expressive scale. @default 'sm' (40dp) */
  size?: ButtonSize
  /** Resting shape; both shapes morph to a tighter corner while pressed. @default 'round' */
  shape?: ButtonShape
  /** Leading icon (decorative). */
  startIcon?: ReactNode
  /** Trailing icon (decorative). */
  endIcon?: ReactNode
  children?: ReactNode
}

/**
 * Material Design 3 (Expressive) Button.
 *
 * A native `<button>` — activation, keyboard, and `onClick` are standard DOM
 * behavior (MUI-idiomatic). The MD3 state layer, press ripple, and focus ring
 * come from the shared primitives; the corner morphs to a tighter shape while
 * pressed via CSS `:active` (Expressive).
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'filled',
    size = 'sm',
    shape = 'round',
    startIcon,
    endIcon,
    disabled = false,
    type = 'button',
    className,
    children,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      {...rest}
      type={type}
      disabled={disabled}
      data-variant={variant}
      data-size={size}
      data-shape={shape}
      className={clsx(styles.button, className)}
    >
      {startIcon != null && (
        <span className={styles.icon} aria-hidden="true">
          {startIcon}
        </span>
      )}
      {children != null && <span className={styles.label}>{children}</span>}
      {endIcon != null && (
        <span className={styles.icon} aria-hidden="true">
          {endIcon}
        </span>
      )}
      {!disabled && <Ripple />}
      {!disabled && <FocusRing />}
    </button>
  )
})
