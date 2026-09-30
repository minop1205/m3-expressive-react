import { effectsSprings, spatialSprings } from '../tokens/motion'
import type { SpringKey } from '../theme/motionScheme'

/**
 * Shared helpers for JS-driven spring animations (rAF physics). Springs are
 * read from the motion-scheme tokens
 * (`--md-sys-motion-spring-<key>-{damping,stiffness}`) on the animated element,
 * so `ThemeProvider motionScheme` switches them; the expressive values (the
 * library default, ruling B2) are the fallback when tokens.css is not loaded.
 */
export interface SpringSpec {
  stiffness: number
  dampingRatio: number
}

export interface SpringState {
  value: number
  vel: number
}

const FALLBACK: Record<SpringKey, SpringSpec> = {
  'fast-spatial': toSpec(spatialSprings.expressive.fast),
  'default-spatial': toSpec(spatialSprings.expressive.default),
  'slow-spatial': toSpec(spatialSprings.expressive.slow),
  'fast-effects': toSpec(effectsSprings.fast),
  'default-effects': toSpec(effectsSprings.default),
  'slow-effects': toSpec(effectsSprings.slow),
}

function toSpec({ damping, stiffness }: { damping: number; stiffness: number }): SpringSpec {
  return { stiffness, dampingRatio: damping }
}

/** The `key` spring as resolved on `el` (motion-scheme aware). */
export function readSpring(el: Element | null | undefined, key: SpringKey): SpringSpec {
  const fallback = FALLBACK[key]
  if (!el || typeof getComputedStyle === 'undefined') return fallback
  const style = getComputedStyle(el)
  const damping = parseFloat(style.getPropertyValue(`--md-sys-motion-spring-${key}-damping`))
  const stiffness = parseFloat(style.getPropertyValue(`--md-sys-motion-spring-${key}-stiffness`))
  return Number.isFinite(damping) && Number.isFinite(stiffness) && stiffness > 0
    ? { stiffness, dampingRatio: damping }
    : fallback
}

/** `prefers-reduced-motion: reduce` (ruling B3: JS motion snaps to target). */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  )
}

/* Semi-implicit Euler needs damping·dt < 2 to stay stable; the stiffest spring
   (FastEffects 3800 → damping ≈ 123) already diverges at a 60fps frame
   (16.7ms), so integrate in sub-steps of at most 4ms (stable up to stiffness
   ~62000). */
const MAX_SUBSTEP = 0.004

/**
 * Advance `s` towards `target` by `dt` seconds. Returns true (and snaps to the
 * target) once the spring has settled.
 */
export function stepSpring(s: SpringState, target: number, spec: SpringSpec, dt: number): boolean {
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
