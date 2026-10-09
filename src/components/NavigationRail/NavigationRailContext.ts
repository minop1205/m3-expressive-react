'use client'

import { createContext, type MouseEvent } from 'react'

export type NavigationRailVariant = 'collapsed' | 'expanded'
export type NavigationRailArrangement = 'top' | 'center' | 'bottom'

export interface RailContextValue {
  value: string
  onChange: (event: MouseEvent<HTMLButtonElement>, value: string) => void
  /**
   * Items report the natural width of their expanded label (+ badge) so the
   * rail can size its expanded width to the widest one (`null` on unmount).
   */
  reportLabelWidth?: (item: object, width: number | null) => void
}

/** Shared by `NavigationRail` and `NavigationRailItem`. Null when an item is
 *  used standalone (then it falls back to its own `selected` / `onClick`). */
export const RailContext = createContext<RailContextValue | null>(null)
