import type { ReactNode } from 'react'
import { defaultBadgeLabel, type BadgeLabelGetter } from './badgeLabel'

/** Whether a navigation item's `badge` prop renders a badge at all. */
export function hasNavBadge(badge: ReactNode): boolean {
  return badge != null && badge !== false
}

/**
 * Default accessible label for a navigation item's badge (m3.material.io
 * badges/accessibility: the badge is read AFTER the destination; a counting
 * badge reads its number, a non-counting one reads "New notification").
 * Same default English wording as the Badge ruling (Phase B B28). Items take a
 * `badgeLabel` override for i18n (Phase B B1); `getLabel` is LocaleProvider's
 * `labels.Badge.getLabel` (B50).
 */
export function defaultNavBadgeLabel(
  badge: ReactNode,
  getLabel?: BadgeLabelGetter,
): string | undefined {
  if (!hasNavBadge(badge)) return undefined
  const text = typeof badge === 'string' || typeof badge === 'number' ? String(badge) : undefined
  return defaultBadgeLabel(text, getLabel)
}
