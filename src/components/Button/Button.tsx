import {
  forwardRef,
  useState,
  type ButtonHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from 'react'
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
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color' | 'onChange'> {
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
  /** Enable toggle (selectable) behavior with `aria-pressed` (Expressive). */
  toggle?: boolean
  /** Controlled selected state (toggle mode). */
  selected?: boolean
  /** Uncontrolled initial selected state (toggle mode). @default false */
  defaultSelected?: boolean
  /** Fires with the next selected state when toggled. */
  onChange?: (selected: boolean) => void
  children?: ReactNode
}

/**
 * Material Design 3 (Expressive) Button.
 *
 * A native `<button>` — activation, keyboard, and `onClick` are standard DOM
 * behavior (MUI-idiomatic). The MD3 state layer, press ripple, and focus ring
 * come from the shared primitives; the corner morphs to a tighter shape while
 * pressed via CSS `:active` (Expressive). Set `toggle` for a selectable button
 * (`aria-pressed`); the `text` variant has no toggle styling.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'filled',
    size = 'sm',
    shape = 'round',
    startIcon,
    endIcon,
    toggle = false,
    selected,
    defaultSelected = false,
    onChange,
    onClick,
    disabled = false,
    type = 'button',
    className,
    children,
    ...rest
  },
  ref,
) {
  const isControlled = selected !== undefined
  const [internalSelected, setInternalSelected] = useState(defaultSelected)
  const isSelected = toggle ? (isControlled ? selected : internalSelected) : false

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (toggle) {
      const next = !isSelected
      if (!isControlled) setInternalSelected(next)
      onChange?.(next)
    }
    onClick?.(event)
  }

  // Toggle buttons swap their resting shape when selected: round → square and
  // square → round (Expressive). Resolved in JS to a single data-shape-state
  // attribute; the pressed shape still wins via CSS :active.
  const shapeState = toggle && isSelected ? (shape === 'round' ? 'square' : 'round') : shape

  return (
    <button
      ref={ref}
      {...rest}
      type={type}
      disabled={disabled}
      onClick={handleClick}
      aria-pressed={toggle ? isSelected : undefined}
      data-variant={variant}
      data-size={size}
      data-shape-state={shapeState}
      data-selected={toggle ? String(isSelected) : undefined}
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
