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
  /** Fires with the next selected state when toggled. */
  onChange?: (selected: boolean) => void
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
      className,
      'aria-label': ariaLabel,
      selectedAriaLabel,
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

    // Selection swaps round⇄square; press (CSS :active) morphs to the tighter corner.
    const shapeState = isSelected ? (shape === 'round' ? 'square' : 'round') : shape
    const label = toggle && isSelected && selectedAriaLabel ? selectedAriaLabel : ariaLabel

    return (
      <button
        ref={ref}
        {...rest}
        type={type}
        disabled={disabled}
        onClick={handleClick}
        aria-label={label}
        aria-pressed={toggle ? isSelected : undefined}
        data-variant={variant}
        data-size={size}
        data-width={width}
        data-selected={toggle ? String(isSelected) : undefined}
        data-shape-state={shapeState}
        className={clsx(styles.iconButton, className)}
      >
        <span className={styles.icon} aria-hidden="true">
          {toggle && isSelected && selectedIcon != null ? selectedIcon : icon}
        </span>
        {!disabled && <Ripple />}
        {!disabled && <FocusRing />}
      </button>
    )
  },
)
