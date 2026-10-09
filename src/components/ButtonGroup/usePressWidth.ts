import { useEffect, type RefObject } from 'react'
import { getItems } from './getItems'

/** Compose ButtonGroupDefaults.ExpandedRatio. */
export const EXPANDED_RATIO = 0.15

/**
 * Target widths while `index` is pressed — a port of Compose's ButtonGroup
 * measure policy (`EnlargeOnPressNode` / `animateWidth`): the pressed item
 * grows by `EXPANDED_RATIO` of its width, taken from its neighbours so the
 * group width stays constant. A middle item takes half from each side, the
 * first / last item takes it all from its one neighbour, and each neighbour
 * gives at most its compression limit (Compose: the neighbour's content
 * padding) and never more than its own width.
 */
export function pressedWidths(
  widths: readonly number[],
  limits: readonly number[],
  index: number,
  ratio = EXPANDED_RATIO,
): number[] {
  const next = [...widths]
  if (widths.length < 2) return next
  const last = widths.length - 1
  let growth: number
  if (index > 0 && index < last) {
    const side = Math.min((ratio * widths[index]) / 2, limits[index - 1], limits[index + 1])
    const left = Math.min(side, widths[index - 1])
    const right = Math.min(side, widths[index + 1])
    next[index - 1] -= left
    next[index + 1] -= right
    growth = left + right
  } else {
    const neighbour = index === 0 ? 1 : last - 1
    growth = Math.min(ratio * widths[index], limits[neighbour], widths[neighbour])
    next[neighbour] -= growth
  }
  next[index] += growth
  return next
}

function motion(el: Element): { duration: number; easing: string } {
  // Compose ButtonGroup animates the pressed width with
  // MotionSchemeKeyTokens.FastSpatial — read from the motion-scheme tokens so
  // ThemeProvider motionScheme switches it (expressive 0.6 / 800 overshoots,
  // standard 0.9 / 1400 does not). Fallback: expressive FastSpatial duration.
  const style = getComputedStyle(el)
  const duration = parseFloat(
    style.getPropertyValue('--md-sys-motion-spring-fast-spatial-duration'),
  )
  const easing = style
    .getPropertyValue('--md-sys-motion-spring-fast-spatial-easing')
    .trim()
  return {
    duration: Number.isFinite(duration) ? duration : 360,
    easing: easing || 'ease-out',
  }
}

/**
 * Standard ButtonGroup press interaction: while a child button is pressed it
 * widens and its neighbours narrow (Web Animations on `width` / `min-width`,
 * so the children's own CSS `transition`s are left untouched). Items are the
 * group's buttons, direct or one wrapper deep (getItems — e.g. Tooltip-wrapped
 * IconButtons). A press is a primary pointer press or, like Compose
 * `EnlargeOnPress` (which follows every PressInteraction), Space / Enter held
 * on a focused item. Horizontal groups only; skipped under reduced motion (B3
 * — spatial motion stops) and where `Element.animate` is unavailable.
 */
export function usePressWidth(ref: RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    const group = ref.current
    if (!group || !enabled) return

    let running: Animation[] = []
    /** The key holding a keyboard press, if any. */
    let pressKey: string | null = null

    const removeReleaseListeners = () => {
      window.removeEventListener('pointerup', release)
      window.removeEventListener('pointercancel', release)
      window.removeEventListener('keyup', onKeyUp)
      group.removeEventListener('focusout', release)
    }

    function release() {
      removeReleaseListeners()
      pressKey = null
      for (const anim of running) {
        anim.onfinish = () => anim.cancel()
        anim.reverse()
      }
      running = []
    }

    function onKeyUp(event: KeyboardEvent) {
      if (event.key === pressKey) release()
    }

    /** Starts the press-widen for the item containing `target`; true if it did. */
    const press = (target: EventTarget | null): boolean => {
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false
      const items = getItems(group)
      const index = items.findIndex((el) => el.contains(target as Node))
      if (index < 0 || items.length < 2) return false
      const pressed = items[index]
      if (pressed.disabled || typeof pressed.animate !== 'function') return false

      // A new press before the previous release finished: settle first.
      removeReleaseListeners()
      pressKey = null
      for (const anim of running) anim.cancel()
      running = []

      const widths = items.map((el) => el.getBoundingClientRect().width)
      const limits = items.map((el) => parseFloat(getComputedStyle(el).paddingInlineStart) || 0)
      const targets = pressedWidths(widths, limits, index)
      const { duration, easing } = motion(group)

      items.forEach((el, i) => {
        if (Math.abs(targets[i] - widths[i]) < 0.5) return
        const from = `${widths[i]}px`
        const to = `${targets[i]}px`
        running.push(
          el.animate(
            [
              { width: from, minWidth: from },
              { width: to, minWidth: to },
            ],
            { duration, easing, fill: 'forwards' },
          ),
        )
      })
      return true
    }

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return
      if (!press(event.target)) return
      window.addEventListener('pointerup', release)
      window.addEventListener('pointercancel', release)
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== ' ' && event.key !== 'Enter') return
      if (event.repeat || event.defaultPrevented || pressKey === event.key) return
      if (event.altKey || event.ctrlKey || event.metaKey) return
      // Only a key on the item itself (never from content nested inside it).
      if (!getItems(group).includes(event.target as HTMLButtonElement)) return
      if (!press(event.target)) return
      pressKey = event.key
      window.addEventListener('keyup', onKeyUp)
      group.addEventListener('focusout', release)
    }

    group.addEventListener('pointerdown', onPointerDown)
    group.addEventListener('keydown', onKeyDown)
    return () => {
      group.removeEventListener('pointerdown', onPointerDown)
      group.removeEventListener('keydown', onKeyDown)
      removeReleaseListeners()
      for (const anim of running) anim.cancel()
    }
  }, [ref, enabled])
}
