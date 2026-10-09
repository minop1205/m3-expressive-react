# m3-expressive-react

Material Design 3 (**Expressive**) component library for React.

Token-first and spec-driven: every component reads from MD3 design tokens
(`--md-sys-*` CSS custom properties), color is generated at runtime from a
seed via Dynamic Color, and behavior is built on native elements with
hand-rolled, APG-compliant interaction patterns — no external a11y framework.

The public API is deliberately **MUI-idiomatic** (one component per MD3
component selected by `variant`, `onChange(event, value)`,
`startIcon`/`endIcon`, controlled/uncontrolled pairs), while appearance,
defaults, and behavior follow the MD3 spec and Jetpack Compose `material3`.

**Documentation:** [minop1205.github.io/m3-expressive-react](https://minop1205.github.io/m3-expressive-react/) —
guides, live demos, and generated prop tables.

## Install

```bash
npm install m3-expressive-react
```

Requires React 18 or 19.

## Quick start

```tsx
import { ThemeProvider, Button } from 'm3-expressive-react'
import 'm3-expressive-react/styles.css'

export function App() {
  return (
    <ThemeProvider seedColor="#6750A4" mode="light">
      <Button variant="filled" onClick={() => console.log('clicked')}>
        Hello MD3
      </Button>
    </ThemeProvider>
  )
}
```

> **The `styles.css` import is required** — it carries the design tokens
> (shape, motion, state, typescale) every component references. Components
> intentionally ship without per-value fallbacks; colors come from
> `ThemeProvider`, which generates the full MD3 color-role map (light/dark)
> from your seed color.

> **CSS minifiers**: the styles use modern CSS such as `@starting-style`
> (popup entry transitions). cssnano and Lightning CSS handle it; **clean-css
> does not** — it drops the rules inside `@starting-style` and corrupts the
> rules that follow. If your build minifies CSS with clean-css (e.g.
> Docusaurus' default minimizer — set `USE_SIMPLE_CSS_MINIFIER=true`),
> switch to cssnano or Lightning CSS.

### Next.js App Router

Interactive components (and `ThemeProvider`) ship with a `'use client'`
directive, so you can import them straight into Server Components such as
`app/layout.tsx` / `app/page.tsx` — no wrapper file needed. The usual React
Server Components rule applies: event handlers (`onClick`, `onChange`, …)
can't be passed from a Server Component, so put interactive markup in your
own `'use client'` component. Presentational `Badge` / `Divider` and the pure
helpers (`generateColorScheme`, `schemeToCssVars`, `schemeToCssText`, motion
tokens) stay server-safe.

```tsx
// app/layout.tsx (Server Component)
import { ThemeProvider } from 'm3-expressive-react'
import 'm3-expressive-react/styles.css'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider seedColor="#6750A4" mode="light">
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

## Per-component imports

Every component folder is also its own entry point with a **default
export**, so you can import MUI-style and load only the CSS you use:

```tsx
import 'm3-expressive-react/tokens.css' // once, at the app root
import { ThemeProvider } from 'm3-expressive-react'
import Button from 'm3-expressive-react/Button'
import Radio, { RadioGroup } from 'm3-expressive-react/Radio'
import type { ButtonProps } from 'm3-expressive-react/Button'
```

- **Default export** = the component the folder is named after
  (`Button`, `Radio`, `Chip`, `Card`, `Menu`, `Snackbar`, …). Two folders
  have no namesake: `AppBar` → `TopAppBar`, `ProgressIndicator` →
  `LinearProgressIndicator`. Every named export and type of the folder
  (`RadioGroup`, `ChipSet`, `MenuItem`, `SnackbarProvider`,
  `BottomAppBar`, `CircularProgressIndicator`, …) is available from the same
  subpath.
- **CSS loads automatically**: a subpath module imports its own CSS (plus
  the shared Ripple / FocusRing styles), so your bundler — Vite, webpack 5
  with `css-loader`, Next.js app and pages router — ships only the styles of
  the components you import. The design tokens stay global: import
  `tokens.css` once instead of `styles.css`.
- **Root and subpath imports can be mixed** — they share the same modules
  (one `RadioGroup` context, one `ThemeProvider`). The root entry is
  unchanged and still tree-shaken.

| You import components from…           | Import this CSS once                                  |
| ------------------------------------- | ----------------------------------------------------- |
| `m3-expressive-react` (root)          | `m3-expressive-react/styles.css` (every component)    |
| `m3-expressive-react/<Component>`     | `m3-expressive-react/tokens.css` (tokens + typescale) |

Notes:

- Don't combine `styles.css` with subpath imports: the subpath CSS would be
  loaded a second time (bigger CSS, and the repeated rules can reorder the
  cascade). Pick one setup.
- Environments without CSS imports get CSS-free modules: `require()` (CJS,
  Jest) and server-side Node `import` (the `node` export condition — e.g. SSR
  with externalized dependencies) never touch a `.css` file; the client
  bundle carries the styles. If your bundler cannot import CSS at all, use
  the root entry with `styles.css`.
- Types resolve with TypeScript `moduleResolution` `bundler`, `node16`,
  `nodenext` and legacy `node`.

## Components

Buttons & actions — `Button`, `IconButton`, `ButtonGroup`, `SplitButton`,
`SegmentedButton`, `Fab`, `FabMenu`, `Chip` / `ChipSet`

Selection & input — `Checkbox`, `Radio` / `RadioGroup`, `Switch`, `Slider`,
`TextField`, `SearchBar`, `DatePicker`, `TimePicker`

Navigation — `AppBar`, `Toolbar`, `NavigationBar`, `NavigationRail`,
`NavigationDrawer`, `Tabs`, `Menu`

Containment & communication — `Card`, `List`, `Carousel`, `Dialog`,
`BottomSheet`, `SideSheet`, `Snackbar`, `Tooltip`, `Badge`, `Divider`,
`ProgressIndicator`, `LoadingIndicator`, `SwipeToDismiss`

See the [components page](https://minop1205.github.io/m3-expressive-react/components) of the docs site for live demos
and prop tables.

## Theming

```
Reference tokens  →  System tokens (--md-sys-*)  →  Component tokens (--_*)
```

- **Static foundations** (type scale, shape, elevation, motion, state-layer
  opacities) ship in `styles.css` as CSS custom properties.
- **Color** is dynamic: `ThemeProvider` uses
  `@material/material-color-utilities` to derive every `--md-sys-color-*`
  role from `seedColor`, for `mode="light" | "dark"`.
- Focus rings and ripples expose small `--md-focus-ring-*` / `--md-ripple-*`
  contract variables for tuning.

More in the [theming guide](https://minop1205.github.io/m3-expressive-react/theming).

## Icons

The library ships no icons: every icon prop (`icon`, `startIcon`,
`selectedIcon`, …) takes a `ReactNode`, sized and colored by the component.
We recommend [Material Symbols](https://fonts.google.com/icons) as SVG
components (`@material-symbols/svg-400` + SVGR):

```tsx
import Search from '@material-symbols/svg-400/outlined/search.svg?react'

<IconButton icon={<Search />} aria-label="Search" />
```

This needs a bundler plugin and a TypeScript declaration. See the
[Icons guide](https://minop1205.github.io/m3-expressive-react/icons) for
step-by-step Vite and Next.js setup, plus notes on icon fonts and other
icon libraries.

## Spec fidelity

Components are implemented against **m3.material.io** (design source of
truth) and **Jetpack Compose `androidx.compose.material3`** (behavior,
defaults, motion — exact values read from the AndroidX sources), with
adjudicated spec sheets and audit reports in [`docs/`](docs/). Interaction
states use the current MD3 values (hover 0.08 / focus 0.10 / pressed 0.10
state layers), and motion approximates Compose's spring specs.

## Migrating from 0.x

See the [migration guide](https://minop1205.github.io/m3-expressive-react/migration-v1)
([docs/migration-v1.md](docs/migration-v1.md)) for the complete v1
breaking-change guide with before/after tables and a checklist.

## Development

```bash
npm install
npm run dev      # Storybook
npm test         # Vitest (+ Testing Library + axe)
npm run build    # library build (dist/)
npm run vrt      # visual regression (see CLAUDE.md for baseline rules)
```

The docs site lives in [`site/`](site/) (Docusaurus) and deploys to GitHub
Pages from `main` — releases, plus docs-only hotfixes (see
[CONTRIBUTING.md](CONTRIBUTING.md#documentation-site)):

```bash
cd site && npm install && npm start
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines. This project uses
[Conventional Commits](https://www.conventionalcommits.org/).

## Tech stack

| Concern | Choice |
| ------- | ------ |
| Build   | Vite (library mode) + TypeScript |
| Styling | CSS Modules + CSS custom properties (design tokens) |
| A11y    | Native elements + hand-rolled APG patterns; axe-tested |
| Color   | @material/material-color-utilities (Dynamic Color) |
| Docs/dev| Storybook; Docusaurus docs site |
| Tests   | Vitest + Testing Library + axe; Playwright visual regression |

## License

[MIT](LICENSE)
