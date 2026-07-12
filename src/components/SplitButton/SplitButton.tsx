import {
  forwardRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react'
import clsx from 'clsx'
import { Ripple } from '../../primitives/Ripple/Ripple'
import { FocusRing } from '../../primitives/FocusRing/FocusRing'
import { Menu } from '../Menu/Menu'
import styles from './SplitButton.module.css'

export type SplitButtonVariant = 'elevated' | 'filled' | 'tonal' | 'outlined'
export type SplitButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const ChevronIcon = (
  <svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor" aria-hidden="true">
    <path d="M7 10l5 5 5-5z" />
  </svg>
)

export interface SplitButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color' | 'onChange'> {
  /** Visual emphasis (shared by both buttons). @default 'filled' */
  variant?: SplitButtonVariant
  /** Container size on the Expressive scale. @default 'sm' (40dp) */
  size?: SplitButtonSize
  /** Leading action button label. */
  children?: ReactNode
  /** Leading icon (decorative). */
  startIcon?: ReactNode
  /** `MenuItem`s shown when the trailing button opens the menu. */
  menu: ReactNode
  /** Menu alignment to the trailing button. @default 'end' */
  menuAlign?: 'start' | 'end'
  /** Controlled menu open state. */
  open?: boolean
  /** Notified when the menu open state changes. */
  onOpenChange?: (open: boolean) => void
  /** Accessible label for the trailing menu button. @default 'More options' */
  trailingAriaLabel?: string
}

/**
 * Material Design 3 (Expressive) Split button.
 *
 * A leading action button joined to a trailing menu button (2dp gap). Both share
 * the standard button color schemes; the outer corners are round (CornerFull)
 * and the inner corners small. Opening the menu morphs the trailing button's
 * inner corner to round and rotates its chevron 180° — the signature split-button
 * interaction (per m3.material.io split-button specs). Reuses `Menu` for the
 * dropdown and the shared Ripple / FocusRing primitives.
 */
export const SplitButton = forwardRef<HTMLButtonElement, SplitButtonProps>(
  function SplitButton(
    {
      variant = 'filled',
      size = 'sm',
      children,
      startIcon,
      menu,
      menuAlign = 'end',
      open: controlledOpen,
      onOpenChange,
      trailingAriaLabel = 'More options',
      disabled = false,
      className,
      onClick,
      ...rest
    },
    ref,
  ) {
    const isControlled = controlledOpen !== undefined
    const [uncontrolled, setUncontrolled] = useState(false)
    const open = isControlled ? controlledOpen : uncontrolled
    const setOpen = (value: boolean) => {
      if (!isControlled) setUncontrolled(value)
      onOpenChange?.(value)
    }

    return (
      <div
        className={clsx(styles.split, className)}
        data-variant={variant}
        data-size={size}
        data-open={open || undefined}
      >
        <button
          ref={ref}
          {...rest}
          type="button"
          disabled={disabled}
          onClick={onClick}
          className={styles.leading}
        >
          {startIcon != null && (
            <span className={styles.icon} aria-hidden="true">
              {startIcon}
            </span>
          )}
          {children != null && <span className={styles.label}>{children}</span>}
          {!disabled && <Ripple />}
          {!disabled && <FocusRing />}
        </button>

        <Menu
          open={open}
          onOpenChange={setOpen}
          align={menuAlign}
          trigger={
            <button
              type="button"
              disabled={disabled}
              aria-label={trailingAriaLabel}
              className={styles.trailing}
            >
              <span className={styles.chevron} aria-hidden="true">
                {ChevronIcon}
              </span>
              {!disabled && <Ripple />}
              {!disabled && <FocusRing />}
            </button>
          }
        >
          {menu}
        </Menu>
      </div>
    )
  },
)
