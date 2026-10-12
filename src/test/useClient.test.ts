/**
 * Guards the React Server Components boundary (#409): a source module that
 * uses React hooks or createContext — or imports a module that does — must
 * start with 'use client'; everything else (pure helpers, `index.ts`
 * barrels) must stay directive-free so server code can import it.
 * The built output is checked by `npm run check:rsc` (scripts/check-rsc.mjs).
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const src = resolve(__dirname, '..')

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })

const modules = walk(src)
  .filter(
    (file) =>
      /\.tsx?$/.test(file) &&
      !/\.(test|stories)\.tsx?$/.test(file) &&
      !file.endsWith('.d.ts') &&
      !file.startsWith(join(src, 'test')),
  )
  .sort()

const rel = (file: string) => relative(src, file).split('\\').join('/')
const source = (file: string) => readFileSync(file, 'utf8')
const isBarrel = (file: string) => /(^|\/)index\.ts$/.test(rel(file))

/** `'use client'` as the first statement (no comment or code before it). */
const hasDirective = (file: string) => /^'use client'\n/.test(source(file))
const mentionsDirective = (file: string) =>
  /^\s*['"]use client['"]/m.test(source(file))

const IMPORT = /import\s+(type\s+)?([^'"]*?)\s*from\s*['"]([^'"]+)['"]/g
const CLIENT_API = /^(use[A-Z]\w*|createContext)$/

/** React client APIs a module value-imports, and its local value imports. */
function analyze(file: string) {
  const reactApis: string[] = []
  const localImports: string[] = []
  for (const [, typeOnly, clause, specifier] of source(file).matchAll(IMPORT)) {
    if (typeOnly) continue
    const named = (clause.match(/\{([^}]*)\}/)?.[1] ?? '')
      .split(',')
      .map((name) => name.trim())
      .filter((name) => name && !name.startsWith('type '))
    if (specifier === 'react') {
      reactApis.push(...named.filter((name) => CLIENT_API.test(name)))
      if (/^\s*\*\s+as\s/.test(clause) || /^\s*[A-Za-z_$]/.test(clause)) {
        // `import React from 'react'` / `import * as React`: look for usages.
        reactApis.push(
          ...(source(file).match(/\bReact\.(use[A-Z]\w*|createContext)\b/g) ??
            []),
        )
      }
    } else if (specifier.startsWith('.')) {
      const hasValue = named.length > 0 || /^\s*[A-Za-z_$*]/.test(clause)
      if (!hasValue) continue
      const base = resolve(dirname(file), specifier)
      const target = [`${base}.ts`, `${base}.tsx`, join(base, 'index.ts')].find(
        existsSync,
      )
      if (target) localImports.push(target)
    }
  }
  return { reactApis, localImports }
}

const analysis = new Map(modules.map((file) => [file, analyze(file)]))
const memo = new Map<string, boolean>()
/** Needs 'use client': uses a client API or imports a module that does. */
function needsClient(file: string): boolean {
  if (memo.has(file)) return memo.get(file)!
  memo.set(file, false) // cycle guard
  const info = analysis.get(file)
  const result =
    !!info &&
    !isBarrel(file) &&
    (info.reactApis.length > 0 || info.localImports.some(needsClient))
  memo.set(file, result)
  return result
}

const clientModules = modules.filter(needsClient)
const serverModules = modules.filter((file) => !needsClient(file))

describe("'use client' directives", () => {
  it.each(clientModules.map(rel))(
    '%s starts with the directive',
    (file) => {
      expect(hasDirective(join(src, file))).toBe(true)
    },
  )

  it.each(serverModules.map(rel))('%s stays directive-free', (file) => {
    expect(mentionsDirective(join(src, file))).toBe(false)
  })

  it('classifies the known client and server-safe modules', () => {
    const client = clientModules.map(rel)
    const server = serverModules.map(rel)
    expect(client).toEqual(
      expect.arrayContaining([
        'primitives/Ripple/Ripple.tsx',
        'primitives/FocusRing/FocusRing.tsx',
        'theme/ThemeProvider.tsx',
        'internal/useModal.ts',
        'internal/usePopupPosition.ts',
        'internal/useScrollObserver.ts',
        'components/Button/Button.tsx',
        'components/ButtonGroup/ButtonGroupContext.ts',
        'components/Chip/ChipSetContext.ts',
        'components/List/ListContext.ts',
        'components/NavigationRail/NavigationRailContext.ts',
        'components/Radio/RadioGroup.tsx',
        'components/Snackbar/SnackbarProvider.tsx',
      ]),
    )
    expect(server).toEqual(
      expect.arrayContaining([
        'index.ts',
        'components/index.ts',
        'components/Button/index.ts',
        'components/Badge/Badge.tsx',
        'components/Divider/Divider.tsx',
        'components/Carousel/keylines.ts',
        'components/DatePicker/dateUtils.ts',
        'theme/colorScheme.ts',
        'theme/motionScheme.ts',
        'tokens/motion.ts',
        'internal/spring.ts',
        'internal/cubicBezier.ts',
      ]),
    )
    // Every component module is a client module except the presentational
    // Badge and Divider.
    const componentModules = client
      .concat(server)
      .filter((file) => /^components\/[^/]+\/[A-Z]\w*\.tsx$/.test(file))
    expect(
      componentModules.filter((file) => !client.includes(file)).sort(),
    ).toEqual(['components/Badge/Badge.tsx', 'components/Divider/Divider.tsx'])
  })
})
