'use client'

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
 * expanded). `fromCollapsedOnMount` starts a mount that is already expanded
 * from 0, so it plays the same expand motion as expanding later — the modal
 * rail mounted open (#516); an in-flow rail keeps its resting value.
 *
 * The `--_t` value is also published as `--md-navigation-rail-expansion`
 * (ruling B57): the public contract for header / footer content that follows
 * the morph (0 = collapsed, 1 = expanded), inherited like `--_t`.
 */
const PUBLIC_EXPANSION = '--md-navigation-rail-expansion'
export function useRailMorph(
  expanded: boolean,
  ref: RefObject<HTMLElement | null>,
  enabled = true,
  property = '--_t',
  fromCollapsedOnMount = false,
) {
  const t = useRef<SpringState>({ value: expanded && !fromCollapsedOnMount ? 1 : 0, vel: 0 })
  const raf = useRef(0)

  const write = (value: number) => {
    const el = ref.current
    if (!el) return
    el.style.setProperty(property, String(value))
    if (property === '--_t') el.style.setProperty(PUBLIC_EXPANSION, String(value))
  }

  // Resting value + direction flag on first paint.
  useEffect(() => {
    if (!enabled) return
    write(t.current.value)
    ref.current?.style.setProperty('--_slide', expanded ? '1' : '0')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, expanded, enabled, property])

  useEffect(() => {
    if (!enabled) return
    const target = expanded ? 1 : 0
    // The label only slides while expanding; collapsing is a plain cross-fade.
    ref.current?.style.setProperty('--_slide', expanded ? '1' : '0')

    if (prefersReducedMotion()) {
      t.current = { value: target, vel: 0 }
      write(target)
      return
    }

    const spec = readSpring(ref.current, 'default-spatial')
    let prev: number | undefined
    const tick = (now: number) => {
      if (prev == null) prev = now
      const dt = Math.min(0.032, (now - prev) / 1000)
      prev = now
      const done = stepSpring(t.current, target, spec, dt)
      write(t.current.value)
      if (done) return
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, ref, enabled, property])
}
