# md3-react

Material Design 3 (Expressive) component library for React.

Token-first and spec-driven: every component reads from MD3 design tokens
(`--md-sys-*` CSS custom properties), color is generated at runtime from a seed
via Dynamic Color, and accessibility/interaction is built on `react-aria`.

> Status: **foundation milestone**. Tokens, theming, and shared interaction
> primitives are in place; components are built on top of this base next.

## Architecture

```
Reference tokens  →  System tokens (--md-sys-*)  →  Component tokens (--md-comp-*)
```

- **Static foundations** (type scale, shape, elevation, motion, state-layer
  opacities) ship as CSS custom properties in `src/styles/tokens.css`.
- **Color** is dynamic: `ThemeProvider` generates a full MD3 color-role map from
  a seed color (`@material/material-color-utilities`) for light/dark and exposes
  it as `--md-sys-color-*` variables.
- **Interaction primitives** (`Ripple`, `FocusRing`) implement the MD3 state
  layer, press ripple, and focus ring, driven entirely by tokens.

The authoritative token values live in [`docs/md3-token-reference.md`](docs/md3-token-reference.md).

## Usage

```tsx
import { ThemeProvider } from 'md3-react'
import 'md3-react/styles.css'

export function App() {
  return (
    <ThemeProvider seedColor="#6750A4" mode="light">
      {/* components */}
    </ThemeProvider>
  )
}
```

## Icons

The library is **icon-agnostic**: every icon prop (`icon`, `startIcon`,
`endIcon`, …) takes a `ReactNode`, so you pass icons from whatever icon set you
like — no icon package is bundled or required.

For Material Design 3 we recommend **[Material Symbols](https://fonts.google.com/icons)**.
Using the SVG package + [`vite-plugin-svgr`](https://github.com/pd4d10/vite-plugin-svgr):

```tsx
import Search from '@material-symbols/svg-400/outlined/search.svg?react'
import { IconButton } from 'md3-react'

;<IconButton icon={<Search />} aria-label="Search" />
```

Icons inherit color via `currentColor` and are sized by the component. This
repo's Storybook stories use Material Symbols the same way.

## Development

```bash
npm install
npm run dev      # Storybook
npm test         # Vitest
npm run build    # library build (dist/)
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.
This project uses [Conventional Commits](https://www.conventionalcommits.org/).

## Tech stack

| Concern    | Choice                                       |
| ---------- | -------------------------------------------- |
| Build      | Vite library mode + TypeScript               |
| Styling    | CSS Modules + CSS custom properties (tokens) |
| A11y       | react-aria                                   |
| Color      | @material/material-color-utilities           |
| Docs/dev   | Storybook (+ a11y addon)                     |
| Tests      | Vitest + Testing Library + axe               |
