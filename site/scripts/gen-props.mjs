// Generates src/props/props.json from the library's TypeScript sources via
// react-docgen-typescript, so <PropsTable> pages never hand-write prop docs.
// Runs automatically before `npm start` / `npm run build` (pre-scripts).
import { writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs'
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

const out = {}
for (const doc of parser.parse(files)) {
  if (!doc.displayName || !Object.keys(doc.props).length) continue
  out[doc.displayName] = {
    description: doc.description || '',
    props: Object.values(doc.props)
      .map((p) => ({
        name: p.name,
        type: p.type?.name ?? '',
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
