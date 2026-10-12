'use client'

import {
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type SyntheticEvent,
} from 'react'
import clsx from 'clsx'
import styles from './ButtonGroup.module.css'
import { usePressWidth } from './usePressWidth'
import {
  ButtonGroupSelectionContext,
  type ButtonGroupSelection,
  type ButtonGroupSelectionMode,
} from './ButtonGroupContext'

export type ButtonGroupVariant = 'standard' | 'connected'
export type ButtonGroupSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type ButtonGroupOrientation = 'horizontal' | 'vertical'
export type { ButtonGroupSelectionMode }

interface ButtonGroupBaseProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
  /** `standard` spaces buttons and widens the pressed one; `connected` joins
   * them into a single shape with small inner corners. @default 'standard' */
  variant?: ButtonGroupVariant
  /** Match the child button size: sets the between-space (standard) or the
   * inner corners and 48dp minimum width (connected). @default 'sm' */
  size?: ButtonGroupSize
  /** Layout direction. @default 'horizontal' */
  orientation?: ButtonGroupOrientation
  /** `Button` / `IconButton` children (give them a `value` when the group has
   * a `selectionMode`). */
  children?: ReactNode
}

/** No selection model — the buttons are plain actions (or self-managed toggles). */
export interface ButtonGroupNoSelectionProps extends ButtonGroupBaseProps {
  /** @default 'none' */
  selectionMode?: 'none'
  value?: never
  /** Unused without a selection model (kept for HTMLAttributes compatibility). */
  defaultValue?: HTMLAttributes<HTMLDivElement>['defaultValue']
  selectionRequired?: never
  /** Native `change` events bubbling from descendants. */
  onChange?: HTMLAttributes<HTMLDivElement>['onChange']
}

/** Single select: `role="radiogroup"`, items are `role="radio"` with a roving
 * tab stop and arrow-key selection. */
export interface ButtonGroupSingleSelectionProps extends ButtonGroupBaseProps {
  selectionMode: 'single'
  /** Controlled selected item value (`null` = none). */
  value?: string | null
  /** Uncontrolled initial selected item value. @default null */
  defaultValue?: string | null
  /** Fires with the triggering event and the next selected value. */
  onChange?: (event: SyntheticEvent, value: string | null) => void
  /** Keep one item selected: re-activating the selected item does nothing. @default false */
  selectionRequired?: boolean
}

/** Multi select: items are toggle buttons (`aria-pressed`). */
export interface ButtonGroupMultipleSelectionProps extends ButtonGroupBaseProps {
  selectionMode: 'multiple'
  /** Controlled selected item values. */
  value?: string[]
  /** Uncontrolled initial selected item values. @default [] */
  defaultValue?: string[]
  /** Fires with the triggering event and the next selected values. */
  onChange?: (event: SyntheticEvent, value: string[]) => void
  /** Keep at least one item selected. @default false */
  selectionRequired?: boolean
}

export type ButtonGroupProps =
  | ButtonGroupNoSelectionProps
  | ButtonGroupSingleSelectionProps
  | ButtonGroupMultipleSelectionProps

type SelectionValue = string | null | string[]

/** Items = direct `<button>` children, or buttons one wrapper deep (e.g. a Tooltip span). */
function getItems(root: HTMLElement): HTMLButtonElement[] {
  return Array.from(
    root.querySelectorAll<HTMLButtonElement>(':scope > button, :scope > :not(button) > button'),
  )
}

/**
 * Material Design 3 (Expressive) Button group — an invisible container that adds
 * padding between buttons and modifies their shape.
 *
 * `standard` spaces buttons by the size's between-space (18 / 12 / 8 / 8 / 8dp
 * for xs–xl); pressing a button widens it by 15% and narrows its neighbours
 * (Compose `animateWidth`). `connected` joins buttons with a 2dp gap, keeps the
 * outer corners fully round, gives the inner corners a per-size radius that
 * tightens while pressed, and fully rounds a selected (toggle) button. Wraps
 * `Button` / `IconButton` children — it has no color of its own.
 *
 * Selection (Expressive "single-select / multi-select / selection-required"):
 * set `selectionMode` and give each child a `value`; the group owns the state
 * via `value` / `defaultValue` / `onChange(event, value)`. `single` exposes a
 * radiogroup (one Tab stop, arrow keys move and select); `multiple` exposes
 * toggle buttons. A connected single-select group replaces the baseline
 * segmented button.
 *
 * Keyboard: arrow keys move focus between the buttons (Left / Right when
 * horizontal — mirrored in RTL — Up / Down when vertical; a radiogroup accepts
 * both), Home / End jump to the ends, disabled buttons are skipped.
 */
export const ButtonGroup = forwardRef<HTMLDivElement, ButtonGroupProps>(
  function ButtonGroup(props, ref) {
    const {
      variant = 'standard',
      size = 'sm',
      orientation = 'horizontal',
      selectionMode = 'none',
      value,
      defaultValue,
      onChange,
      selectionRequired = false,
      className,
      children,
      onKeyDown,
      ...rest
    } = props as ButtonGroupBaseProps & {
      selectionMode?: ButtonGroupSelectionMode
      value?: SelectionValue
      defaultValue?: SelectionValue
      onChange?: (event: SyntheticEvent, value: SelectionValue) => void
      selectionRequired?: boolean
    }

    const rootRef = useRef<HTMLDivElement>(null)
    useImperativeHandle(ref, () => rootRef.current as HTMLDivElement)
    usePressWidth(rootRef, variant === 'standard' && orientation === 'horizontal')

    const multiple = selectionMode === 'multiple'
    const [internal, setInternal] = useState<SelectionValue>(() => {
      if (selectionMode === 'none' || defaultValue === undefined) return multiple ? [] : null
      return defaultValue
    })
    const current: SelectionValue = value !== undefined ? value : internal

    // single: the selected (enabled) item holds the tab stop, else the first
    // enabled item. Resolved from the DOM so wrapped children work too.
    const [tabStop, setTabStop] = useState<string | null>(
      typeof current === 'string' ? current : null,
    )
    useLayoutEffect(() => {
      if (selectionMode !== 'single' || !rootRef.current) return
      const items = getItems(rootRef.current).filter((el) => !el.disabled)
      const stop = items.find((el) => el.value === current) ?? items[0]
      setTabStop(stop ? stop.value : null)
    })

    const selection = useMemo<ButtonGroupSelection | null>(() => {
      if (selectionMode === 'none') return null
      const selected = (v: string) =>
        Array.isArray(current) ? current.includes(v) : current === v
      return {
        mode: selectionMode,
        tabStop,
        isSelected: selected,
        toggle: (event, v) => {
          let next: SelectionValue
          if (Array.isArray(current) || multiple) {
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
            if (value === undefined) setInternal(next)
            onChange?.(event, next)
          }
          return Array.isArray(next) ? next.includes(v) : next === v
        },
      }
    }, [selectionMode, multiple, current, tabStop, selectionRequired, value, onChange])

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event)
      if (event.defaultPrevented || !rootRef.current) return
      const items = getItems(rootRef.current)
      const index = items.indexOf(event.target as HTMLButtonElement)
      if (index < 0) return

      const rtl = getComputedStyle(rootRef.current).direction === 'rtl'
      const horizontalKeys = rtl ? ['ArrowLeft', 'ArrowRight'] : ['ArrowRight', 'ArrowLeft']
      const [nextKeys, prevKeys] =
        selectionMode === 'single'
          ? [
              ['ArrowDown', horizontalKeys[0]],
              ['ArrowUp', horizontalKeys[1]],
            ]
          : orientation === 'vertical'
            ? [['ArrowDown'], ['ArrowUp']]
            : [[horizontalKeys[0]], [horizontalKeys[1]]]

      const enabled = (i: number) => !items[i].disabled
      let target = -1
      if (nextKeys.includes(event.key) || prevKeys.includes(event.key)) {
        const step = nextKeys.includes(event.key) ? 1 : -1
        for (let n = 1; n <= items.length; n++) {
          const i = (index + step * n + items.length) % items.length
          if (enabled(i)) {
            target = i
            break
          }
        }
      } else if (event.key === 'Home') {
        target = items.findIndex((_, i) => enabled(i))
      } else if (event.key === 'End') {
        for (let i = items.length - 1; i >= 0; i--) {
          if (enabled(i)) {
            target = i
            break
          }
        }
      } else {
        return
      }
      event.preventDefault()
      if (target < 0 || target === index) return
      const next = items[target]
      next.focus()
      // Radio semantics: moving focus also selects (a native click, so the
      // item's own onClick / onChange fire as they would for a mouse click).
      if (selectionMode === 'single' && next.getAttribute('aria-checked') !== 'true') {
        next.click()
      }
    }

    return (
      <div
        ref={rootRef}
        role={selectionMode === 'single' ? 'radiogroup' : 'group'}
        {...rest}
        onChange={
          selectionMode === 'none'
            ? (onChange as HTMLAttributes<HTMLDivElement>['onChange'])
            : undefined
        }
        onKeyDown={handleKeyDown}
        data-variant={variant}
        data-size={size}
        data-orientation={orientation}
        data-selection-mode={selectionMode === 'none' ? undefined : selectionMode}
        className={clsx(styles.group, className)}
      >
        <ButtonGroupSelectionContext.Provider value={selection}>
          {children}
        </ButtonGroupSelectionContext.Provider>
      </div>
    )
  },
)
