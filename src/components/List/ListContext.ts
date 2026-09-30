import { createContext } from 'react'

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
