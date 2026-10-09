'use client'

import {
  createContext,
  useContext,
  useState,
  type MouseEvent,
  type SyntheticEvent,
} from 'react'

export type ButtonGroupSelectionMode = 'none' | 'single' | 'multiple'

/** Selection state a `ButtonGroup` with `selectionMode` shares with its items. */
export interface ButtonGroupSelection {
  mode: 'single' | 'multiple'
  isSelected: (value: string) => boolean
  /** Toggle `value` (subject to `selectionRequired`); returns its next state. */
  toggle: (event: SyntheticEvent, value: string) => boolean
  /** single: the value of the item that holds the roving tab stop. */
  tabStop: string | null
}

export const ButtonGroupSelectionContext = createContext<ButtonGroupSelection | null>(null)

interface ToggleOptions {
  value: string | number | readonly string[] | undefined
  toggle: boolean
  selected: boolean | undefined
  defaultSelected: boolean
  onChange?: (event: MouseEvent<HTMLButtonElement>, selected: boolean) => void
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void
  tabIndex: number | undefined
}

/**
 * Toggle state shared by `Button` and `IconButton`. Standalone it is the usual
 * controlled / uncontrolled `toggle` + `selected`. Inside a `ButtonGroup` with a
 * `selectionMode`, an item with a `value` is selected by the group instead:
 * single → `role="radio"` + `aria-checked` with a roving tab stop, multiple →
 * `aria-pressed` (Phase B B13).
 */
export function useButtonToggle({
  value,
  toggle,
  selected,
  defaultSelected,
  onChange,
  onClick,
  tabIndex,
}: ToggleOptions) {
  const group = useContext(ButtonGroupSelectionContext)
  const [internalSelected, setInternalSelected] = useState(defaultSelected)
  const itemValue = value == null ? undefined : String(value)
  const managed = group !== null && itemValue !== undefined
  const isToggle = toggle || managed
  const isControlled = selected !== undefined

  let isSelected = false
  if (managed) isSelected = group.isSelected(itemValue)
  else if (toggle) isSelected = isControlled ? selected : internalSelected

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (managed) {
      const next = group.toggle(event, itemValue)
      if (next !== isSelected) onChange?.(event, next)
    } else if (toggle) {
      const next = !isSelected
      if (!isControlled) setInternalSelected(next)
      onChange?.(event, next)
    }
    onClick?.(event)
  }

  const a11y =
    managed && group.mode === 'single'
      ? {
          role: 'radio',
          'aria-checked': isSelected,
          'aria-pressed': undefined,
          tabIndex: tabIndex ?? (group.tabStop === itemValue ? 0 : -1),
        }
      : { 'aria-pressed': isToggle ? isSelected : undefined, tabIndex }

  return { isToggle, isSelected, handleClick, a11y }
}
