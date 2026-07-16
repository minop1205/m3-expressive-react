import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import clsx from 'clsx'
import styles from './ButtonGroup.module.css'

export type ButtonGroupVariant = 'standard' | 'connected'
export type ButtonGroupSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type ButtonGroupOrientation = 'horizontal' | 'vertical'

export interface ButtonGroupProps extends HTMLAttributes<HTMLDivElement> {
  /** `standard` spaces buttons and pops the pressed one; `connected` joins them
   * into a single shape with small inner corners. @default 'standard' */
  variant?: ButtonGroupVariant
  /** Controls the between-space to match the child button size. @default 'sm' */
  size?: ButtonGroupSize
  /** Layout direction. @default 'horizontal' */
  orientation?: ButtonGroupOrientation
  /** `Button` / `IconButton` children. */
  children?: ReactNode
}

/**
 * Material Design 3 (Expressive) Button group — an invisible container that adds
 * padding between buttons and modifies their shape.
 *
 * `standard` spaces buttons by the size's between-space (12dp at sm, per Compose
 * ButtonGroupSmallTokens) and pops the pressed button. `connected` joins buttons
 * with a 2dp gap (ConnectedButtonGroupSmallTokens), fully rounding the outer
 * corners and giving the inner corners a small radius. Wraps `Button` /
 * `IconButton` children — it has no color of its own.
 */
export const ButtonGroup = forwardRef<HTMLDivElement, ButtonGroupProps>(
  function ButtonGroup(
    { variant = 'standard', size = 'sm', orientation = 'horizontal', className, children, ...rest },
    ref,
  ) {
    return (
      <div
        ref={ref}
        {...rest}
        role="group"
        data-variant={variant}
        data-size={size}
        data-orientation={orientation}
        className={clsx(styles.group, className)}
      >
        {children}
      </div>
    )
  },
)
