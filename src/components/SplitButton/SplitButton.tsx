'use client'

import {
  forwardRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react'
import clsx from 'clsx'
import { Ripple } from '../../primitives/Ripple/Ripple'
import { FocusRing } from '../../primitives/FocusRing/FocusRing'
import { Menu, type MenuAlign } from '../Menu/Menu'
// Both halves ARE Buttons visually: they take Button's own class and
// data-variant / data-size hooks, so colors, disabled opacities, outline
// widths, typography, the 48dp touch target and the press-morph timing come
// from Button.module.css and cannot drift. SplitButton.module.css only adds
// the split geometry (paddings, widths, joined corners, chevron).
import buttonStyles from '../Button/Button.module.css'
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
  menuAlign?: MenuAlign
  /** Controlled menu open state. */
  open?: boolean
  /** Uncontrolled initial open state. @default false */
  defaultOpen?: boolean
  /** Notified when the menu open state changes. */
  onOpenChange?: (open: boolean) => void
  /**
   * Accessible label for the trailing menu button. Prefer a label tied to the
   * leading action (e.g. "More send options"). @default 'More options'
   */
  trailingAriaLabel?: string
}

/**
 * Material Design 3 (Expressive) Split button.
 *
 * A leading action button joined to a trailing menu button (2dp gap). Both
 * halves are styled by `Button` itself (same colors, disabled state, outline,
 * typography and 48dp touch target); the outer corners are round (CornerFull)
 * and the inner corners small, growing on hover / focus / press. Opening the
 * menu morphs the trailing button's inner corner to round, tints it with the
 * selected state layer and rotates its chevron 180° — the signature
 * split-button interaction (per m3.material.io split-button specs). Reuses
 * `Menu` for the dropdown and the shared Ripple / FocusRing primitives.
 *
 * An icon-only leading button (`startIcon` without `children`) needs an
 * `aria-label`, which is forwarded to the leading button.
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
      defaultOpen = false,
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
    const [uncontrolled, setUncontrolled] = useState(defaultOpen)
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
          data-variant={variant}
          data-size={size}
          className={clsx(buttonStyles.button, styles.leading)}
        >
          {startIcon != null && (
            <span className={buttonStyles.icon} aria-hidden="true">
              {startIcon}
            </span>
          )}
          {children != null && <span className={buttonStyles.label}>{children}</span>}
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
              data-variant={variant}
              data-size={size}
              className={clsx(buttonStyles.button, styles.trailing)}
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
