import { useEffect, type RefObject } from 'react'

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
 * so the children's own CSS `transition`s are left untouched). Horizontal
 * groups only; skipped under reduced motion (B3 — spatial motion stops) and
 * where `Element.animate` is unavailable.
 */
export function usePressWidth(ref: RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    const group = ref.current
    if (!group || !enabled) return

    let running: Animation[] = []

    const release = () => {
      window.removeEventListener('pointerup', release)
      window.removeEventListener('pointercancel', release)
      for (const anim of running) {
        anim.onfinish = () => anim.cancel()
        anim.reverse()
      }
      running = []
    }

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
      const items = Array.from(group.children).filter(
        (el): el is HTMLElement => el instanceof HTMLElement && el.tagName === 'BUTTON',
      )
      const index = items.findIndex((el) => el.contains(event.target as Node))
      if (index < 0 || items.length < 2) return
      const pressed = items[index] as HTMLButtonElement
      if (pressed.disabled || typeof pressed.animate !== 'function') return

      // A new press before the previous release finished: settle first.
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
      window.addEventListener('pointerup', release)
      window.addEventListener('pointercancel', release)
    }

    group.addEventListener('pointerdown', onPointerDown)
    return () => {
      group.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointerup', release)
      window.removeEventListener('pointercancel', release)
      for (const anim of running) anim.cancel()
    }
  }, [ref, enabled])
}
