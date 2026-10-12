import type { BadgeProps } from '../components/Badge/Badge'

/** Text a Badge paints (`undefined` for a dot or when there is no value). */
export function badgeDisplayValue({
  value,
  max = 999,
  size = 'large',
}: Pick<BadgeProps, 'value' | 'max' | 'size'>): string | undefined {
  if (size === 'small' || value == null) return undefined
  return value > max ? `${max}+` : `${value}`
}

/** Default English badge label (Phase B B28): "New notification" / "{n} new notifications". */
export function defaultBadgeLabel(displayValue: string | undefined): string {
  if (displayValue == null) return 'New notification'
  return displayValue === '1'
    ? `${displayValue} new notification`
    : `${displayValue} new notifications`
}

/**
 * Accessible text a Badge with these props announces, or `undefined` when it
 * renders nothing or is hidden (`visible={false}`). Lets a host that hides the
 * Badge itself from assistive technology (e.g. a Tab, which reads the badge
 * after its label) announce the same text.
 */
export function badgeAccessibleLabel(props: BadgeProps): string | undefined {
  const { size = 'large', value, visible = true, label } = props
  const shown = size === 'small' || value != null
  if (!shown || !visible) return undefined
  return label ?? defaultBadgeLabel(badgeDisplayValue(props))
}
