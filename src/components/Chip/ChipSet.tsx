'use client'

import {
  forwardRef,
  useCallback,
  useMemo,
  useRef,
  type FocusEvent,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type SyntheticEvent,
} from 'react'
import { useIsoLayoutEffect } from '../../internal/useIsoLayoutEffect'
import clsx from 'clsx'
import {
  ChipSetContext,
  ChipSetDisabledContext,
  ChipSetSelectionContext,
  type ChipSetSelection,
  type ChipSetSelectionMode,
} from './ChipSetContext'
import { useControllableState } from '../../internal/useControllableState'
import chipStyles from './Chip.module.css'
import styles from './ChipSet.module.css'

export type { ChipSetSelectionMode }

interface ChipSetBaseProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
  /** The chips. They may be wrapped in other elements (e.g. a Tooltip or a
   * Menu). Give filter / input chips a `value` when the set has a
   * `selectionMode`. */
  children?: ReactNode
  /** Disable every chip in the set; a chip's own `disabled` still applies.
   * @default false */
  disabled?: boolean
}

/** No selection model — each chip manages its own `selected` state. */
export interface ChipSetNoSelectionProps extends ChipSetBaseProps {
  /** @default 'none' */
  selectionMode?: 'none'
  value?: never
  /** Unused without a selection model (kept for HTMLAttributes compatibility). */
  defaultValue?: HTMLAttributes<HTMLDivElement>['defaultValue']
  selectionRequired?: never
  /** Native `change` events bubbling from descendants. */
  onChange?: HTMLAttributes<HTMLDivElement>['onChange']
}

/** Single select ("selecting a single chip automatically deselects all other
 * chips in the set"): `role="radiogroup"`, chips are `role="radio"`. */
export interface ChipSetSingleSelectionProps extends ChipSetBaseProps {
  selectionMode: 'single'
  /** Controlled selected chip value (`null` = none). */
  value?: string | null
  /** Uncontrolled initial selected chip value. @default null */
  defaultValue?: string | null
  /** Fires with the triggering event and the next selected value. */
  onChange?: (event: SyntheticEvent, value: string | null) => void
  /** Keep one chip selected: re-activating the selected chip does nothing. @default false */
  selectionRequired?: boolean
}

/** Multi select: chips stay toggle buttons (`aria-pressed`) in a toolbar. */
export interface ChipSetMultipleSelectionProps extends ChipSetBaseProps {
  selectionMode: 'multiple'
  /** Controlled selected chip values. */
  value?: string[]
  /** Uncontrolled initial selected chip values. @default [] */
  defaultValue?: string[]
  /** Fires with the triggering event and the next selected values. */
  onChange?: (event: SyntheticEvent, value: string[]) => void
  /** Keep at least one chip selected. @default false */
  selectionRequired?: boolean
}

export type ChipSetProps =
  | ChipSetNoSelectionProps
  | ChipSetSingleSelectionProps
  | ChipSetMultipleSelectionProps

type SelectionValue = string | null | string[]

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
 *
 * Selection (B36): set `selectionMode` and give each filter / input chip a
 * `value`; the set owns the state via `value` / `defaultValue` /
 * `onChange(event, value)` (the ButtonGroup / List shape). `multiple` keeps
 * the toolbar of `aria-pressed` toggle chips. `single` follows the APG radio
 * group: `role="radiogroup"`, chips are `role="radio"` + `aria-checked`, the
 * selected chip is the Tab stop, and the arrow keys (Left / Right / Up /
 * Down, wrapping) and Home / End move focus AND select.
 */
export const ChipSet = forwardRef<HTMLDivElement, ChipSetProps>(function ChipSet(
  props,
  forwardedRef,
) {
  const {
    className,
    children,
    disabled = false,
    selectionMode = 'none',
    value,
    defaultValue,
    onChange,
    selectionRequired = false,
    onKeyDown,
    onFocus,
    onBlur,
    ...rest
  } = props as ChipSetBaseProps & {
    selectionMode?: ChipSetSelectionMode
    value?: SelectionValue
    defaultValue?: SelectionValue
    onChange?: (event: SyntheticEvent, value: SelectionValue) => void
    selectionRequired?: boolean
  }
  const rootRef = useRef<HTMLDivElement | null>(null)
  const activeRef = useRef<HTMLButtonElement | null>(null)
  const single = selectionMode === 'single'
  const multiple = selectionMode === 'multiple'

  const [current, setInternal] = useControllableState<SelectionValue>({
    value,
    defaultValue:
      selectionMode === 'none' || defaultValue === undefined
        ? multiple
          ? []
          : null
        : defaultValue,
    name: 'ChipSet',
    state: 'value',
  })

  const selection = useMemo<ChipSetSelection | null>(() => {
    if (selectionMode === 'none') return null
    return {
      mode: selectionMode,
      isSelected: (v) => (Array.isArray(current) ? current.includes(v) : current === v),
      toggle: (event, v) => {
        let next: SelectionValue
        if (multiple) {
          const list = Array.isArray(current) ? current : []
          if (list.includes(v)) {
            next = selectionRequired && list.length === 1 ? list : list.filter((x) => x !== v)
          } else {
            next = [...list, v]
          }
        } else if (current === v) {
          next = selectionRequired ? v : null
        } else {
          next = v
        }
        if (next !== current) {
          setInternal(next)
          onChange?.(event, next)
        }
        return Array.isArray(next) ? next.includes(v) : next === v
      },
    }
  }, [selectionMode, multiple, current, selectionRequired, onChange, setInternal])

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
    // Radio group: while focus is outside, the checked chip is the Tab stop.
    if (single && !root.contains(document.activeElement)) {
      const checked = enabled.find((b) => b.getAttribute('aria-checked') === 'true')
      if (checked) active = activeRef.current = checked
    }
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
  }, [single])

  // Initial tab stops + keep them valid when chips are added, removed,
  // disabled or re-enabled.
  useIsoLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    syncTabStops()
    const observer = new MutationObserver(syncTabStops)
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['disabled', 'aria-checked'],
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
      const vertical = single && (key === 'ArrowUp' || key === 'ArrowDown')
      if (
        key !== 'ArrowLeft' && key !== 'ArrowRight' && key !== 'Home' && key !== 'End' &&
        !vertical
      ) return

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
        const forwards = vertical ? key === 'ArrowDown' : (key === 'ArrowRight') !== isRtl
        const index = chips.indexOf(chip as HTMLElement)
        let neighbour = chips[index + (forwards ? 1 : -1)]
        // Radio group: arrows wrap and land on the chip itself (APG radio).
        if (single) {
          neighbour ??= chips[forwards ? 0 : chips.length - 1]
          target = primaryOf(neighbour)
        } else {
          if (!neighbour) return
          const trailing = trailingOf(neighbour)
          target = !forwards && trailing && !trailing.disabled ? trailing : primaryOf(neighbour)
        }
      }
      if (!target) return
      event.preventDefault()
      target.focus()
      // Radio semantics: moving focus also selects (a native click, so the
      // chip's own onClick / onChange fire as for a mouse click).
      if (single && target.getAttribute('aria-checked') === 'false') target.click()
    },
    [onKeyDown, getChips, single],
  )

  return (
    <ChipSetContext.Provider value={rootRef}>
      <ChipSetDisabledContext.Provider value={disabled}>
        <div
          ref={setRootRef}
          role={single ? 'radiogroup' : 'toolbar'}
          {...rest}
          onChange={
            selectionMode === 'none'
              ? (onChange as HTMLAttributes<HTMLDivElement>['onChange'])
              : undefined
          }
          data-selection-mode={selectionMode === 'none' ? undefined : selectionMode}
          className={clsx(styles.chipSet, className)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
        >
          <ChipSetSelectionContext.Provider value={selection}>
            {children}
          </ChipSetSelectionContext.Provider>
        </div>
      </ChipSetDisabledContext.Provider>
    </ChipSetContext.Provider>
  )
})
