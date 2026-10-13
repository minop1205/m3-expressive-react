'use client'

import {
  forwardRef,
  useCallback,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type PointerEvent,
  type SyntheticEvent,
} from 'react'
import clsx from 'clsx'
import { Ripple } from '../../primitives/Ripple/Ripple'
import { FocusRing } from '../../primitives/FocusRing/FocusRing'
import { assignRef } from '../../internal/assignRef'
import { devWarnOnce } from '../../internal/devWarning'
import { useControllableState } from '../../internal/useControllableState'
import styles from './DragHandle.module.css'

/** Which side of the handle the pane that `value` sizes sits on. */
export type DragHandlePaneSide = 'start' | 'end'

export interface DragHandleProps
  extends Omit<
    HTMLAttributes<HTMLDivElement>,
    'onChange' | 'defaultValue' | 'role' | 'onDragStart' | 'onDragEnd'
  > {
  /**
   * Controlled size of the controlled pane, in px (the separator's
   * `aria-valuenow`).
   */
  value?: number
  /** Uncontrolled initial size. @default min */
  defaultValue?: number
  /**
   * Fires while dragging and on each key press, with the triggering event and
   * the new (clamped) size. Not fired when the size would not change.
   */
  onChange?: (event: SyntheticEvent, value: number) => void
  /** Fires when a pointer drag starts (after the first movement), with the size at that point. */
  onDragStart?: (event: PointerEvent<HTMLDivElement>, value: number) => void
  /** Fires when a pointer drag ends (release or cancel), with the final size — e.g. to persist it. */
  onDragEnd?: (event: PointerEvent<HTMLDivElement>, value: number) => void
  /** Smallest size (`aria-valuemin`). @default 0 */
  min?: number
  /** Largest size (`aria-valuemax`). @default 100 */
  max?: number
  /** Size change per arrow key. @default 1 */
  step?: number
  /** Size change per Shift + arrow and Page Up / Page Down. @default 10 */
  shiftStep?: number
  /**
   * Which side of the handle the controlled pane is on (logical, so it
   * mirrors in RTL). `'start'`: dragging toward the inline end grows it (the
   * list of a list-detail layout); `'end'`: dragging toward the inline start
   * grows it.
   * @default 'start'
   */
  paneSide?: DragHandlePaneSide
  /** Human-readable size for assistive tech (`aria-valuetext`), e.g. `(v) => \`${v} pixels\``. */
  getAriaValueText?: (value: number) => string
  /** Disables dragging and keyboard resizing and removes the handle from the tab order. @default false */
  disabled?: boolean
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/**
 * Material Design 3 drag handle for resizing panes (Compose
 * `VerticalDragHandle`, DragHandle.kt:73).
 *
 * A vertical capsule placed between two side-by-side panes; dragging it
 * horizontally (or pressing the arrow keys) changes the size of the pane on
 * `paneSide`. The host is a focusable WAI-ARIA APG **window splitter**:
 * `role="separator"`, `aria-orientation="vertical"`, `aria-valuenow` /
 * `aria-valuemin` / `aria-valuemax` = `value` / `min` / `max`. Give it an
 * accessible name that matches the controlled pane (`aria-label` /
 * `aria-labelledby`) and point `aria-controls` at that pane.
 *
 * Keys: ArrowLeft / ArrowRight move the handle by `step` (`shiftStep` with
 * Shift), Page Up / Page Down by `shiftStep`, Home / End to `min` / `max`.
 * ArrowUp / ArrowDown also work (up = grow), as for other range widgets.
 *
 * Size and state follow `VerticalDragHandleDefaults`: 4×48dp `outline`
 * capsule at rest; 12×52dp `on-surface` with 12dp corners while pressed or
 * dragged. The host is 24dp wide (`DragHandleTokens.ContainerWidth`) with a
 * 48dp touch target. The handle only reports sizes; the layout (pane widths)
 * is the app's.
 */
export const DragHandle = forwardRef<HTMLDivElement, DragHandleProps>(function DragHandle(
  {
    value: controlledValue,
    defaultValue,
    onChange,
    onDragStart,
    onDragEnd,
    min = 0,
    max = 100,
    step = 1,
    shiftStep = 10,
    paneSide = 'start',
    getAriaValueText,
    disabled = false,
    className,
    onKeyDown,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onLostPointerCapture,
    tabIndex,
    ...rest
  },
  forwardedRef,
) {
  const hostRef = useRef<HTMLDivElement>(null)
  const setRefs = useCallback(
    (el: HTMLDivElement | null) => {
      hostRef.current = el
      assignRef(forwardedRef, el)
    },
    [forwardedRef],
  )

  const [rawValue, setInternalValue, isControlled] = useControllableState({
    value: controlledValue,
    defaultValue: defaultValue ?? min,
    name: 'DragHandle',
    state: 'value',
  })
  const value = clamp(rawValue, min, max)

  if (
    process.env.NODE_ENV !== 'production' &&
    rest['aria-label'] == null &&
    rest['aria-labelledby'] == null
  ) {
    devWarnOnce(
      'DragHandle needs an accessible name: pass `aria-label` or `aria-labelledby` ' +
        '(the name of the pane it resizes).',
    )
  }

  const [pressed, setPressed] = useState(false)
  const [dragged, setDragged] = useState(false)
  // The pointer gesture in progress: where it started and the size then.
  const gesture = useRef<{
    pointerId: number
    startX: number
    startValue: number
    dragged: boolean
    last: number
  } | null>(null)

  // Clamp, store (uncontrolled) and report a new size; returns the clamped
  // size. `prev` is the size the change starts from (during a drag, the last
  // reported one — several moves can land before a re-render).
  const commit = (event: SyntheticEvent, next: number, prev: number) => {
    const clamped = clamp(next, min, max)
    if (clamped === prev) return clamped
    if (!isControlled) setInternalValue(clamped)
    onChange?.(event, clamped)
    return clamped
  }

  // Size change per px of screen-rightward movement: +1 when moving right
  // grows the pane (start pane in LTR, end pane in RTL).
  const rightwardSign = (el: HTMLElement) => {
    const rtl = window.getComputedStyle(el).direction === 'rtl'
    const startIsLeft = rtl ? -1 : 1
    return paneSide === 'start' ? startIsLeft : -startIsLeft
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event)
    if (event.defaultPrevented || disabled) return
    const delta = event.shiftKey ? shiftStep : step
    const rightSign = rightwardSign(event.currentTarget)
    let next: number | null = null
    switch (event.key) {
      case 'ArrowRight':
        next = value + rightSign * delta
        break
      case 'ArrowLeft':
        next = value - rightSign * delta
        break
      case 'ArrowUp':
        next = value + delta
        break
      case 'ArrowDown':
        next = value - delta
        break
      case 'PageUp':
        next = value + shiftStep
        break
      case 'PageDown':
        next = value - shiftStep
        break
      case 'Home':
        next = min
        break
      case 'End':
        next = max
        break
      default:
        return
    }
    event.preventDefault()
    commit(event, next, value)
  }

  const endGesture = (event: PointerEvent<HTMLDivElement>) => {
    const current = gesture.current
    if (!current || current.pointerId !== event.pointerId) return
    gesture.current = null
    setPressed(false)
    setDragged(false)
    if (current.dragged) onDragEnd?.(event, current.last)
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    onPointerDown?.(event)
    if (event.defaultPrevented || disabled || gesture.current) return
    if (event.pointerType === 'mouse' && event.button !== 0) return
    event.currentTarget.setPointerCapture?.(event.pointerId)
    gesture.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startValue: value,
      dragged: false,
      last: value,
    }
    setPressed(true)
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    onPointerMove?.(event)
    const current = gesture.current
    if (!current || current.pointerId !== event.pointerId) return
    const dx = event.clientX - current.startX
    if (!current.dragged) {
      if (dx === 0) return
      current.dragged = true
      setDragged(true)
      onDragStart?.(event, current.startValue)
    }
    current.last = commit(
      event,
      current.startValue + rightwardSign(event.currentTarget) * dx,
      current.last,
    )
  }

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    onPointerUp?.(event)
    endGesture(event)
  }

  const handlePointerCancel = (event: PointerEvent<HTMLDivElement>) => {
    onPointerCancel?.(event)
    endGesture(event)
  }

  const handleLostPointerCapture = (event: PointerEvent<HTMLDivElement>) => {
    onLostPointerCapture?.(event)
    endGesture(event)
  }

  const state = dragged ? 'dragged' : pressed ? 'pressed' : undefined

  return (
    <div
      {...rest}
      ref={setRefs}
      role="separator"
      aria-orientation="vertical"
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuetext={getAriaValueText?.(value)}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? undefined : (tabIndex ?? 0)}
      data-state={state}
      data-disabled={disabled || undefined}
      className={clsx(styles.dragHandle, className)}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onLostPointerCapture={handleLostPointerCapture}
    >
      <span className={styles.handle} aria-hidden="true">
        <Ripple control={hostRef} disabled={disabled} dragged={dragged} />
      </span>
      {!disabled && <FocusRing className={styles.focusRing} />}
    </div>
  )
})
