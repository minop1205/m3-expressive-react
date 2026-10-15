'use client'

import { defaultBadgeLabel } from '../../internal/badgeLabel'
import { useLocaleLabels } from '../../internal/locale'

/**
 * The default announced text of a Badge — LocaleProvider
 * `labels.Badge.getLabel` (Phase B B50), else the English B28 wording. The
 * one client part of the otherwise server-safe Badge (#409): it is the only
 * piece that reads the locale context, and it takes only serializable props.
 */
export function BadgeLabelText({ count }: { count: string | undefined }) {
  const { getLabel } = useLocaleLabels('Badge')
  return <>{defaultBadgeLabel(count, getLabel)}</>
}
