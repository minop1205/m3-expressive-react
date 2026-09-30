import { useLayoutEffect, useRef, type RefObject } from 'react'
import { effectsSprings, spatialSprings } from '../../tokens/motion'

/**
 * Extended FAB collapse↔expand morph, per Compose
 * `Small / Medium / LargeExtendedFloatingActionButton(expanded=)`: in both
 * directions the width progress runs on the `FastSpatial` spring and the label
 * alpha on `FastEffects`. The springs are read from the motion-scheme tokens
 * (`--md-sys-motion-spring-fast-{spatial,effects}-{damping,stiffness}`) on the
 * element, so `ThemeProvider motionScheme` switches them (expressive 0.6 / 800
 * with ~9% overshoot, standard 0.9 / 1400); the expressive values are the
 * fallback when the tokens are not loaded.
 */
interface SpringSpec {
  stiffness: number
  dampingRatio: number
}

function readSpring(el: HTMLElement | null, key: string, fallback: SpringSpec): SpringSpec {
  if (!el || typeof getComputedStyle === 'undefined') return fallback
  const style = getComputedStyle(el)
  const damping = parseFloat(style.getPropertyValue(`--md-sys-motion-spring-${key}-damping`))
  const stiffness = parseFloat(style.getPropertyValue(`--md-sys-motion-spring-${key}-stiffness`))
  return Number.isFinite(damping) && Number.isFinite(stiffness) && stiffness > 0
    ? { stiffness, dampingRatio: damping }
    : fallback
}

const FAST_SPATIAL: SpringSpec = {
  stiffness: spatialSprings.expressive.fast.stiffness,
  dampingRatio: spatialSprings.expressive.fast.damping,
}
const FAST_EFFECTS: SpringSpec = {
  stiffness: effectsSprings.fast.stiffness,
  dampingRatio: effectsSprings.fast.damping,
}

interface SpringState {
  value: number
  vel: number
}

/* Semi-implicit Euler needs damping·dt < 2 to stay stable; the stiffest spring
   here (FastEffects 3800 → damping ≈ 123) already diverges at a 60fps frame (16.7ms), so
   integrate in sub-steps of at most 4ms (stable up to stiffness ~62000). */
const MAX_SUBSTEP = 0.004

function step(s: SpringState, target: number, spec: SpringSpec, dt: number) {
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
    const widthSpec = readSpring(ref.current, 'fast-spatial', FAST_SPATIAL)
    const fadeSpec = readSpring(ref.current, 'fast-effects', FAST_EFFECTS)

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
