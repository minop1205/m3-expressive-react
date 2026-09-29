import { useLayoutEffect, useRef, type RefObject } from 'react'

/**
 * Extended FAB collapse↔expand morph, per Compose
 * `ExtendedFloatingActionButton(expanded=)` with the MD3 Expressive motion
 * scheme (`MotionScheme.expressive()` / `ExpressiveMotionTokens`):
 *
 *   expand:   width `FastSpatial` (damping 0.6, stiffness 800, ~9% overshoot)
 *             + label fade-in `DefaultEffects` (damping 1.0, stiffness 1600)
 *   collapse: width `DefaultSpatial` (damping 0.8, stiffness 380)
 *             + label fade-out `FastEffects` (damping 1.0, stiffness 3800)
 */
const WIDTH_EXPAND = { stiffness: 800, dampingRatio: 0.6 }
const WIDTH_COLLAPSE = { stiffness: 380, dampingRatio: 0.8 }
const FADE_IN = { stiffness: 1600, dampingRatio: 1 }
const FADE_OUT = { stiffness: 3800, dampingRatio: 1 }

interface SpringState {
  value: number
  vel: number
}

/* Semi-implicit Euler needs damping·dt < 2 to stay stable; the stiffest spring
   here (3800 → damping ≈ 123) already diverges at a 60fps frame (16.7ms), so
   integrate in sub-steps of at most 4ms (stable up to stiffness ~62000). */
const MAX_SUBSTEP = 0.004

function step(s: SpringState, target: number, spec: { stiffness: number; dampingRatio: number }, dt: number) {
  const damping = 2 * spec.dampingRatio * Math.sqrt(spec.stiffness)
  const n = Math.max(1, Math.ceil(dt / MAX_SUBSTEP))
  const h = dt / n
  for (let i = 0; i < n; i++) {
    const a = -spec.stiffness * (s.value - target) - damping * s.vel
    s.vel += a * h
    s.value += s.vel * h
  }
  if (Math.abs(s.value - target) < 0.001 && Math.abs(s.vel) < 0.001) {
    s.value = target
    s.vel = 0
    return true
  }
  return false
}

/**
 * Drives the morph as two custom properties on the FAB element: `--_ext`
 * (label-row width progress, 0 = collapsed, 1 = expanded, may overshoot) and
 * `--_label-o` (label opacity, clamped to [0, 1]). Physical springs, so a
 * change mid-flight keeps the current position and velocity.
 */
export function useFabMorph(expanded: boolean, ref: RefObject<HTMLElement | null>, enabled = true) {
  const ext = useRef<SpringState>({ value: expanded ? 1 : 0, vel: 0 })
  const opacity = useRef<SpringState>({ value: expanded ? 1 : 0, vel: 0 })
  const raf = useRef(0)

  // Resting values before first paint (no expanded-state flash on mount).
  useLayoutEffect(() => {
    if (!enabled) return
    const el = ref.current
    el?.style.setProperty('--_ext', String(ext.current.value))
    el?.style.setProperty('--_label-o', String(opacity.current.value))
  }, [ref, expanded, enabled])

  useLayoutEffect(() => {
    if (!enabled) return
    const target = expanded ? 1 : 0
    const widthSpec = expanded ? WIDTH_EXPAND : WIDTH_COLLAPSE
    const fadeSpec = expanded ? FADE_IN : FADE_OUT

    const write = () => {
      const el = ref.current
      el?.style.setProperty('--_ext', String(ext.current.value))
      el?.style.setProperty('--_label-o', String(Math.min(1, Math.max(0, opacity.current.value))))
    }

    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      ext.current = { value: target, vel: 0 }
      opacity.current = { value: target, vel: 0 }
      write()
      return
    }

    let prev: number | undefined
    const tick = (now: number) => {
      if (prev == null) prev = now
      const dt = Math.min(0.032, (now - prev) / 1000)
      prev = now
      const widthDone = step(ext.current, target, widthSpec, dt)
      const fadeDone = step(opacity.current, target, fadeSpec, dt)
      write()
      if (widthDone && fadeDone) return
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [expanded, ref, enabled])
}
