/**
 * Library build helpers for the per-component subpath entries
 * (`import Button from 'm3-expressive-react/Button'`, #378).
 *
 * The library is built with `preserveModules`, so every source module (and
 * every shared helper: primitives, internal hooks, theme, tokens) is emitted
 * exactly once and shared by the root entry and all subpath entries. On top
 * of that output this plugin:
 *
 * 1. Renames the per-module CSS assets (`Button.module.css` → `Button.css`).
 *    The emitted CSS is already compiled (hashed class names); keeping the
 *    `.module.css` suffix would make consumer bundlers (Vite, Next.js) run it
 *    through CSS Modules a second time and re-hash the class names.
 * 2. Emits `styles.css` (every rule, same order as the former single-bundle
 *    build) and `tokens.css` (`src/styles/tokens.css` + `typescale.css`).
 * 3. Emits one thin ESM wrapper per component folder, `<Component>/index.js`,
 *    that imports the CSS of the component's module graph (shared primitives
 *    first, then the component) and re-exports `components/<Component>/`.
 *    The CSS lives only in these wrappers, so the root entry stays CSS-free
 *    exactly as before. The `require` / `types` conditions point straight
 *    at `components/<Component>/index.{cjs,d.ts,d.cts}` (no CSS, so plain
 *    Node and Jest can `require()` any subpath).
 *
 * Inert outside `vite build` in library mode (Storybook and Vitest load the
 * same vite.config.ts).
 */
import { existsSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import type { Plugin } from 'vite'

/** Component folders under `src/components/` — one subpath entry each. */
export function componentFolders(srcDir: string): string[] {
  const dir = join(srcDir, 'components')
  return readdirSync(dir)
    .filter(
      (name) =>
        statSync(join(dir, name)).isDirectory() &&
        existsSync(join(dir, name, 'index.ts')),
    )
    .sort()
}

/** Lib entries: the root barrel plus every component folder's barrel. */
export function libEntries(srcDir: string): Record<string, string> {
  return {
    index: join(srcDir, 'index.ts'),
    ...Object.fromEntries(
      componentFolders(srcDir).map((name) => [
        `components/${name}/index`,
        join(srcDir, 'components', name, 'index.ts'),
      ]),
    ),
  }
}

/** `preserveModules` file name; bundled deps leave `node_modules/` (npm drops it). */
export function moduleFileName(format: string, name: string): string {
  const base = name.replace(/^node_modules\//, 'vendor/')
  return `${base}.${format === 'es' ? 'js' : 'cjs'}`
}

const cssFileName = (asset: string) => asset.replace(/\.module\.css$/, '.css')

const rel = (fromDir: string, to: string) => {
  const r = relative(fromDir, to).split('\\').join('/')
  return r.startsWith('.') ? r : `./${r}`
}

export function subpathEntries({ srcDir }: { srcDir: string }): Plugin {
  let enabled = false
  return {
    name: 'm3:subpath-entries',
    enforce: 'post',
    configResolved(config) {
      enabled = config.command === 'build' && !!config.build.lib
    },
    generateBundle(output, bundle) {
      if (!enabled) return
      const esm = output.format === 'es'

      // Pull every CSS asset out of the bundle; re-emitted below under its
      // final name.
      const css = new Map<string, string>()
      for (const [fileName, item] of Object.entries(bundle)) {
        if (item.type !== 'asset' || !fileName.endsWith('.css')) continue
        css.set(
          fileName,
          typeof item.source === 'string'
            ? item.source
            : new TextDecoder().decode(item.source),
        )
        delete bundle[fileName]
      }

      // `composes: ring from '…/FocusRing.module.css'` makes postcss-modules
      // inline the composed file at the top of the composing file's CSS. The
      // single-file build deduplicated it; per-module files must too, so strip
      // the inlined copy and record the composed file as a CSS dependency.
      const cssDeps = new Map<string, string[]>()
      for (const [file, code] of css) {
        for (const [other, otherCode] of css) {
          const prefix = otherCode.trimEnd()
          if (other === file || !prefix || !code.startsWith(prefix)) continue
          css.set(file, code.slice(prefix.length).trimStart())
          cssDeps.set(file, [...(cssDeps.get(file) ?? []), other])
          break
        }
      }

      const chunks = Object.values(bundle).flatMap((item) =>
        item.type === 'chunk' ? [item] : [],
      )

      // Vite blanks pure-CSS `require()`s in CJS output with a comment, but
      // two in one comma sequence (src/index.ts imports tokens.css then
      // typescale.css) come out as `…),/* empty css */;/* empty css */…` —
      // a syntax error. Swap the dangling comma for `;` (same length, so the
      // source map stays valid).
      if (!esm) {
        for (const chunk of chunks) {
          chunk.code = chunk.code.replace(
            /,(\/\* empty css +\*\/)(?=;)/g,
            ';$1',
          )
        }
      }
      const entryFor = (moduleId: string) => {
        const chunk = chunks.find(
          (c) => c.isEntry && c.facadeModuleId === moduleId,
        )
        if (!chunk) this.error(`no entry chunk for ${moduleId}`)
        return chunk
      }

      // CSS assets of a module's static import graph in evaluation order
      // (depth-first post-order over the *source* imports) — the order the
      // former single-file build concatenated them in, and the order the
      // ESM wrappers import them (shared primitives before components).
      const cssClosure = (startId: string): string[] => {
        const seen = new Set<string>()
        const out: string[] = []
        const add = (file: string) => {
          if (out.includes(file)) return
          for (const dep of cssDeps.get(file) ?? []) add(dep)
          out.push(file)
        }
        const visit = (id: string) => {
          if (seen.has(id)) return
          seen.add(id)
          const info = this.getModuleInfo(id)
          if (!info) return
          for (const imported of info.importedIds) visit(imported)
          const file = id.split('?')[0]
          if (file.endsWith('.css') && file.startsWith(srcDir)) {
            const asset = relative(srcDir, file).split('\\').join('/')
            if (!css.has(asset)) this.error(`no CSS asset emitted for ${file}`)
            add(asset)
          }
        }
        visit(startId)
        return out
      }

      const rootId = join(srcDir, 'index.ts')
      entryFor(rootId)
      const all = cssClosure(rootId)
      const missing = [...css.keys()].filter((file) => !all.includes(file))
      if (missing.length) {
        this.error(
          `CSS not reachable from the root entry: ${missing.join(', ')}`,
        )
      }
      const isToken = (file: string) => file.startsWith('styles/')
      const join_ = (files: string[]) =>
        files.map((file) => css.get(file)!.trimEnd()).join('\n') + '\n'

      this.emitFile({
        type: 'asset',
        fileName: 'styles.css',
        source: join_(all),
      })
      this.emitFile({
        type: 'asset',
        fileName: 'tokens.css',
        source: join_(all.filter(isToken)),
      })
      for (const file of all) {
        if (isToken(file)) continue
        this.emitFile({
          type: 'asset',
          fileName: cssFileName(file),
          source: css.get(file)!,
        })
      }

      // The CJS build needs no wrapper: `require` resolves straight to
      // components/<Name>/index.cjs (CSS-free, so plain Node / Jest work).
      if (!esm) return
      for (const name of componentFolders(srcDir)) {
        const entryId = join(srcDir, 'components', name, 'index.ts')
        const target = JSON.stringify(rel(name, entryFor(entryId).fileName))
        const source = [
          ...cssClosure(entryId)
            .filter((file) => !isToken(file))
            .map(
              (file) =>
                `import ${JSON.stringify(rel(name, cssFileName(file)))};`,
            ),
          `export * from ${target};`,
          `export { default } from ${target};`,
          '',
        ].join('\n')
        this.emitFile({ type: 'asset', fileName: `${name}/index.js`, source })
      }
    },
  }
}

/**
 * vite-plugin-dts `beforeWriteFile` hook: the declarations are emitted per
 * file, and under `moduleResolution: node16 | nodenext` an ESM `.d.ts` must
 * use fully specified relative imports. Rewrites `'./Button'` →
 * `'./Button.js'` and `'./components'` → `'./components/index.js'` by
 * resolving each specifier against the source tree.
 */
export function addDeclarationExtensions(srcDir: string, outDir: string) {
  return (filePath: string, content: string) => {
    if (!filePath.endsWith('.d.ts')) return
    const sourceDir = dirname(resolve(srcDir, relative(outDir, filePath)))
    const fix = (specifier: string) => {
      if (/\.(c|m)?js$/.test(specifier)) return specifier
      const base = resolve(sourceDir, specifier)
      if (['.ts', '.tsx'].some((e) => existsSync(base + e)))
        return `${specifier}.js`
      if (['index.ts', 'index.tsx'].some((e) => existsSync(join(base, e)))) {
        return `${specifier}/index.js`
      }
      return specifier
    }
    return {
      content: content.replace(
        /((?:from|import)\s*\(?\s*)(['"])(\.{1,2}\/[^'"]*)\2/g,
        (_, prefix: string, quote: string, specifier: string) =>
          `${prefix}${quote}${fix(specifier)}${quote}`,
      ),
    }
  }
}
