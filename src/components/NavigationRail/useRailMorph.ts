import { useEffect, useRef, type RefObject } from 'react'

/**
 * Drives the collapse↔expand morph as a single spring value `t` (0 = collapsed,
 * 1 = expanded), written to the target element as the `--_t` custom property
 * (inherited by items, which interpolate every layout value from it). A damped
 * spring — interruptible mid-flight (keeps position + velocity), matching the
 * Compose `MotionScheme.DefaultSpatial` feel.
 */
export function useRailMorph(
  expanded: boolean,
  ref: RefObject<HTMLElement | null>,
  { stiffness = 320, damping = 30 }: { stiffness?: number; damping?: number } = {},
) {
  const t = useRef(expanded ? 1 : 0)
  const vel = useRef(0)
  const raf = useRef(0)

  // Keep the resting value correct on first paint / SSR.
  useEffect(() => {
    ref.current?.style.setProperty('--_t', String(t.current))
  }, [ref])

  useEffect(() => {
    const target = expanded ? 1 : 0
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

      const a = -stiffness * (t.current - target) - damping * vel.current
      vel.current += a * dt
      t.current += vel.current * dt

      if (Math.abs(t.current - target) < 0.0005 && Math.abs(vel.current) < 0.0005) {
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
  }, [expanded, ref, stiffness, damping])
}
