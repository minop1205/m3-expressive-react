import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

/*
 * CSS hygiene guards (#460, #424).
 */
const SRC = resolve(__dirname, '..')

function cssModules(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return cssModules(path)
    return name.endsWith('.module.css') ? [path] : []
  })
}

const files = cssModules(SRC).map((path) => ({
  path: relative(SRC, path),
  css: readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ''),
}))

describe('css hygiene', () => {
  it('scans the CSS modules', () => {
    expect(files.length).toBeGreaterThan(30)
  })

  it('has no :dir() selectors (use [dir=rtl] ancestors)', () => {
    // Lightning CSS (Vite's CSS minifier, ours and consumers') lowers
    // `:dir(rtl)` to a `:lang(ar, he, …)` list that ignores the `dir`
    // attribute, so the rule never matches a page that only sets dir="rtl".
    expect(files.filter((f) => f.css.includes(':dir(')).map((f) => f.path)).toEqual([])
  })

  it('takes overlay z-index values from the --md-sys-z-* scale', () => {
    // Local stacking (0–9 inside a component) is fine; anything that competes
    // with other overlays must use the token scale in tokens.css.
    const offenders = files.flatMap((f) =>
      [...f.css.matchAll(/z-index:\s*(-?\d+)/g)]
        .filter((m) => Math.abs(Number(m[1])) >= 10)
        .map((m) => `${f.path}: ${m[0]}`),
    )
    expect(offenders).toEqual([])
  })

  it('defines the overlay scale in ascending order', () => {
    const tokens = readFileSync(join(SRC, 'styles/tokens.css'), 'utf8')
    const scale = ['tooltip', 'search', 'popup', 'modal', 'snackbar'].map((name) => {
      const m = tokens.match(new RegExp(`--md-sys-z-${name}:\\s*(\\d+);`))
      expect(m, name).not.toBeNull()
      return Number(m![1])
    })
    expect(scale).toEqual([10, 20, 22, 24, 30])
  })
})
