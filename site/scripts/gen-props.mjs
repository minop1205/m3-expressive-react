// Generates src/props/props.json from the library's TypeScript sources via
// react-docgen-typescript, so <PropsTable> pages never hand-write prop docs.
// Runs automatically before `npm start` / `npm run build` (pre-scripts).
import { writeFileSync, mkdirSync, readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { withCustomConfig } from 'react-docgen-typescript'

const here = dirname(fileURLToPath(import.meta.url))
const libRoot = resolve(here, '..', '..')
const componentsDir = join(libRoot, 'src', 'components')

const parser = withCustomConfig(join(libRoot, 'tsconfig.json'), {
  shouldExtractLiteralValuesFromEnum: true,
  shouldRemoveUndefinedFromOptional: true,
  savePropValueAsString: true,
  // Keep tables signal-dense: drop the hundreds of inherited DOM props and
  // keep the component's own API (declared in our source).
  propFilter: (prop) =>
    prop.parent == null || !prop.parent.fileName.includes('node_modules'),
})

const files = []
for (const dir of readdirSync(componentsDir)) {
  const d = join(componentsDir, dir)
  if (!existsSync(join(d, 'index.ts'))) continue
  for (const f of readdirSync(d)) {
    if (/^[A-Z].*\.tsx$/.test(f) && !/\.(test|stories)\./.test(f)) {
      files.push(join(d, f))
    }
  }
}

// Member order of string-literal aliases as declared in source
// (`type ButtonVariant = 'elevated' | 'filled' | …`): the checker returns
// union members in its internal order, which reads as arbitrary in a table.
const aliasMembers = new Map()
const aliasRe = /\btype\s+(\w+)\s*=((?:\s*\|?\s*'[^'\n]*')+)/g
const scan = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) scan(p)
    else if (/\.tsx?$/.test(e.name) && !/\.(test|stories)\./.test(e.name)) {
      for (const [, name, body] of readFileSync(p, 'utf8').matchAll(aliasRe)) {
        aliasMembers.set(name, [...body.matchAll(/'([^']*)'/g)].map((m) => `"${m[1]}"`))
      }
    }
  }
}
scan(join(libRoot, 'src'))

// String-literal unions come back as `enum` (shouldExtractLiteralValuesFromEnum)
// with the members in `value` — spell them out (`"filled" | "outlined"`) so
// the table shows the accepted values instead of the bare word "enum".
const typeName = (type) => {
  if (type?.name !== 'enum' || !Array.isArray(type.value) || !type.value.length) {
    return type?.name ?? ''
  }
  const members = type.value.map((v) => v.value)
  const declared = aliasMembers.get(type.raw)
  const sameSet =
    declared?.length === members.length && declared.every((m) => members.includes(m))
  return (sameSet ? declared : members).join(' | ')
}

const out = {}
for (const doc of parser.parse(files)) {
  if (!doc.displayName || !Object.keys(doc.props).length) continue
  out[doc.displayName] = {
    description: doc.description || '',
    props: Object.values(doc.props)
      .map((p) => ({
        name: p.name,
        type: typeName(p.type),
        required: !!p.required,
        defaultValue: p.defaultValue?.value ?? null,
        description: p.description || '',
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  }
}

mkdirSync(join(here, '..', 'src', 'props'), { recursive: true })
writeFileSync(
  join(here, '..', 'src', 'props', 'props.json'),
  JSON.stringify(out, null, 1),
)
console.log(`gen-props: ${Object.keys(out).length} components documented`)
