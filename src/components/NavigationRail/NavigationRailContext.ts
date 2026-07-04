import { createContext } from 'react'

export type NavigationRailVariant = 'collapsed' | 'expanded'
export type NavigationRailArrangement = 'top' | 'center' | 'bottom'

export interface RailContextValue {
  value: string
  onChange: (value: string) => void
}

/** Shared by `NavigationRail` and `NavigationRailItem`. Null when an item is
 *  used standalone (then it falls back to its own `selected` / `onClick`). */
export const RailContext = createContext<RailContextValue | null>(null)
