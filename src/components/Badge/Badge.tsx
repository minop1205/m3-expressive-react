import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import clsx from 'clsx'
import styles from './Badge.module.css'

export type BadgeSize = 'small' | 'large'

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  /** Number to display inside the badge. Ignored when `size="small"`. */
  value?: number
  /**
   * Maximum value. Values above this show `{max}+`. Keep it at 999 or below —
   * MD3 limits a badge to four characters including the `+`.
   * @default 999
   */
  max?: number
  /** Badge size. `"small"` renders a dot; `"large"` renders a label. @default "large" */
  size?: BadgeSize
  /**
   * Whether the badge is visible. A hidden badge scales out and is then
   * removed from the accessibility tree as well.
   * @default true
   */
  visible?: boolean
  /**
   * Accessible description announced for the badge (rendered as visually
   * hidden text right after the anchor content; the visible digits are
   * hidden from assistive technology). Override it to localize.
   * @default "New notification" for a dot, "{n} new notifications" for a count
   */
  label?: string
  /** Content the badge is attached to (e.g. an icon). */
  children?: ReactNode
}

function defaultLabel(displayValue: string | undefined) {
  if (displayValue == null) return 'New notification'
  return displayValue === '1'
    ? `${displayValue} new notification`
    : `${displayValue} new notifications`
}

export const Badge = forwardRef<HTMLDivElement, BadgeProps>(function Badge(
  {
    value,
    max = 999,
    size = 'large',
    visible = true,
    label,
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
          data-size={size}
          aria-hidden={!visible || undefined}
        >
          {displayValue != null && (
            <span aria-hidden="true">{displayValue}</span>
          )}
          <span className={styles.visuallyHidden}>
            {label ?? defaultLabel(displayValue)}
          </span>
        </span>
      )}
    </div>
  )
})
