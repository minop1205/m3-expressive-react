# CLAUDE.md — Project Instructions for Claude Code

This file is loaded automatically by Claude Code. It defines the rules and
conventions that every contributor (human or AI) must follow.

## Spec Priority

1. **m3.material.io** — the highest-priority source of truth for MD3 design specs
2. **Jetpack Compose — `androidx.compose.material3`** — the primary reference for
   component hierarchy, implementation details, defaults, and which components /
   variants exist. See [Referencing Jetpack Compose](#referencing-jetpack-compose).
   (https://developer.android.com/reference/kotlin/androidx/compose/material3/package-summary)
3. **material-web** (https://material-web.dev) — the official MD3 web implementation,
   but currently in maintenance mode and without Expressive support. Use it only as a
   secondary reference when polishing a Compose-based implementation.
4. When specs conflict, follow the higher-priority source.

### Verifying specs with Playwright MCP

m3.material.io is a SPA — `WebFetch` returns only CSS/JS, not rendered content.
Use the Playwright MCP tools (configured in `.mcp.json`) to verify specs:

```
browser_navigate → https://m3.material.io/components/{component}/specs
browser_run_code_unsafe → extract page.evaluate(() => document.body.innerText)
```

### Referencing Jetpack Compose

Component hierarchy, implementation details, defaults, tokens, and which
components / variants exist are taken first from Compose.

- API / behavior overview: the
  [`androidx.compose.material3` package summary](https://developer.android.com/reference/kotlin/androidx/compose/material3/package-summary).
- Source of truth for exact defaults, constants, easing, and token mappings: the
  AndroidX source on GitHub, `androidx-main` branch, under
  `compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/`
  (component `.kt` files and the `tokens/` objects such as `FilledButtonTokens`,
  `SwitchTokens`, `MotionTokens`). Fetch the raw `.kt` files to read precise
  values rather than relying on memory.

### Known spec differences

| Token / property               | m3.material.io / spec      | Compose (`androidx.compose.material3`) |
| ------------------------------ | -------------------------- | -------------------------------------- |
| Outlined variant border color  | `outline-variant`          | `outline` (material-web)               |
| State-layer opacity (focus)    | `0.12`                     | `0.10` (`StateTokens.FocusStateLayerOpacity`) |
| State-layer opacity (pressed)  | `0.12`                     | `0.10` (`StateTokens.PressedStateLayerOpacity`) |

We follow the Compose values: hover `0.08` / focus `0.10` / pressed `0.10` /
dragged `0.16`. The outlined-border-color row applies to Button, IconButton, and
likely other outlined components.

## API Design Policy

This library targets **Web / React application developers (MUI users)**. Compose is
the reference for *what* to build, but the *public API* is Web-idiomatic.

- **Single component per MD3 component, selected by a `variant` prop** (MUI-style) —
  e.g. `<Button variant="outlined">`, `<Chip variant="assist">`. Do **not** split
  each variant into its own component the way Compose does (`OutlinedButton`, etc.).
- **Public props follow Web / MUI idioms**: `onClick`, `children`, `startIcon` /
  `endIcon`, `disabled`, `size`, `color`, standard HTML attributes, and
  controlled/uncontrolled patterns. **Avoid Compose-only prop shapes** such as
  `colors` / `elevation` / `contentPadding` objects or `onPress`. react-aria hooks
  (`useButton`, `useSwitch`, …) may be used internally, but the exposed handler is
  `onClick`.
- **Compose governs behavior, appearance, defaults, tokens, and which
  components / variants exist — NOT the public prop shape.**

## Architecture

```
Reference tokens → System tokens (--md-sys-*) → Component tokens (--_*)
```

- **Tokens**: `src/styles/tokens.css` (non-color), `src/styles/typescale.css`
- **Color**: Dynamic via `ThemeProvider` → `--md-sys-color-*`
- **Components**: `src/components/{Name}/`
- **Primitives**: `src/primitives/{Ripple,FocusRing}/`
- **Token reference**: `docs/md3-token-reference.md`

## CSS Conventions

- CSS Modules (`.module.css`) for all component styles
- Private vars `--_*` set per variant/size via `data-*` attribute selectors
- Name component tokens after Compose's `part.property` structure —
  `--_container-color`, `--_label-text-color`, `--_container-shape`,
  `--_state-layer-color`, etc. (the `md.comp.*` layer)
- System tokens referenced as bare `var(--md-sys-*)` — **no fallbacks**
  (`src/styles/tokens.css` + `typescale.css` are required dependencies; a
  `lint:tokens` check in CI rejects new fallbacks). Private `--_*` and
  `--md-ripple-*`/`--md-focus-ring-*` vars may keep contract defaults.
- Shape morph: use `calc(var(--_height) / 2)` for round (not `9999px`)
- Spring-like easing: `cubic-bezier(0.34, 1.4, 0.5, 1)` for border-radius transitions
- `outline: none` on interactive components (FocusRing provides the accessible indicator)

## Component Conventions

- `forwardRef` with `useButton` (react-aria) for press handling
- Props interface extends `Omit<ButtonHTMLAttributes, ...>` to avoid type conflicts
- `data-variant`, `data-size`, etc. for CSS styling hooks
- Controlled + uncontrolled patterns for stateful props (e.g. toggle `selected`)
- Shape state resolved in JS → single `data-shape-state` attribute for clean CSS precedence
- 48dp minimum touch target via `::before` pseudo-element
- Storybook `title` is flat — `Components/<Name>` (no per-variant hierarchy; each
  component's variants/sizes/states are exercised within its own stories)

## Testing

- Vitest + Testing Library + userEvent + vitest-axe
- Every component must have an axe a11y test
- Use `userEvent.setup({ pointerEventsCheck: 0 })` for disabled button click tests

### Visual Regression Testing (Chromatic)

- Chromatic runs against every Storybook story automatically
- Run locally: `npm run chromatic` (requires `CHROMATIC_PROJECT_TOKEN`)
- CI: set `CHROMATIC_PROJECT_TOKEN` as a repository secret
- Every new component story doubles as a visual regression test — no extra config needed

## Commands

```bash
npm run dev        # Storybook dev server
npm test           # Vitest (all tests)
npm run build      # Library build (dist/)
npm run typecheck  # tsc --noEmit
npm run chromatic  # Visual regression (needs CHROMATIC_PROJECT_TOKEN)
```

`dev`, `test`, `build`, `typecheck` must pass before committing.

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/).
A `commit-msg` hook (commitlint) enforces this automatically.

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
