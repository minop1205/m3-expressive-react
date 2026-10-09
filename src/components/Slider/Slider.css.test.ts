import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

/*
 * Geometry guard for the native range inputs (#431 item 4, #429 item 1).
 * jsdom has no layout, so the check reads the stylesheet and evaluates the
 * input / thumb sizes it declares for a given slider size:
 * - a native range maps a pointer at `x` (from the input's start edge) to
 *   `(x - thumb / 2) / (inputWidth - thumb)`; with the declared overhang that
 *   must equal the visual `x / W` of the track and handle;
 * - the cross-axis hit area (clip box, input and thumb) must reach 48px for
 *   every size without shrinking below the handle.
 */
const css = readFileSync(resolve(__dirname, 'Slider.module.css'), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
)

/** Declarations of the first rule whose selector list contains `selector`. */
function rule(selector: string): Record<string, string> {
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = m[1].split(',').map((s) => s.trim().replace(/\s+/g, ' '))
    if (!selectors.includes(selector)) continue
    const out: Record<string, string> = {}
    for (const d of m[2].matchAll(/([\w-]+)\s*:\s*([^;]+);/g)) out[d[1]] = d[2].trim()
    return out
  }
  throw new Error(`no rule for ${selector}`)
}

const inputs = rule('.inputs')

/** Evaluate a CSS length expression in px (`%` resolves against `percent`). */
function px(expr: string, vars: Record<string, number>, percent = 0): number {
  const js = expr
    .replace(/var\((--_[\w-]+)\)/g, (_, name: string) => {
      if (name in vars) return `(${vars[name]})`
      if (name in inputs) return `(${px(inputs[name], vars, percent)})`
      throw new Error(`unknown ${name}`)
    })
    .replace(/(-?[\d.]+)%/g, (_, n: string) => `(${(Number(n) / 100) * percent})`)
    .replace(/(-?[\d.]+)px/g, '$1')
    .replace(/\bcalc\(/g, '(')
    .replace(/\bmin\(/g, 'Math.min(')
    .replace(/\bmax\(/g, 'Math.max(')
  return Function(`return ${js}`)() as number
}

const HANDLES = { xs: 44, sm: 44, md: 52, lg: 68, xl: 108 }
const W = 320

describe('Slider native input geometry', () => {
  for (const orientation of ['horizontal', 'vertical'] as const) {
    const input = rule(`.slider[data-orientation='${orientation}'] .input`)
    const thumb = rule(`.slider[data-orientation='${orientation}'] .input::-webkit-slider-thumb`)
    const mozThumb = rule(`.slider[data-orientation='${orientation}'] .input::-moz-range-thumb`)
    const box = rule(`.slider[data-orientation='${orientation}'] .inputs`)
    const [mainSize, crossSize, mainStart, crossInset] =
      orientation === 'horizontal'
        ? (['width', 'height', 'inset-inline-start', 'inset-block'] as const)
        : (['height', 'width', 'top', 'inset-inline'] as const)

    it(`${orientation}: a pointer maps to the value under the visual handle`, () => {
      const vars = { '--_handle': 44 }
      expect(thumb[mainSize]).toBe(mozThumb[mainSize])
      const t = px(thumb[mainSize], vars)
      const start = px(input[mainStart], vars, W)
      const size = px(input[mainSize], vars, W)
      for (const x of [0, 12, 80, 160, 300, 320]) {
        // x measured from the track start; the input starts at `start`.
        const native = (x - start - t / 2) / (size - t)
        expect(native).toBeCloseTo(x / W, 10)
      }
    })

    it(`${orientation}: the cross-axis hit area is at least 48px`, () => {
      for (const handle of Object.values(HANDLES)) {
        const vars = { '--_handle': handle }
        const inset = px(box[crossInset], vars)
        // Never inside the handle (no visual / hit-area shrink) …
        expect(inset).toBeLessThanOrEqual(0)
        const boxSize = handle - 2 * inset
        expect(boxSize).toBeGreaterThanOrEqual(48)
        expect(boxSize).toBeGreaterThanOrEqual(handle)
        // … and the input fills the box, its thumb (range grab zone) too.
        expect(input[crossSize]).toBe('100%')
        expect(px(thumb[crossSize], vars)).toBeGreaterThanOrEqual(boxSize)
        expect(px(mozThumb[crossSize], vars)).toBeGreaterThanOrEqual(boxSize)
      }
    })
  }

  it('clips the inputs without creating a scroll container', () => {
    expect(inputs.overflow).toBe('clip')
  })
})
