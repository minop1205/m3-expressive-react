'use client'

import { createContext, type RefObject, type SyntheticEvent } from 'react'

/**
 * Provided by `ChipSet`: its root element, so a removed chip can find the
 * neighbour to move focus to even when chips are wrapped in other elements.
 */
export const ChipSetContext = createContext<RefObject<HTMLDivElement | null> | null>(null)

/** Group-level `disabled` from a wrapping `ChipSet` (#421). */
export const ChipSetDisabledContext = createContext(false)

export type ChipSetSelectionMode = 'none' | 'single' | 'multiple'

/** Selection state a `ChipSet` with a `selectionMode` shares with its chips (B36). */
export interface ChipSetSelection {
  mode: 'single' | 'multiple'
  isSelected: (value: string) => boolean
  /** Toggle `value` (subject to `selectionRequired`); returns its next state. */
  toggle: (event: SyntheticEvent, value: string) => boolean
}

export const ChipSetSelectionContext = createContext<ChipSetSelection | null>(null)
