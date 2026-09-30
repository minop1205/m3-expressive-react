import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import { effectsSprings, spatialSprings } from '../tokens/motion'
import {
  MOTION_TOKENS_END,
  MOTION_TOKENS_START,
  SETTLE_THRESHOLD,
  motionSchemeCssBlock,
  schemeSprings,
  springDisplacement,
  springDurationMs,
  springToCss,
} from './motionScheme'

/** Evaluate a CSS `linear()` easing at progress x ∈ [0, 1]. */
function evalLinear(easing: string, x: number): number {
  const stops = easing
    .replace(/^linear\(|\)$/g, '')
    .split(',')
    .map((s) => s.trim().split(/\s+/))
  const pts = stops.map(([y, p], i) => [
    p ? parseFloat(p) / 100 : i === 0 ? 0 : 1,
    parseFloat(y),
  ])
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]
    const [x1, y1] = pts[i]
    if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0)
  }
  return 1
}

const MOTION_SCHEME_SPRINGS = schemeSprings(spatialSprings, effectsSprings)

describe('motion scheme springs', () => {
  it('matches Compose StandardMotionTokens / ExpressiveMotionTokens', () => {
    expect(MOTION_SCHEME_SPRINGS.standard['default-spatial']).toEqual({
      damping: 0.9,
      stiffness: 700,
    })
    expect(MOTION_SCHEME_SPRINGS.expressive['fast-spatial']).toEqual({
      damping: 0.6,
      stiffness: 800,
    })
    // Effects springs are shared by both schemes.
    for (const key of [
      'fast-effects',
      'default-effects',
      'slow-effects',
    ] as const) {
      expect(MOTION_SCHEME_SPRINGS.standard[key]).toEqual(
        MOTION_SCHEME_SPRINGS.expressive[key],
      )
    }
  })

  it('solves the spring analytically (overshoot of an under-damped step)', () => {
    const spring = { damping: 0.6, stiffness: 800 }
    const wd = Math.sqrt(800) * Math.sqrt(1 - 0.36)
    const peak = 1 - springDisplacement(spring, Math.PI / wd)
    expect(peak).toBeCloseTo(1 + Math.exp((-0.6 * Math.PI) / 0.8), 6)
  })

  it('duration is the settle time within the threshold', () => {
    for (const scheme of ['standard', 'expressive'] as const) {
      for (const spring of Object.values(MOTION_SCHEME_SPRINGS[scheme])) {
        const ms = springDurationMs(spring)
        for (let t = ms; t < ms + 500; t++) {
          expect(Math.abs(springDisplacement(spring, t / 1000))).toBeLessThan(
            SETTLE_THRESHOLD,
          )
        }
      }
    }
  })

  it('linear() easing tracks the spring curve closely', () => {
    for (const scheme of ['standard', 'expressive'] as const) {
      for (const spring of Object.values(MOTION_SCHEME_SPRINGS[scheme])) {
        const { durationMs, easing } = springToCss(spring)
        for (let ms = 0; ms <= durationMs; ms += 3) {
          const exact = 1 - springDisplacement(spring, ms / 1000)
          expect(
            Math.abs(evalLinear(easing, ms / durationMs) - exact),
          ).toBeLessThan(0.005)
        }
      }
    }
  })

  it('expressive spatial springs overshoot, standard ones barely do', () => {
    const maxOf = (easing: string) =>
      Math.max(
        ...[...easing.matchAll(/(-?[\d.]+)(?:\s+[\d.]+%)?[,)]/g)].map(
          (m) => +m[1],
        ),
      )
    expect(
      maxOf(
        springToCss(MOTION_SCHEME_SPRINGS.expressive['fast-spatial']).easing,
      ),
    ).toBeGreaterThan(1.09)
    expect(
      maxOf(springToCss(MOTION_SCHEME_SPRINGS.standard['fast-spatial']).easing),
    ).toBeLessThan(1.001)
  })

  it('tokens.css is in sync with the generator', () => {
    const css = readFileSync(resolve(__dirname, '../styles/tokens.css'), 'utf8')
    const start = css.indexOf(MOTION_TOKENS_START)
    const end = css.indexOf(MOTION_TOKENS_END) + MOTION_TOKENS_END.length
    expect(
      css.slice(start, end),
      'run `node scripts/generate-motion-tokens.ts`',
    ).toBe(motionSchemeCssBlock(MOTION_SCHEME_SPRINGS))
  })
})
