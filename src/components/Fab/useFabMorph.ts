'use client'

import { useLayoutEffect, useRef, type RefObject } from 'react'
import {
  prefersReducedMotion,
  readSpring,
  stepSpring as step,
  type SpringState,
} from '../../internal/spring'

/**
 * Extended FAB collapse↔expand morph, per Compose
 * `Small / Medium / LargeExtendedFloatingActionButton(expanded=)`: in both
 * directions the width progress runs on the `FastSpatial` spring and the label
 * alpha on `FastEffects`. The springs are read from the motion-scheme tokens
 * (`--md-sys-motion-spring-fast-{spatial,effects}-{damping,stiffness}`) on the
 * element, so `ThemeProvider motionScheme` switches them (expressive 0.6 / 800
 * with ~9% overshoot, standard 0.9 / 1400); the expressive values are the
 * fallback when the tokens are not loaded (src/internal/spring.ts).
 *
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
    const widthSpec = readSpring(ref.current, 'fast-spatial')
    const fadeSpec = readSpring(ref.current, 'fast-effects')

    const write = () => {
      const el = ref.current
      el?.style.setProperty('--_ext', String(ext.current.value))
      el?.style.setProperty('--_label-o', String(Math.min(1, Math.max(0, opacity.current.value))))
    }

    if (prefersReducedMotion()) {
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
