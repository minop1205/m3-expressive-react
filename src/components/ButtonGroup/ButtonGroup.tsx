import { forwardRef, useImperativeHandle, useRef, type HTMLAttributes, type ReactNode } from 'react'
import clsx from 'clsx'
import styles from './ButtonGroup.module.css'
import { usePressWidth } from './usePressWidth'

export type ButtonGroupVariant = 'standard' | 'connected'
export type ButtonGroupSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type ButtonGroupOrientation = 'horizontal' | 'vertical'

export interface ButtonGroupProps extends HTMLAttributes<HTMLDivElement> {
  /** `standard` spaces buttons and widens the pressed one; `connected` joins
   * them into a single shape with small inner corners. @default 'standard' */
  variant?: ButtonGroupVariant
  /** Match the child button size: sets the between-space (standard) or the
   * inner corners and 48dp minimum width (connected). @default 'sm' */
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
 * `standard` spaces buttons by the size's between-space (18 / 12 / 8 / 8 / 8dp
 * for xs–xl); pressing a button widens it by 15% and narrows its neighbours
 * (Compose `animateWidth`). `connected` joins buttons with a 2dp gap, keeps the
 * outer corners fully round, gives the inner corners a per-size radius that
 * tightens while pressed, and fully rounds a selected (toggle) button. Wraps
 * `Button` / `IconButton` children — it has no color of its own.
 */
export const ButtonGroup = forwardRef<HTMLDivElement, ButtonGroupProps>(
  function ButtonGroup(
    { variant = 'standard', size = 'sm', orientation = 'horizontal', className, children, ...rest },
    ref,
  ) {
    const rootRef = useRef<HTMLDivElement>(null)
    useImperativeHandle(ref, () => rootRef.current as HTMLDivElement)
    usePressWidth(rootRef, variant === 'standard' && orientation === 'horizontal')

    return (
      <div
        ref={rootRef}
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
