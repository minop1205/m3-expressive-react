import { useEffect, useRef, type RefObject } from 'react'
import { prefersReducedMotion, readSpring, stepSpring, type SpringState } from '../../internal/spring'

/**
 * The collapse↔expand morph runs on the motion scheme's "Default Spatial"
 * spring — the spec WideNavigationRail uses in Compose
 * (`MotionSchemeKeyTokens.DefaultSpatial`). It is read from the
 * `--md-sys-motion-spring-default-spatial-{damping,stiffness}` tokens on the
 * rail, so `ThemeProvider motionScheme` switches it (expressive 0.8 / 380 —
 * ~1.5% overshoot, matching the m3.material.io reference; standard 0.9 / 700).
 */

/**
 * Drives the morph as a single value `t` (0 = collapsed, 1 = expanded), written
 * to the target element as the `--_t` custom property (inherited by items, which
 * interpolate every layout value from it). A physical spring — interruptible by
 * nature: a change mid-flight keeps the current position and velocity. Also sets
 * `--_slide` (1 expanding / 0 collapsing) so the label only slides in on expand.
 * `property` redirects the spring value to another custom property (the modal
 * hide-on-collapse rail slides in on `--_reveal` while its layout stays
 * expanded).
 */
export function useRailMorph(
  expanded: boolean,
  ref: RefObject<HTMLElement | null>,
  enabled = true,
  property = '--_t',
) {
  const t = useRef<SpringState>({ value: expanded ? 1 : 0, vel: 0 })
  const raf = useRef(0)

  // Resting value + direction flag on first paint.
  useEffect(() => {
    if (!enabled) return
    ref.current?.style.setProperty(property, String(t.current.value))
    ref.current?.style.setProperty('--_slide', expanded ? '1' : '0')
  }, [ref, expanded, enabled, property])

  useEffect(() => {
    if (!enabled) return
    const target = expanded ? 1 : 0
    // The label only slides while expanding; collapsing is a plain cross-fade.
    ref.current?.style.setProperty('--_slide', expanded ? '1' : '0')

    if (prefersReducedMotion()) {
      t.current = { value: target, vel: 0 }
      ref.current?.style.setProperty(property, String(target))
      return
    }

    const spec = readSpring(ref.current, 'default-spatial')
    let prev: number | undefined
    const tick = (now: number) => {
      if (prev == null) prev = now
      const dt = Math.min(0.032, (now - prev) / 1000)
      prev = now
      const done = stepSpring(t.current, target, spec, dt)
      ref.current?.style.setProperty(property, String(t.current.value))
      if (done) return
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [expanded, ref, enabled, property])
}
