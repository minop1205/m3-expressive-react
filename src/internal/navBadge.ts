import type { ReactNode } from 'react'

/** Whether a navigation item's `badge` prop renders a badge at all. */
export function hasNavBadge(badge: ReactNode): boolean {
  return badge != null && badge !== false
}

/**
 * Default accessible label for a navigation item's badge (m3.material.io
 * badges/accessibility: the badge is read AFTER the destination; a counting
 * badge reads its number, a non-counting one reads "New notification").
 * Same default English wording as the Badge ruling (Phase B B28). Items take a
 * `badgeLabel` override for i18n (Phase B B1).
 */
export function defaultNavBadgeLabel(badge: ReactNode): string | undefined {
  if (!hasNavBadge(badge)) return undefined
  if (typeof badge === 'string' || typeof badge === 'number') {
    const text = String(badge)
    return text === '1' ? '1 new notification' : `${text} new notifications`
  }
  return 'New notification'
}
