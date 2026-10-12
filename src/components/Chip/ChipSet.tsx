'use client'

import {
  forwardRef,
  useCallback,
  useLayoutEffect,
  useRef,
  type FocusEvent,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import clsx from 'clsx'
import { ChipSetContext } from './ChipSetContext'
import chipStyles from './Chip.module.css'
import styles from './ChipSet.module.css'

export interface ChipSetProps extends HTMLAttributes<HTMLDivElement> {
  /** The chips. They may be wrapped in other elements (e.g. a Tooltip). */
  children?: ReactNode
}

function primaryOf(chip: Element): HTMLButtonElement | null {
  return chip.querySelector<HTMLButtonElement>(`.${chipStyles.action}`)
}

function trailingOf(chip: Element): HTMLButtonElement | null {
  return chip.querySelector<HTMLButtonElement>(`.${chipStyles.trailingAction}`)
}

/**
 * Material Design 3 chip set — lays chips out in a wrapping row (8dp apart)
 * and makes the whole set ONE Tab stop (m3 keyboard table: "Tab moves focus
 * to the chip group; Arrows move focus between chips").
 *
 * - Roving tabindex: only the last-focused chip's primary action is tabbable.
 * - ArrowLeft / ArrowRight (mirrored in RTL) move between chips; inside a
 *   removable chip they first step between its primary and remove actions.
 *   Moving backwards into a removable chip lands on its remove action.
 * - Home / End jump to the first / last chip. Disabled chips are skipped.
 * - When a focused chip is removed, focus moves to its neighbour.
 *
 * Renders `role="toolbar"` (APG toolbar pattern, material-web `md-chip-set`)
 * so chips keep their button semantics and `aria-pressed`. Give it an
 * accessible name with `aria-label` / `aria-labelledby`.
 */
export const ChipSet = forwardRef<HTMLDivElement, ChipSetProps>(function ChipSet(
  { className, children, onKeyDown, onFocus, onBlur, ...rest },
  forwardedRef,
) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const activeRef = useRef<HTMLButtonElement | null>(null)

  const setRootRef = useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node
      if (typeof forwardedRef === 'function') forwardedRef(node)
      else if (forwardedRef) forwardedRef.current = node
    },
    [forwardedRef],
  )

  const getChips = useCallback((): HTMLElement[] => {
    const root = rootRef.current
    if (!root) return []
    return Array.from(root.querySelectorAll<HTMLElement>(`.${chipStyles.chip}`)).filter(
      (chip) => {
        const primary = primaryOf(chip)
        return !!primary && !primary.disabled
      },
    )
  }, [])

  /** Make exactly one enabled primary action tabbable. */
  const syncTabStops = useCallback(() => {
    const root = rootRef.current
    if (!root) return
    const primaries = Array.from(
      root.querySelectorAll<HTMLButtonElement>(`.${chipStyles.action}`),
    )
    const enabled = primaries.filter((b) => !b.disabled)
    let active = activeRef.current
    if (!active || !enabled.includes(active)) {
      active = enabled[0] ?? null
      activeRef.current = active
    }
    for (const primary of primaries) {
      const chip = primary.closest(`.${chipStyles.chip}`)
      // While a chip's remove action holds focus, Chip keeps its primary out of
      // the Tab order so Shift+Tab leaves the set — leave that alone.
      const trailingFocused = !!chip && chip.contains(document.activeElement) &&
        document.activeElement !== primary
      primary.tabIndex = primary === active && !trailingFocused ? 0 : -1
    }
  }, [])

  // Initial tab stops + keep them valid when chips are added, removed,
  // disabled or re-enabled.
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    syncTabStops()
    const observer = new MutationObserver(syncTabStops)
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['disabled'],
    })
    return () => observer.disconnect()
  }, [syncTabStops])

  const handleFocus = useCallback(
    (event: FocusEvent<HTMLDivElement>) => {
      onFocus?.(event)
      const chip = (event.target as HTMLElement).closest(`.${chipStyles.chip}`)
      const primary = chip && primaryOf(chip)
      if (primary && !primary.disabled) {
        activeRef.current = primary
        syncTabStops()
      }
    },
    [onFocus, syncTabStops],
  )

  const handleBlur = useCallback(
    (event: FocusEvent<HTMLDivElement>) => {
      onBlur?.(event)
      const next = event.relatedTarget as Node | null
      if (!next || !event.currentTarget.contains(next)) syncTabStops()
    },
    [onBlur, syncTabStops],
  )

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event)
      if (event.defaultPrevented) return
      const { key } = event
      if (key !== 'ArrowLeft' && key !== 'ArrowRight' && key !== 'Home' && key !== 'End') return

      const chip = (event.target as HTMLElement).closest(`.${chipStyles.chip}`)
      if (!chip || !event.currentTarget.contains(chip)) return
      const chips = getChips()
      if (chips.length === 0) return

      let target: HTMLButtonElement | null = null
      if (key === 'Home') {
        target = primaryOf(chips[0])
      } else if (key === 'End') {
        target = primaryOf(chips[chips.length - 1])
      } else {
        const isRtl = getComputedStyle(event.currentTarget).direction === 'rtl'
        const forwards = (key === 'ArrowRight') !== isRtl
        const index = chips.indexOf(chip as HTMLElement)
        const neighbour = chips[index + (forwards ? 1 : -1)]
        if (!neighbour) return
        const trailing = trailingOf(neighbour)
        target = !forwards && trailing && !trailing.disabled ? trailing : primaryOf(neighbour)
      }
      if (!target) return
      event.preventDefault()
      target.focus()
    },
    [onKeyDown, getChips],
  )

  return (
    <ChipSetContext.Provider value={rootRef}>
      <div
        ref={setRootRef}
        role="toolbar"
        {...rest}
        className={clsx(styles.chipSet, className)}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
      >
        {children}
      </div>
    </ChipSetContext.Provider>
  )
})
