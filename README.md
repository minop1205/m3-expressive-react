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

## Components

Buttons & actions — `Button`, `IconButton`, `ButtonGroup`, `SplitButton`,
`SegmentedButton`, `Fab`, `FabMenu`, `Chip`

Selection & input — `Checkbox`, `Radio` / `RadioGroup`, `Switch`, `Slider`,
`TextField`, `SearchBar`, `DatePicker`, `TimePicker`

Navigation — `AppBar`, `Toolbar`, `NavigationBar`, `NavigationRail`,
`NavigationDrawer`, `Tabs`, `Menu`

Containment & communication — `Card`, `List`, `Carousel`, `Dialog`,
`BottomSheet`, `SideSheet`, `Snackbar`, `Tooltip`, `Badge`, `Divider`,
`ProgressIndicator`, `LoadingIndicator`, `SwipeToDismiss`

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

## Icons

The library is **icon-agnostic**: every icon prop (`icon`, `startIcon`,
`endIcon`, …) takes a `ReactNode`, so any icon set works — nothing is
bundled. For MD3 we recommend
[Material Symbols](https://fonts.google.com/icons), e.g. with the SVG
package + [`vite-plugin-svgr`](https://github.com/pd4d10/vite-plugin-svgr):

```tsx
import Search from '@material-symbols/svg-400/outlined/search.svg?react'
import { IconButton } from 'm3-expressive-react'

;<IconButton icon={<Search />} aria-label="Search" />
```

Icons inherit color via `currentColor` and are sized by the component.

## Spec fidelity

Components are implemented against **m3.material.io** (design source of
truth) and **Jetpack Compose `androidx.compose.material3`** (behavior,
defaults, motion — exact values read from the AndroidX sources), with
adjudicated spec sheets and audit reports in [`docs/`](docs/). Interaction
states use the current MD3 values (hover 0.08 / focus 0.10 / pressed 0.10
state layers), and motion approximates Compose's spring specs.

## Migrating from 0.x

See [docs/migration-v1.md](docs/migration-v1.md) for the complete v1
breaking-change guide with before/after tables and a checklist.

## Development

```bash
npm install
npm run dev      # Storybook
npm test         # Vitest (+ Testing Library + axe)
npm run build    # library build (dist/)
npm run vrt      # visual regression (see CLAUDE.md for baseline rules)
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
| Docs/dev| Storybook |
| Tests   | Vitest + Testing Library + axe; Playwright visual regression |

## License

[MIT](LICENSE)
