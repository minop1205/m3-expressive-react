import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import clsx from 'clsx'
import styles from './Toolbar.module.css'

export type ToolbarVariant = 'docked' | 'floating'
export type ToolbarColor = 'standard' | 'vibrant'
export type ToolbarOrientation = 'horizontal' | 'vertical'

export interface ToolbarProps extends HTMLAttributes<HTMLDivElement> {
  /** Docked (full-width bar) or floating (rounded, elevated). @default 'docked' */
  variant?: ToolbarVariant
  /** Color scheme. @default 'standard' */
  color?: ToolbarColor
  /** Item flow direction (floating only). @default 'horizontal' */
  orientation?: ToolbarOrientation
  /** Slots — usually icon buttons, buttons, or text fields. */
  children?: ReactNode
}

/**
 * Material Design 3 (Expressive) Toolbar — a container of action slots.
 *
 * `docked` renders a full-width 64dp bar (SurfaceContainer / PrimaryContainer),
 * center-aligned with a 16dp minimum outside padding. `floating` renders a
 * rounded, elevated pill (CornerFull) with 8dp inner padding and 4dp gaps that
 * can flow horizontally or vertically — per m3.material.io / Compose
 * FloatingToolbarTokens. Standard = SurfaceContainer, vibrant = PrimaryContainer.
 */
export const Toolbar = forwardRef<HTMLDivElement, ToolbarProps>(function Toolbar(
  { variant = 'docked', color = 'standard', orientation = 'horizontal', className, children, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      {...rest}
      role="toolbar"
      aria-orientation={variant === 'floating' ? orientation : 'horizontal'}
      data-variant={variant}
      data-color={color}
      data-orientation={orientation}
      className={clsx(styles.toolbar, className)}
    >
      {children}
    </div>
  )
})
