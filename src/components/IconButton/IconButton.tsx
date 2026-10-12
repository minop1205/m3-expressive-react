'use client'

import {
  forwardRef,
  type ButtonHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from 'react'
import clsx from 'clsx'
import { Ripple } from '../../primitives/Ripple/Ripple'
import { FocusRing } from '../../primitives/FocusRing/FocusRing'
import { useButtonToggle } from '../ButtonGroup/ButtonGroupContext'
import styles from './IconButton.module.css'

export type IconButtonVariant = 'standard' | 'filled' | 'tonal' | 'outlined'

/** Expressive size scale: 32 / 40 / 56 / 96 / 136 dp container heights. */
export type IconButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

/** Horizontal footprint: narrow, default (square), or wide. */
export type IconButtonWidth = 'narrow' | 'default' | 'wide'

export type IconButtonShape = 'round' | 'square'

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color' | 'children' | 'onChange'> {
  /** The icon (decorative; the button is labelled via aria-label). */
  icon: ReactNode
  /** Alternate icon shown while selected in toggle mode. */
  selectedIcon?: ReactNode
  /** Visual emphasis. @default 'filled' */
  variant?: IconButtonVariant
  /** Container size on the Expressive scale. @default 'sm' (40dp) */
  size?: IconButtonSize
  /** Container width footprint. @default 'default' */
  width?: IconButtonWidth
  /** Resting shape; morphs on press and on toggle selection. @default 'round' */
  shape?: IconButtonShape
  /** Enable toggle (selectable) behavior with aria-pressed. */
  toggle?: boolean
  /** Controlled selected state (toggle mode). */
  selected?: boolean
  /** Uncontrolled initial selected state (toggle mode). @default false */
  defaultSelected?: boolean
  /** Fires with the triggering event and the next selected state when toggled. */
  onChange?: (event: MouseEvent<HTMLButtonElement>, selected: boolean) => void
  /** Accessible label swapped in when selected (toggle mode). */
  selectedAriaLabel?: string
}

/**
 * Material Design 3 (Expressive) Icon Button.
 *
 * A native `<button>` (MUI-idiomatic `onClick`) supporting the 4 variants, the
 * Expressive size/width scale, and toggle mode. The state layer, ripple, and
 * focus ring come from shared primitives. The shape morphs to a tighter corner
 * while pressed (CSS `:active`) and round⇄square on toggle selection.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    {
      icon,
      selectedIcon,
      variant = 'filled',
      size = 'sm',
      width = 'default',
      shape = 'round',
      toggle = false,
      selected,
      defaultSelected = false,
      onChange,
      onClick,
      disabled = false,
      type = 'button',
      value,
      tabIndex,
      className,
      'aria-label': ariaLabel,
      selectedAriaLabel,
      ...rest
    },
    ref,
  ) {
    const { isToggle, isSelected, handleClick, a11y } = useButtonToggle({
      value,
      toggle,
      selected,
      defaultSelected,
      onChange,
      onClick,
      tabIndex,
    })

    // Selection swaps round⇄square; press (CSS :active) morphs to the tighter corner.
    const shapeState = isSelected ? (shape === 'round' ? 'square' : 'round') : shape
    const label = isToggle && isSelected && selectedAriaLabel ? selectedAriaLabel : ariaLabel

    return (
      <button
        ref={ref}
        {...rest}
        type={type}
        value={value}
        disabled={disabled}
        onClick={handleClick}
        aria-label={label}
        {...a11y}
        data-variant={variant}
        data-size={size}
        data-width={width}
        data-selected={isToggle ? String(isSelected) : undefined}
        data-shape-state={shapeState}
        className={clsx(styles.iconButton, className)}
      >
        <span className={styles.icon} aria-hidden="true">
          {isToggle && isSelected && selectedIcon != null ? selectedIcon : icon}
        </span>
        {!disabled && <Ripple />}
        {!disabled && <FocusRing />}
      </button>
    )
  },
)
