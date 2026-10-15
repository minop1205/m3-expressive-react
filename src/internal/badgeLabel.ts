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

/** A LocaleProvider `labels.Badge.getLabel` (Phase B B50). */
export type BadgeLabelGetter = (count: string | undefined) => string

/**
 * Badge label: `getLabel` (from LocaleProvider, B50) when given, else the
 * default English text (Phase B B28): "New notification" / "{n} new notifications".
 */
export function defaultBadgeLabel(
  displayValue: string | undefined,
  getLabel?: BadgeLabelGetter,
): string {
  if (getLabel) return getLabel(displayValue)
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
export function badgeAccessibleLabel(
  props: BadgeProps,
  getLabel?: BadgeLabelGetter,
): string | undefined {
  const { size = 'large', value, visible = true, label } = props
  const shown = size === 'small' || value != null
  if (!shown || !visible) return undefined
  return label ?? defaultBadgeLabel(badgeDisplayValue(props), getLabel)
}
