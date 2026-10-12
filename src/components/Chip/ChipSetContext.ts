'use client'

import { createContext, type RefObject } from 'react'

/**
 * Provided by `ChipSet`: its root element, so a removed chip can find the
 * neighbour to move focus to even when chips are wrapped in other elements.
 */
export const ChipSetContext = createContext<RefObject<HTMLDivElement | null> | null>(null)
