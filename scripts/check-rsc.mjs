// Build-output check for the React Server Components boundary (#409).
// Run after `npm run build`:  node scripts/check-rsc.mjs
//
// 1. Directives: every dist module (ESM .js + CJS .cjs) built from a source
//    module that starts with 'use client' must start with "use client"; every
//    other module (barrels, pure helpers, *.module.css.js, the CSS-importing
//    ESM wrappers, vendored deps) must not.
// 2. RSC import: imports the root entry and every subpath entry (ESM + CJS)
//    under `--conditions=react-server`, the React build a server component
//    runs against. Node itself ignores 'use client', so a module hook stands
//    in for the RSC bundler (Next.js, react-server-dom-*): a "use client"
//    module is replaced by client references to its exports, exactly as the
//    bundler does. Whatever is left is evaluated for real, so a hook or
//    createContext reachable outside the client boundary fails the check.
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(repo, 'src')
const dist = join(repo, 'dist')
const DIRECTIVE = /^\s*['"]use client['"]/

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
const posix = (path) => path.split('\\').join('/')
const componentNames = readdirSync(join(src, 'components')).filter((name) =>
  existsSync(join(src, 'components', name, 'index.ts')),
)

if (process.argv[2] === '--rsc-child') {
  rscChild(process.argv[3])
} else {
  main()
}

function main() {
  if (!existsSync(join(dist, 'index.js'))) {
    console.error('dist/ not found: run `npm run build` first')
    process.exit(1)
  }
  const errors = []

  // --- 1. directives -------------------------------------------------------
  const clientModules = new Set(
    walk(src)
      .filter((f) => /\.tsx?$/.test(f) && !/\.(test|stories)\./.test(f))
      .filter((f) => DIRECTIVE.test(readFileSync(f, 'utf8')))
      .map((f) => posix(relative(src, f)).replace(/\.tsx?$/, '')),
  )
  const wrappers = new Set(componentNames.map((name) => `${name}/index.js`))
  const seen = new Set()
  for (const file of walk(dist).filter((f) => /\.c?js$/.test(f))) {
    const rel = posix(relative(dist, file))
    const code = readFileSync(file, 'utf8')
    const isClient = !wrappers.has(rel) && clientModules.has(rel.replace(/\.c?js$/, ''))
    if (isClient) seen.add(rel)
    if (isClient && !code.startsWith('"use client";')) {
      errors.push(`${rel}: client module does not start with "use client"`)
    } else if (!isClient && DIRECTIVE.test(code)) {
      errors.push(`${rel}: unexpected "use client" directive`)
    }
  }
  for (const mod of clientModules) {
    for (const ext of ['js', 'cjs']) {
      if (!seen.has(`${mod}.${ext}`)) errors.push(`dist/${mod}.${ext} missing`)
    }
  }
  console.log(
    `directives: ${seen.size} client files, ${clientModules.size} client source modules`,
  )

  // --- 2. RSC import -------------------------------------------------------
  const entries = [
    'index.js',
    'index.cjs',
    ...componentNames.flatMap((name) => [
      `components/${name}/index.js`,
      `components/${name}/index.cjs`,
    ]),
  ]
  for (const entry of entries) {
    try {
      execFileSync(
        process.execPath,
        ['--conditions=react-server', fileURLToPath(import.meta.url), '--rsc-child', entry],
        { cwd: repo, stdio: 'pipe', encoding: 'utf8' },
      )
    } catch (error) {
      const out = `${error.stdout ?? ''}${error.stderr ?? ''}`.trim()
      errors.push(`RSC import of dist/${entry} failed:\n${out}`)
    }
  }
  console.log(`rsc: imported ${entries.length} entries under react-server`)

  if (errors.length) {
    console.error(`\n${errors.join('\n')}`)
    process.exit(1)
  }
  console.log('ok')
}

/** Child process (`--conditions=react-server`): import one dist entry. */
async function rscChild(entry) {
  const distUrl = pathToFileURL(dist).href
  const reference = (url, name) =>
    `Object.defineProperties(function () { throw new Error(${JSON.stringify(
      `client reference ${name} called on the server`,
    )}) }, { $$typeof: { value: Symbol.for('react.client.reference') }, $$id: { value: ${JSON.stringify(
      `${url}#${name}`,
    )} } })`

  registerHooks({
    load(url, context, nextLoad) {
      const result = nextLoad(url, context)
      if (!url.startsWith(distUrl) || result.source == null) return result
      const code = String(result.source)
      if (!code.startsWith('"use client";')) return result
      if (result.format === 'commonjs') {
        const names = [...new Set([...code.matchAll(/exports\.([\w$]+)=/g)].map((m) => m[1]))]
        const body = names.map((n) => `${JSON.stringify(n)}: ${reference(url, n)}`)
        return { ...result, source: `module.exports = { ${body.join(', ')} }` }
      }
      const names = [...code.matchAll(/export\s*\{([^}]*)\}/g)].flatMap((m) =>
        m[1].split(',').map((s) => s.trim().split(/\s+as\s+/).pop()).filter(Boolean),
      )
      const source = names
        .map((n) =>
          n === 'default'
            ? `export default ${reference(url, n)}`
            : `export const ${n} = ${reference(url, n)}`,
        )
        .join('\n')
      return { ...result, source }
    },
  })

  const url = pathToFileURL(join(dist, entry)).href
  const mod = entry.endsWith('.cjs')
    ? (await import('node:module')).createRequire(import.meta.url)(fileURLToPath(url))
    : await import(url)
  if (entry.startsWith('index.')) {
    // Server-safe exports run for real; client components are references.
    const isRef = (v) => v?.$$typeof === Symbol.for('react.client.reference')
    if (!isRef(mod.Button)) throw new Error('Button is not a client reference')
    if (isRef(mod.Divider) || isRef(mod.Badge)) {
      throw new Error('Divider / Badge should be server components')
    }
    const scheme = mod.generateColorScheme({
      seedColor: '#6750A4',
      mode: 'light',
    })
    if (!mod.schemeToCssVars(scheme)['--md-sys-color-primary']) {
      throw new Error('generateColorScheme / schemeToCssVars failed')
    }
  }
}
