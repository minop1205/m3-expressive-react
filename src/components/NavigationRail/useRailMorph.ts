import { useEffect, useRef, type RefObject } from 'react'

/**
 * Decelerate easing measured frame-by-frame from the m3.material.io reference
 * (60fps): the collapse↔expand morph runs ~190ms with a fast start that eases
 * out — monotonic, no overshoot. LUT of (time, progress) sampled from the video.
 */
const EASE_X = [0, 0.09, 0.18, 0.27, 0.36, 0.45, 0.55, 0.64, 0.73, 0.82, 1]
const EASE_Y = [0, 0.14, 0.27, 0.41, 0.55, 0.64, 0.77, 0.82, 0.91, 0.95, 1]
function decelerate(x: number) {
  if (x <= 0) return 0
  if (x >= 1) return 1
  let i = 1
  while (i < EASE_X.length && EASE_X[i] < x) i += 1
  const f = (x - EASE_X[i - 1]) / (EASE_X[i] - EASE_X[i - 1])
  return EASE_Y[i - 1] + (EASE_Y[i] - EASE_Y[i - 1]) * f
}

const DURATION_MS = 190

/**
 * Drives the collapse↔expand morph as a single value `t` (0 = collapsed, 1 =
 * expanded), written to the target element as the `--_t` custom property
 * (inherited by items, which interpolate every layout value from it). Uses a
 * fixed-duration tween on the measured decelerate curve; interruptible — a
 * change mid-flight retweens from the current value to the new target.
 */
export function useRailMorph(expanded: boolean, ref: RefObject<HTMLElement | null>) {
  const t = useRef(expanded ? 1 : 0)
  const raf = useRef(0)

  // Keep the resting value correct on first paint.
  useEffect(() => {
    ref.current?.style.setProperty('--_t', String(t.current))
    ref.current?.style.setProperty('--_slide', expanded ? '1' : '0')
  }, [ref, expanded])

  useEffect(() => {
    const target = expanded ? 1 : 0
    const from = t.current
    const dist = target - from
    if (Math.abs(dist) < 1e-4) return

    // The label only slides while expanding; collapsing is a plain cross-fade.
    ref.current?.style.setProperty('--_slide', expanded ? '1' : '0')

    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      t.current = target
      ref.current?.style.setProperty('--_t', String(target))
      return
    }

    // Scale duration by the remaining distance so a mid-flight reversal isn't
    // artificially slow.
    const duration = DURATION_MS * Math.max(0.35, Math.abs(dist))
    let start: number | undefined
    const tick = (now: number) => {
      if (start == null) start = now
      const p = Math.min(1, (now - start) / duration)
      t.current = from + dist * decelerate(p)
      ref.current?.style.setProperty('--_t', String(t.current))
      if (p >= 1) {
        t.current = target
        ref.current?.style.setProperty('--_t', String(target))
        return
      }
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [expanded, ref])
}
