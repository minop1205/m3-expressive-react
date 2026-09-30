/**
 * MD3 motion schemes — CSS approximations of the spring tokens.
 *
 * Spring parameters live in src/tokens/motion.ts (public `spatialSprings` /
 * `effectsSprings`), verified against Compose `androidx.compose.material3.MotionScheme` (androidx-main),
 * `tokens/StandardMotionTokens.kt` + `tokens/ExpressiveMotionTokens.kt`
 * (token VERSION v0_14_0). Each scheme defines six springs: spatial springs
 * (position / size / shape — may overshoot) and effects springs (color /
 * opacity — always critically damped), each in fast / default / slow.
 *
 * CSS has no spring timing function, so every spring is baked into a
 * `duration` + `linear()` easing pair by {@link springToCss}:
 *
 * 1. Solve the damped harmonic oscillator for a unit step (unit mass,
 *    ω₀ = √stiffness, ζ = dampingRatio, start 0 → target 1, zero initial
 *    velocity). Remaining displacement d(t):
 *    - ζ < 1: d = e^(−ζω₀t) · (cos ω_d t + (ζω₀ / ω_d) sin ω_d t),
 *      ω_d = ω₀√(1 − ζ²)
 *    - ζ = 1: d = (1 + ω₀t) · e^(−ω₀t)
 * 2. Duration = the last moment |d(t)| ≥ {@link SETTLE_THRESHOLD} (0.1 % of
 *    the travel — 0.1px on a 100px move), rounded up to 10ms. This mirrors
 *    Compose ending a spring once it is within its visibility threshold.
 * 3. Progress 1 − d(t) is sampled every 1ms over [0, duration] and reduced
 *    with Ramer–Douglas–Peucker (tolerance {@link SIMPLIFY_TOLERANCE}) into
 *    `linear()` stops. `linear()` can exceed 1, so overshoot is encoded
 *    exactly (Chrome 113 / Firefox 112 / Safari 17.2).
 *
 * The emitted tokens live in `src/styles/tokens.css` between the
 * `motion-scheme:generated` markers and are regenerated with
 * `node scripts/generate-motion-tokens.ts`; a unit test fails if they drift.
 *
 * This module must stay free of value imports and non-erasable TS syntax so
 * Node can run it directly (type stripping) from the generator script.
 */

import type { MotionScheme, SpringToken } from '../tokens/motion'

export type SpringKey =
  | 'fast-spatial'
  | 'default-spatial'
  | 'slow-spatial'
  | 'fast-effects'
  | 'default-effects'
  | 'slow-effects'

export type SchemeSprings = Record<MotionScheme, Record<SpringKey, SpringToken>>

/**
 * Flatten the public spring tables (src/tokens/motion.ts — Compose
 * `StandardMotionTokens` / `ExpressiveMotionTokens`) into per-scheme maps.
 * Passed in rather than imported so Node can run this module directly.
 */
export function schemeSprings(
  spatial: Record<
    MotionScheme,
    Record<'fast' | 'default' | 'slow', SpringToken>
  >,
  effects: Record<'fast' | 'default' | 'slow', SpringToken>,
): SchemeSprings {
  const build = (scheme: MotionScheme): Record<SpringKey, SpringToken> => ({
    'fast-spatial': spatial[scheme].fast,
    'default-spatial': spatial[scheme].default,
    'slow-spatial': spatial[scheme].slow,
    'fast-effects': effects.fast,
    'default-effects': effects.default,
    'slow-effects': effects.slow,
  })
  return { expressive: build('expressive'), standard: build('standard') }
}

/** Fraction of the travel below which the spring counts as settled. */
export const SETTLE_THRESHOLD = 0.001
/** Max vertical error (progress units) tolerated when dropping samples. */
export const SIMPLIFY_TOLERANCE = 0.002

/** Remaining displacement d(t) (1 at t = 0, → 0 at rest); `t` in seconds. */
export function springDisplacement(
  { damping: zeta, stiffness }: SpringToken,
  t: number,
): number {
  const w0 = Math.sqrt(stiffness)
  if (zeta >= 1) {
    if (zeta === 1) return (1 + w0 * t) * Math.exp(-w0 * t)
    // Over-damped (not used by MD3 tokens, kept for completeness).
    const s = w0 * Math.sqrt(zeta * zeta - 1)
    const r1 = -zeta * w0 + s
    const r2 = -zeta * w0 - s
    return (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r2 - r1)
  }
  const wd = w0 * Math.sqrt(1 - zeta * zeta)
  return (
    Math.exp(-zeta * w0 * t) *
    (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t))
  )
}

/** Settle time in ms (rounded up to 10ms), per step 2 above. */
export function springDurationMs(spring: SpringToken): number {
  let last = 0
  // Scan well past any MD3 spring's settle time (≤ 1s).
  for (let ms = 0; ms <= 5000; ms++) {
    if (Math.abs(springDisplacement(spring, ms / 1000)) >= SETTLE_THRESHOLD) {
      last = ms
    }
  }
  return Math.ceil((last + 1) / 10) * 10
}

function simplify(points: [number, number][], tol: number): [number, number][] {
  if (points.length < 3) return points
  const [x0, y0] = points[0]
  const [x1, y1] = points[points.length - 1]
  let maxErr = 0
  let index = 0
  for (let i = 1; i < points.length - 1; i++) {
    const [x, y] = points[i]
    const yOnChord = y0 + ((y1 - y0) * (x - x0)) / (x1 - x0)
    const err = Math.abs(y - yOnChord)
    if (err > maxErr) {
      maxErr = err
      index = i
    }
  }
  if (maxErr <= tol) return [points[0], points[points.length - 1]]
  const left = simplify(points.slice(0, index + 1), tol)
  const right = simplify(points.slice(index), tol)
  return [...left.slice(0, -1), ...right]
}

const round = (n: number, digits: number) => {
  const r = Number(n.toFixed(digits))
  return Object.is(r, -0) ? 0 : r
}

/** Bake a spring into a CSS `duration` (ms) + `linear()` easing. */
export function springToCss(spring: SpringToken): {
  durationMs: number
  easing: string
} {
  const durationMs = springDurationMs(spring)
  const samples: [number, number][] = []
  for (let ms = 0; ms <= durationMs; ms++) {
    samples.push([ms / durationMs, 1 - springDisplacement(spring, ms / 1000)])
  }
  // Pin the endpoints: the residual (< SETTLE_THRESHOLD) snaps at the end.
  samples[0] = [0, 0]
  samples[samples.length - 1] = [1, 1]
  const stops = simplify(samples, SIMPLIFY_TOLERANCE).map(([x, y], i, all) =>
    i === 0 || i === all.length - 1
      ? String(y)
      : `${round(y, 4)} ${round(x * 100, 2)}%`,
  )
  return { durationMs, easing: `linear(${stops.join(', ')})` }
}

/**
 * CSS declarations (one per line, no selector) for a scheme:
 * `--md-sys-motion-spring-<key>-{damping,stiffness,duration,easing}`.
 */
export function motionSchemeCssDeclarations(
  springs: Record<SpringKey, SpringToken>,
): string[] {
  const lines: string[] = []
  for (const [key, spring] of Object.entries(springs)) {
    const { durationMs, easing } = springToCss(spring)
    const prefix = `--md-sys-motion-spring-${key}`
    lines.push(
      `${prefix}-damping: ${spring.damping};`,
      `${prefix}-stiffness: ${spring.stiffness};`,
      `${prefix}-duration: ${durationMs}ms;`,
      `${prefix}-easing: ${easing};`,
    )
  }
  return lines
}

export const MOTION_TOKENS_START = '/* motion-scheme:generated:start */'
export const MOTION_TOKENS_END = '/* motion-scheme:generated:end */'

/**
 * The generated tokens.css region (markers included). `expressive` sits on
 * `:root` (library default, B2) and is re-declared under
 * `[data-md-motion-scheme='expressive']` so a nested ThemeProvider can switch
 * back; the later `standard` rule wins when both match the same element.
 */
export function motionSchemeCssBlock(springs: SchemeSprings): string {
  const body = (scheme: MotionScheme) =>
    motionSchemeCssDeclarations(springs[scheme])
      .map((line) => `  ${line}`)
      .join('\n')
  return [
    MOTION_TOKENS_START,
    '/* Generated by scripts/generate-motion-tokens.ts from',
    '   src/theme/motionScheme.ts — do not edit by hand. */',
    ":root,\n[data-md-motion-scheme='expressive'] {",
    body('expressive'),
    '}',
    '',
    "[data-md-motion-scheme='standard'] {",
    body('standard'),
    '}',
    MOTION_TOKENS_END,
  ].join('\n')
}
