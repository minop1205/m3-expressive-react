'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { devWarnOnce } from './devWarning'

export interface UseControllableStateOptions<T> {
  /** The controlled prop. `undefined` on the first render = uncontrolled. */
  value: T | undefined
  /** The uncontrolled initial value (only the first render's value counts). */
  defaultValue: T
  /** Component name for the dev warnings, e.g. `'Switch'`. */
  name: string
  /** Name of the controlled state for the dev warnings, e.g. `'selected'`. */
  state: string
  /** Called with every value passed to `setValue`, controlled or not. */
  onChange?: (value: T) => void
}

/** Structural equality good enough for default props (arrays, dates, plain objects). */
function sameDefault(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false
  try {
    return JSON.stringify(a) === JSON.stringify(b)
  } catch {
    return false
  }
}

/**
 * Controlled / uncontrolled state, like MUI `useControlled` (#413).
 *
 * Controlledness is decided on the first render (`value !== undefined`) and
 * kept for the component's lifetime (a controlled value that later turns
 * `undefined` keeps showing its last value). In development it warns (once per
 * message) when `value` later switches between defined and `undefined`, or
 * when `defaultValue` changes while uncontrolled.
 *
 * Returns `[current, setValue, isControlled]`. `setValue` only updates the
 * stored value while uncontrolled; components keep calling their own
 * `onChange` handlers.
 */
export function useControllableState<T>({
  value,
  defaultValue,
  name,
  state,
  onChange,
}: UseControllableStateOptions<T>): [T, (next: T) => void, boolean] {
  const { current: isControlled } = useRef(value !== undefined)
  const [internal, setInternal] = useState<T>(defaultValue)
  // A controlled component whose prop later turns `undefined` (a misuse the
  // warning below reports) keeps its last controlled value instead of
  // rendering `undefined`.
  const lastControlled = useRef(value)
  if (value !== undefined) lastControlled.current = value
  const current = isControlled ? (lastControlled.current as T) : internal

  const nowControlled = value !== undefined
  useEffect(() => {
    if (isControlled === nowControlled) return
    devWarnOnce(
      `A component is changing the ${isControlled ? '' : 'un'}controlled ${state} state of ` +
        `${name} to be ${isControlled ? 'un' : ''}controlled. Elements should not switch ` +
        `from uncontrolled to controlled (or vice versa). Decide between using a controlled ` +
        `or uncontrolled ${name} element for the lifetime of the component. The nature of ` +
        `the state is determined during the first render. It's considered controlled if ` +
        `the value is not \`undefined\`.`,
    )
  }, [isControlled, nowControlled, name, state])

  const { current: initialDefault } = useRef(defaultValue)
  const defaultChanged = !isControlled && !sameDefault(initialDefault, defaultValue)
  useEffect(() => {
    if (!defaultChanged) return
    devWarnOnce(
      `A component is changing the default ${state} state of an uncontrolled ${name} ` +
        `after being initialized. To suppress this warning opt to use a controlled ${name}.`,
    )
  }, [defaultChanged, name, state])

  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const setValue = useCallback(
    (next: T) => {
      if (!isControlled) setInternal(next)
      onChangeRef.current?.(next)
    },
    [isControlled],
  )

  return [current, setValue, isControlled]
}
