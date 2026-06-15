import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import {
  useButton,
  useObjectRef,
  mergeProps,
  type PressEvent,
} from 'react-aria'
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
  icon?: ReactNode
  /** Trailing icon (decorative). */
  trailingIcon?: ReactNode
  /** react-aria press handler (fires for pointer, keyboard, and touch). */
  onPress?: (event: PressEvent) => void
  children?: ReactNode
}

/**
 * Material Design 3 (Expressive) Button.
 *
 * Press handling is normalized via react-aria across pointer/keyboard/touch;
 * the MD3 state layer, press ripple, and focus ring come from the shared
 * primitives. On press the corner morphs to a tighter shape (Expressive).
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'filled',
    size = 'sm',
    shape = 'round',
    icon,
    trailingIcon,
    disabled = false,
    type = 'button',
    className,
    children,
    onPress,
    ...rest
  },
  forwardedRef,
) {
  const ref = useObjectRef(forwardedRef)
  const { buttonProps, isPressed } = useButton(
    { elementType: 'button', isDisabled: disabled, onPress, type },
    ref,
  )

  return (
    <button
      ref={ref}
      {...mergeProps(buttonProps, rest)}
      disabled={disabled}
      data-variant={variant}
      data-size={size}
      data-shape={shape}
      data-pressed={isPressed || undefined}
      className={clsx(styles.button, className)}
    >
      {icon != null && (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      )}
      {children != null && <span className={styles.label}>{children}</span>}
      {trailingIcon != null && (
        <span className={styles.icon} aria-hidden="true">
          {trailingIcon}
        </span>
      )}
      {!disabled && <Ripple />}
      {!disabled && <FocusRing />}
    </button>
  )
})
