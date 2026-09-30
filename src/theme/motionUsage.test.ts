import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

/*
 * Motion lint (#314 / #315, rulings B2 / B3). Components take spatial and
 * effects motion from the motion-scheme spring tokens
 * (--md-sys-motion-spring-*, src/styles/tokens.css) so ThemeProvider
 * motionScheme and the shared reduced-motion override reach them; hand-rolled
 * spring approximations must not creep back in.
 */
const SRC = resolve(__dirname, '..')
const ROOTS = ['components', 'primitives', 'internal'].map((d) => join(SRC, d))

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sources(path)
    return /\.(css|ts|tsx)$/.test(name) && !/\.(test|stories)\.tsx?$/.test(name) ? [path] : []
  })
}

const files = ROOTS.flatMap(sources).map((path) => ({
  path: relative(SRC, path),
  text: readFileSync(path, 'utf8'),
}))

/**
 * Documented exceptions: `path` → reason. Keep empty unless an animation has
 * no motion-scheme counterpart AND cannot use the duration / easing tokens.
 */
const CUBIC_BEZIER_ALLOWLIST: Record<string, string> = {}

describe('motion usage', () => {
  it('scans the component sources', () => {
    expect(files.length).toBeGreaterThan(50)
  })

  it('has no raw cubic-bezier() in component code (use the spring or easing tokens)', () => {
    const offenders = files
      .filter((f) => !(f.path in CUBIC_BEZIER_ALLOWLIST))
      .filter((f) => /cubic-bezier\(/.test(f.text.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')))
      .map((f) => f.path)
    expect(offenders).toEqual([])
  })

  it('has no pending TODO(#314) motion migrations', () => {
    expect(files.filter((f) => f.text.includes('TODO(#314)')).map((f) => f.path)).toEqual([])
  })

  it('pairs every spring duration token with the same spring’s easing', () => {
    // Per rule: each `spring-<key>-easing` must come with its own
    // `spring-<key>-duration` (durations alone are fine — e.g. a visibility
    // delay that waits for a spring to settle).
    const offenders: string[] = []
    for (const f of files.filter((file) => file.path.endsWith('.css'))) {
      const css = f.text.replace(/\/\*[\s\S]*?\*\//g, '')
      for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        for (const e of m[2].matchAll(/--md-sys-motion-spring-([a-z]+-[a-z]+)-easing/g)) {
          if (!m[2].includes(`--md-sys-motion-spring-${e[1]}-duration`)) {
            offenders.push(`${f.path}: ${m[1].trim()} (${e[1]})`)
          }
        }
      }
    }
    expect(offenders).toEqual([])
  })
})

describe('reduced motion (B3)', () => {
  const tokens = readFileSync(join(SRC, 'styles/tokens.css'), 'utf8')

  it('zeroes every spatial spring duration under prefers-reduced-motion: reduce', () => {
    const block = tokens.match(
      /@media \(prefers-reduced-motion: reduce\) \{\s*:root,\s*\[data-md-motion-scheme\] \{([^}]*)\}/,
    )
    expect(block).not.toBeNull()
    for (const speed of ['fast', 'default', 'slow']) {
      expect(block![1]).toContain(`--md-sys-motion-spring-${speed}-spatial-duration: 0ms;`)
    }
    // Effects springs (color / opacity) keep their fade.
    expect(block![1]).not.toMatch(/effects-duration/)
    // Declared after the generated scheme rules, so it wins in both schemes.
    expect(tokens.indexOf(block![0])).toBeGreaterThan(
      tokens.indexOf('/* motion-scheme:generated:end */'),
    )
  })

  it('JS-driven motion checks prefers-reduced-motion', () => {
    const js = files.filter(
      (f) => /\.tsx?$/.test(f.path) && /requestAnimationFrame\(|\.animate\(/.test(f.text),
    )
    const offenders = js
      .filter((f) => !/prefers-reduced-motion|prefersReducedMotion\(/.test(f.text))
      .map((f) => f.path)
    // useScrollObserver only batches scroll reads into frames (no motion).
    expect(offenders).toEqual(['internal/useScrollObserver.ts'])
  })
})
