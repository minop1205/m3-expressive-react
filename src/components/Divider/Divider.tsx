import { forwardRef, type HTMLAttributes } from 'react'
import clsx from 'clsx'
import styles from './Divider.module.css'

export type DividerVariant = 'full-width' | 'inset' | 'middle-inset'
export type DividerOrientation = 'horizontal' | 'vertical'

export interface DividerProps extends HTMLAttributes<HTMLHRElement> {
  /** Layout variant. @default "full-width" */
  variant?: DividerVariant
  /** Orientation. @default "horizontal" */
  orientation?: DividerOrientation
}

export const Divider = forwardRef<HTMLHRElement, DividerProps>(
  function Divider(
    { variant = 'full-width', orientation = 'horizontal', className, ...rest },
    ref,
  ) {
    return (
      <hr
        ref={ref}
        role="separator"
        aria-orientation={orientation}
        data-variant={variant}
        data-orientation={orientation}
        className={clsx(styles.divider, className)}
        {...rest}
      />
    )
  },
)
