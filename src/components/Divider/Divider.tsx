import { forwardRef, type HTMLAttributes } from 'react'
import clsx from 'clsx'
import styles from './Divider.module.css'

export type DividerVariant = 'full-width' | 'inset' | 'middle-inset'
export type DividerOrientation = 'horizontal' | 'vertical'

export interface DividerProps extends HTMLAttributes<HTMLHRElement> {
  /** Layout variant. @default "full-width" */
  variant?: DividerVariant
  /**
   * Orientation. A vertical divider stretches to the height of its flex /
   * grid row (`align-self: stretch`).
   * @default "horizontal"
   */
  orientation?: DividerOrientation
  /**
   * Whether the divider is purely decorative. MD3 dividers are decorative
   * elements (Compose draws them without semantics), so by default the
   * divider is hidden from assistive technology (`aria-hidden`). Pass
   * `decorative={false}` for a meaningful thematic break — it is then
   * exposed as a separator (the implicit role of `<hr>`; a vertical divider
   * adds `aria-orientation="vertical"`).
   * @default true
   */
  decorative?: boolean
}

export const Divider = forwardRef<HTMLHRElement, DividerProps>(
  function Divider(
    {
      variant = 'full-width',
      orientation = 'horizontal',
      decorative = true,
      className,
      ...rest
    },
    ref,
  ) {
    return (
      <hr
        ref={ref}
        aria-hidden={decorative || undefined}
        aria-orientation={
          !decorative && orientation === 'vertical' ? 'vertical' : undefined
        }
        data-variant={variant}
        data-orientation={orientation}
        className={clsx(styles.divider, className)}
        {...rest}
      />
    )
  },
)
