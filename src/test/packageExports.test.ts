/**
 * Guards the per-component subpath entries (#378): every folder under
 * src/components/ — and every public primitive under src/primitives/
 * (Ripple, FocusRing) — must be exposed as `m3-expressive-react/<Folder>`
 * with a default export, and the root entry must keep its exact shape.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import * as root from '../index'

const repo = resolve(__dirname, '../..')
const pkg = JSON.parse(readFileSync(resolve(repo, 'package.json'), 'utf8'))
const foldersIn = (base: string) =>
  readdirSync(resolve(repo, 'src', base))
    .filter((name) => existsSync(resolve(repo, 'src', base, name, 'index.ts')))
    .map((name) => ({ name, base }))
const entries = [...foldersIn('components'), ...foldersIn('primitives')].sort((a, b) =>
  a.name.localeCompare(b.name),
)
const folders = entries.map((e) => e.name).sort()
const baseOf = Object.fromEntries(entries.map((e) => [e.name, e.base]))

/** Default export per subpath — the folder's namesake, else the primary. */
const expectedDefault: Record<string, string> = {
  AppBar: 'TopAppBar',
  ProgressIndicator: 'LinearProgressIndicator',
}

describe('package exports', () => {
  it('keeps the root and styles.css entries unchanged', () => {
    // Per-condition types: a shared `types` would make require() consumers
    // resolve the ESM .d.ts ("masquerading as ESM", #408).
    expect(pkg.exports['.']).toEqual({
      import: { types: './dist/index.d.ts', default: './dist/index.js' },
      require: { types: './dist/index.d.cts', default: './dist/index.cjs' },
    })
    expect(pkg.exports['./styles.css']).toBe('./dist/styles.css')
    expect(pkg.exports['./tokens.css']).toBe('./dist/tokens.css')
    expect(pkg.exports['./package.json']).toBe('./package.json')
  })

  it('exposes the Ripple and FocusRing primitives', () => {
    expect(baseOf.Ripple).toBe('primitives')
    expect(baseOf.FocusRing).toBe('primitives')
  })

  it('exposes one subpath per component / primitive folder', () => {
    const subpaths = Object.keys(pkg.exports)
      .filter((key) => !['.', './styles.css', './tokens.css', './package.json'].includes(key))
      .map((key) => key.slice(2))
      .sort()
    expect(new Set(folders).size).toBe(folders.length)
    expect(subpaths).toEqual(folders)
    expect(Object.keys(pkg.typesVersions['*']).sort()).toEqual(folders)
  })

  it.each(folders)(
    'maps %s to its ESM wrapper and CJS / types modules',
    (name) => {
      const base = baseOf[name]
      expect(pkg.exports[`./${name}`]).toEqual({
        import: {
          types: `./dist/${base}/${name}/index.d.ts`,
          // Bare Node (SSR with externalized deps) cannot import .css files:
          // it gets the CSS-free module; bundlers get the CSS-importing wrapper.
          node: `./dist/${base}/${name}/index.js`,
          default: `./dist/${name}/index.js`,
        },
        require: {
          types: `./dist/${base}/${name}/index.d.cts`,
          default: `./dist/${base}/${name}/index.cjs`,
        },
      })
      expect(pkg.typesVersions['*'][name]).toEqual([
        `./dist/${base}/${name}/index.d.ts`,
      ])
    },
  )

  it('marks the CSS-importing ESM wrappers as side-effectful', () => {
    expect(pkg.sideEffects).toEqual(['**/*.css', './dist/*/index.js'])
  })
})

describe('component default exports', () => {
  it.each(folders)('%s default-exports its primary component', async (name) => {
    const mod = await import(`../${baseOf[name]}/${name}/index.ts`)
    const primary = expectedDefault[name] ?? name
    expect(mod.default).toBeDefined()
    expect(mod.default).toBe(mod[primary])
  })

  it('does not add a default export to the root entry', () => {
    expect('default' in root).toBe(false)
  })
})
