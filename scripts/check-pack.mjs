// Publish guard: every file the package.json `exports` / `main` / `module` /
// `types` / `typesVersions` point at must be in the packed tarball. A stale or
// missing dist/ (v1.4.0 shipped a pre-1.4 build, missing Select, Autocomplete,
// …) fails here instead of on npm. Run after `npm run build`.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
const [packed] = JSON.parse(
  execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], { encoding: 'utf8' }),
)
const files = new Set(packed.files.map((f) => f.path))

const targets = new Set()
const collect = (value) => {
  if (typeof value === 'string') targets.add(value.replace(/^\.\//, ''))
  else if (value && typeof value === 'object') Object.values(value).forEach(collect)
}
collect(pkg.exports)
for (const key of ['main', 'module', 'types']) if (pkg[key]) collect(pkg[key])
collect(pkg.typesVersions)

const missing = [...targets].filter((t) => !t.includes('*') && !files.has(t))
if (missing.length) {
  console.error(`check-pack: ${missing.length} exported file(s) missing from the tarball:`)
  for (const m of missing.slice(0, 50)) console.error(`  ${m}`)
  process.exit(1)
}
console.log(`check-pack: ${targets.size} exported files present (${files.size} files packed)`)
