import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import clsx from 'clsx'
import styles from './Badge.module.css'

export type BadgeSize = 'small' | 'large'

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  /** Number to display inside the badge. Ignored when `size="small"`. */
  value?: number
  /** Maximum value. Values above this show `{max}+`. @default 999 */
  max?: number
  /** Badge size. `"small"` renders a dot; `"large"` renders a label. @default "large" */
  size?: BadgeSize
  /** Whether the badge is visible. @default true */
  visible?: boolean
  /** Content the badge is attached to (e.g. an icon). */
  children?: ReactNode
}

export const Badge = forwardRef<HTMLDivElement, BadgeProps>(function Badge(
  {
    value,
    max = 999,
    size = 'large',
    visible = true,
    children,
    className,
    ...rest
  },
  ref,
) {
  const displayValue =
    size === 'small' || value == null
      ? undefined
      : value > max
        ? `${max}+`
        : `${value}`

  const showBadge = size === 'small' || value != null

  return (
    <div ref={ref} className={clsx(styles.anchor, className)} {...rest}>
      {children}
      {showBadge && (
        <span
          className={clsx(
            styles.badge,
            styles[size],
            visible && styles.visible,
          )}
          role="status"
          aria-label={
            displayValue != null ? `${displayValue} notifications` : undefined
          }
        >
          {displayValue}
        </span>
      )}
    </div>
  )
})
