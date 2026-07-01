import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import clsx from 'clsx'
import { Ripple } from '../../primitives/Ripple/Ripple'
import { FocusRing } from '../../primitives/FocusRing/FocusRing'
import styles from './Fab.module.css'

/** FAB color style. @default 'primary-container' */
export type FabColor =
  | 'primary-container'
  | 'secondary-container'
  | 'tertiary-container'
  | 'primary'
  | 'secondary'
  | 'tertiary'

/** FAB size. @default 'regular' */
export type FabSize = 'small' | 'regular' | 'medium' | 'large'

export interface FabProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color' | 'children'> {
  /** The icon displayed in the FAB. */
  icon: ReactNode
  /** Optional label — turns the FAB into an Extended FAB. */
  label?: string
  /** Container color style. @default 'primary-container' */
  color?: FabColor
  /** Container size. @default 'regular' (56dp) */
  size?: FabSize
}

/**
 * Material Design 3 (Expressive) Floating Action Button.
 *
 * A native `<button>` (MUI-idiomatic `onClick`) supporting 4 sizes
 * (small 40dp, regular 56dp, medium 80dp, large 96dp), 6 color styles, and an
 * optional label for the Extended FAB. Elevation lifts on hover (level 3 → 4)
 * and the corner morphs while pressed (CSS `:active`).
 */
export const Fab = forwardRef<HTMLButtonElement, FabProps>(function Fab(
  {
    icon,
    label,
    color = 'primary-container',
    size = 'regular',
    disabled = false,
    type = 'button',
    className,
    ...rest
  },
  ref,
) {
  const isExtended = label != null

  return (
    <button
      ref={ref}
      {...rest}
      type={type}
      disabled={disabled}
      data-color={color}
      data-size={size}
      data-extended={isExtended || undefined}
      className={clsx(styles.fab, className)}
    >
      <span className={styles.icon} aria-hidden="true">
        {icon}
      </span>
      {isExtended && <span className={styles.label}>{label}</span>}
      {!disabled && <Ripple />}
      {!disabled && <FocusRing />}
    </button>
  )
})
