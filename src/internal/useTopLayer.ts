'use client'

import { useRef, type RefObject } from 'react'
import { useIsoLayoutEffect } from './useIsoLayoutEffect'
import { hideFromTopLayer, isPopoverOpen, showInTopLayer } from './usePopupPosition'

/**
 * Top-layer stacking for the modal surfaces (Phase B ruling B45).
 *
 * The browser top layer paints its elements in the order they were shown, so
 * "shown later = on top" mirrors Compose, where every dialog / sheet is a new
 * window above the existing popups: a dialog opened from a (top-layer) Menu
 * item paints above the menu, and a Menu opened inside a dialog above the
 * dialog. Elements keep their DOM position (design tokens still inherit);
 * without Popover API support nothing changes and the `--md-sys-z-*` scale
 * applies as before.
 *
 * Internal — no public API.
 */

/** Layers kept above every modal (the Snackbar host): re-shown after a modal enters. */
const aboveModals = new Set<HTMLElement>()

/** Show `el` as the topmost top-layer element (re-showing it when it is already there). */
export function raiseInTopLayer(el: HTMLElement) {
  hideFromTopLayer(el)
  showInTopLayer(el)
}

/** Parse a computed `<time>` list (`0.3s, 150ms`) to milliseconds. */
function parseTimes(list: string): number[] {
  return list.split(',').map((item) => {
    const value = item.trim()
    const n = parseFloat(value)
    if (!Number.isFinite(n)) return 0
    return value.endsWith('ms') ? n : n * 1000
  })
}

/**
 * When `el`'s `visibility` transition ends, ms — the delayed-visibility exit
 * pattern (#433 / #458: `transition: visibility 0s linear <exit length>` on the
 * closed state). 0 without one (e.g. `transition: none` under reduced motion).
 */
export function visibilityExitTime(el: HTMLElement): number {
  const view = el.ownerDocument.defaultView
  if (!view) return 0
  const style = view.getComputedStyle(el)
  const properties = (style.transitionProperty || '').split(',').map((p) => p.trim())
  const durations = parseTimes(style.transitionDuration || '0s')
  const delays = parseTimes(style.transitionDelay || '0s')
  let end = 0
  properties.forEach((property, i) => {
    if (property !== 'visibility' && property !== 'all') return
    end = Math.max(end, durations[i % durations.length] + delays[i % delays.length])
  })
  return end
}

/** A CSS `<time>` custom property resolved on `el` (e.g. a motion duration token), ms. */
export function cssTime(el: HTMLElement, name: string): number {
  const view = el.ownerDocument.defaultView
  if (!view) return 0
  const value = view.getComputedStyle(el).getPropertyValue(name).trim()
  return value ? parseTimes(value)[0] : 0
}

export interface UseModalTopLayerOptions {
  /**
   * How long the element stays in the top layer after closing, ms, when its
   * exit is not a `visibility` transition (the rail's JS-spring collapse).
   * The larger of this and {@link visibilityExitTime} wins.
   */
  exitDuration?: (el: HTMLElement) => number
}

/**
 * Show `refs` (in order — later ones paint above earlier ones) in the top
 * layer while `active`, as the topmost elements: each opening re-shows them,
 * then re-raises the {@link useAboveModalsTopLayer} layers. On close they
 * stay until their exit motion has played (the delayed `visibility`
 * transition, or `exitDuration`), then leave.
 */
export function useModalTopLayer(
  active: boolean,
  refs: ReadonlyArray<RefObject<HTMLElement | null>>,
  { exitDuration }: UseModalTopLayerOptions = {},
) {
  const shownRef = useRef(new Set<HTMLElement>())
  const exitDurationRef = useRef(exitDuration)
  exitDurationRef.current = exitDuration

  useIsoLayoutEffect(() => {
    const shown = shownRef.current
    if (active) {
      for (const ref of refs) {
        const el = ref.current
        if (!el) continue
        raiseInTopLayer(el)
        if (isPopoverOpen(el)) shown.add(el)
      }
      for (const layer of aboveModals) {
        if (isPopoverOpen(layer)) raiseInTopLayer(layer)
      }
      return
    }
    const leaving = Array.from(shown).filter((el) => el.isConnected && isPopoverOpen(el))
    if (leaving.length === 0) {
      shown.clear()
      return
    }
    const leave = () => {
      for (const el of leaving) {
        hideFromTopLayer(el)
        shown.delete(el)
      }
    }
    const delay = Math.max(
      ...leaving.map((el) => Math.max(visibilityExitTime(el), exitDurationRef.current?.(el) ?? 0)),
    )
    if (delay <= 0) {
      leave()
      return
    }
    const timer = setTimeout(leave, delay)
    return () => clearTimeout(timer)
    // `refs` holds stable ref objects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  // Leave the top layer on unmount.
  useIsoLayoutEffect(() => {
    const shown = shownRef.current
    return () => {
      for (const el of shown) hideFromTopLayer(el)
      shown.clear()
    }
  }, [])
}

/**
 * Keep `ref` in the top layer while `active`, **above every modal**: it is
 * shown when it becomes active and re-shown each time a modal enters the top
 * layer (`useModalTopLayer`). Used by the Snackbar host — MD3 snackbars sit
 * above dialogs, the same order as the `--md-sys-z-modal` <
 * `--md-sys-z-snackbar` fallback.
 */
export function useAboveModalsTopLayer(ref: RefObject<HTMLElement | null>, active: boolean) {
  useIsoLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    aboveModals.add(el)
    return () => {
      aboveModals.delete(el)
      hideFromTopLayer(el)
    }
  }, [ref])

  useIsoLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    if (active) showInTopLayer(el)
    else hideFromTopLayer(el)
  }, [ref, active])
}
