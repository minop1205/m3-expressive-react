/**
 * Guards the per-component subpath entries (#378): every folder under
 * src/components/ must be exposed as `m3-expressive-react/<Folder>` with a
 * default export, and the root entry must keep its exact shape.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import * as root from '../index'

const repo = resolve(__dirname, '../..')
const pkg = JSON.parse(readFileSync(resolve(repo, 'package.json'), 'utf8'))
const componentsDir = resolve(repo, 'src/components')
const folders = readdirSync(componentsDir)
  .filter((name) => existsSync(resolve(componentsDir, name, 'index.ts')))
  .sort()

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

  it('exposes one subpath per component folder', () => {
    const subpaths = Object.keys(pkg.exports)
      .filter((key) => !['.', './styles.css', './tokens.css', './package.json'].includes(key))
      .map((key) => key.slice(2))
      .sort()
    expect(subpaths).toEqual(folders)
    expect(Object.keys(pkg.typesVersions['*']).sort()).toEqual(folders)
  })

  it.each(folders)(
    'maps %s to its ESM wrapper and CJS / types modules',
    (name) => {
      expect(pkg.exports[`./${name}`]).toEqual({
        import: {
          types: `./dist/components/${name}/index.d.ts`,
          // Bare Node (SSR with externalized deps) cannot import .css files:
          // it gets the CSS-free module; bundlers get the CSS-importing wrapper.
          node: `./dist/components/${name}/index.js`,
          default: `./dist/${name}/index.js`,
        },
        require: {
          types: `./dist/components/${name}/index.d.cts`,
          default: `./dist/components/${name}/index.cjs`,
        },
      })
      expect(pkg.typesVersions['*'][name]).toEqual([
        `./dist/components/${name}/index.d.ts`,
      ])
    },
  )

  it('marks the CSS-importing ESM wrappers as side-effectful', () => {
    expect(pkg.sideEffects).toEqual(['**/*.css', './dist/*/index.js'])
  })
})

describe('component default exports', () => {
  it.each(folders)('%s default-exports its primary component', async (name) => {
    const mod = await import(`../components/${name}/index.ts`)
    const primary = expectedDefault[name] ?? name
    expect(mod.default).toBeDefined()
    expect(mod.default).toBe(mod[primary])
  })

  it('does not add a default export to the root entry', () => {
    expect('default' in root).toBe(false)
  })
})
