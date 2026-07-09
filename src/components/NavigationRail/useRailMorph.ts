import { useEffect, useRef, type RefObject } from 'react'

/**
 * The collapse↔expand morph uses the MD3 Expressive Motion Scheme
 * "Default Spatial" spring — the exact spec WideNavigationRail uses in Compose
 * (`MotionSchemeKeyTokens.DefaultSpatial`), whose constants live in
 * `ExpressiveMotionTokens`: dampingRatio 0.8, stiffness 380. That damping gives
 * a ~1.5% overshoot (imperceptible, ~1px) and settles in ~190ms of perceived
 * motion — matching the m3.material.io reference measured at 60fps.
 */
const STIFFNESS = 380
const DAMPING_RATIO = 0.8
const DAMPING = 2 * DAMPING_RATIO * Math.sqrt(STIFFNESS)

/**
 * Drives the morph as a single value `t` (0 = collapsed, 1 = expanded), written
 * to the target element as the `--_t` custom property (inherited by items, which
 * interpolate every layout value from it). A physical spring — interruptible by
 * nature: a change mid-flight keeps the current position and velocity. Also sets
 * `--_slide` (1 expanding / 0 collapsing) so the label only slides in on expand.
 */
export function useRailMorph(
  expanded: boolean,
  ref: RefObject<HTMLElement | null>,
  enabled = true,
) {
  const t = useRef(expanded ? 1 : 0)
  const vel = useRef(0)
  const raf = useRef(0)

  // Resting value + direction flag on first paint.
  useEffect(() => {
    if (!enabled) return
    ref.current?.style.setProperty('--_t', String(t.current))
    ref.current?.style.setProperty('--_slide', expanded ? '1' : '0')
  }, [ref, expanded, enabled])

  useEffect(() => {
    if (!enabled) return
    const target = expanded ? 1 : 0
    // The label only slides while expanding; collapsing is a plain cross-fade.
    ref.current?.style.setProperty('--_slide', expanded ? '1' : '0')

    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      t.current = target
      vel.current = 0
      ref.current?.style.setProperty('--_t', String(target))
      return
    }

    let prev: number | undefined
    const tick = (now: number) => {
      if (prev == null) prev = now
      const dt = Math.min(0.032, (now - prev) / 1000)
      prev = now

      const a = -STIFFNESS * (t.current - target) - DAMPING * vel.current
      vel.current += a * dt
      t.current += vel.current * dt

      if (Math.abs(t.current - target) < 0.001 && Math.abs(vel.current) < 0.001) {
        t.current = target
        vel.current = 0
        ref.current?.style.setProperty('--_t', String(target))
        return
      }
      ref.current?.style.setProperty('--_t', String(t.current))
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [expanded, ref, enabled])
}
