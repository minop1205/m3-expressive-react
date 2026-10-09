'use client'

import { createContext, type SyntheticEvent } from 'react'

/**
 * Where a `ListItem` sits (internal — docs/decisions/phase-b-api.md B21).
 *
 * - `'list'`  — a direct child position of `<List>` (`<ul>`): the item renders
 *   its own `<li>`.
 * - `'swipe'` — inside a `SwipeToDismiss` that is itself in a List: the
 *   SwipeToDismiss root is the `<li>`, so the ListItem renders a `<div>`.
 * - `null`    — outside any List (unchanged: `<li>`).
 */
export type ListParent = 'list' | 'swipe' | null

export const ListParentContext = createContext<ListParent>(null)

export type ListSelectionMode = 'none' | 'single' | 'multiple'

/**
 * Provided by `List` to its items (internal): the selection model (B17) and
 * the roving tab stop shared by the list's focusable rows (LS8 / #229).
 */
export interface ListNav {
  selectionMode: ListSelectionMode
  isSelected: (value: string) => boolean
  toggle: (event: SyntheticEvent, value: string) => void
  /** `data-list-nav` id of the row that is the Tab stop (null = not resolved yet). */
  tabStop: string | null
}

export const ListNavContext = createContext<ListNav | null>(null)
