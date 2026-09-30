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

State-layer opacities: hover `0.08` / focus `0.10` / pressed `0.10` / dragged
`0.16` — the current m3.material.io token tables and Compose `StateTokens`
agree on these (the old `0.12` guidance is obsolete). Outlined border color is
`outline-variant` per current spec and Compose (material-web's `outline` is the
legacy value). Notes for auditing:

- m3.material.io token tables mark deprecated values with a warning icon —
  when a site value disagrees with current Compose, suspect the site row's
  freshness before assuming a real difference.
- Compose token files sometimes disagree with the shipped `*Defaults` values
  (TODO-flagged overrides, flag-gated fixes). Always read both; record which
  one a decision follows.
- When m3.material.io and Compose genuinely conflict, follow the spec priority
  above and record the ruling in the component's adjudicated spec sheet
  (`docs/specs/<component>.md`, pre-implementation) or its `docs/audits/`
  report (post-implementation) — and when the other document already states a
  conflicting decision, mark it superseded with a cross-reference instead of
  leaving both standing.

## API Design Policy

This library targets **Web / React application developers (MUI users)**. Compose is
the reference for *what* to build, but the *public API* is Web-idiomatic.

- **Single component per MD3 component, selected by a `variant` prop** (MUI-style) —
  e.g. `<Button variant="outlined">`, `<Chip variant="assist">`. Do **not** split
  each variant into its own component the way Compose does (`OutlinedButton`, etc.).
- **Public props follow Web / MUI idioms**: `onClick`, `children`, `startIcon` /
  `endIcon`, `disabled`, `size`, `color`, standard HTML attributes, and
  controlled/uncontrolled patterns. **Avoid Compose-only prop shapes** such as
  `colors` / `elevation` / `contentPadding` objects or `onPress`. Behavior is
  built on native elements (`<button>`, `<input>`) plus the shared primitives
  and internal hooks (`Ripple`, `FocusRing`, `useModal`) — no external a11y
  framework. The exposed handler is `onClick`.
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
- Motion: use the motion-scheme spring tokens
  `--md-sys-motion-spring-{fast|default|slow}-{spatial|effects}-{duration|easing}`
  (always pair duration + easing of the same spring), picking the key Compose
  uses for that animation (`MotionSchemeKeyTokens.*`): spatial for
  position / size / shape, effects for color / opacity. Never hardcode
  `cubic-bezier(` or fixed ms for scheme motion (a lint test rejects
  `cubic-bezier(` in component code). Bounce-free press morphs use
  DefaultEffects, as Compose Button does (docs/audits/button.md B5). JS
  springs read the raw `-damping` / `-stiffness` via `src/internal/spring.ts`.
  Compose tweens that are not scheme keys (elevation, sheets, ripple) keep the
  `--md-sys-motion-duration-*` / `-easing-*` tokens. Mapping + exceptions:
  docs/md3-token-reference.md §5
- Reduced motion (ruling B3): state changes are instant or fade-only. The
  spatial spring durations resolve to 0ms under `prefers-reduced-motion:
  reduce` (tokens.css), so token-driven spatial motion needs no rule; add a
  component rule for keyframe animations and for spatial properties on
  effects tokens, and read `matchMedia('(prefers-reduced-motion: reduce)')`
  (`prefersReducedMotion()`) in JS-driven motion. Only indeterminate progress
  keeps a minimal motion
- `outline: none` on interactive components (FocusRing provides the accessible indicator)

## Component Conventions

- `forwardRef` + native elements for behavior: `<button>` for press,
  `<input type="checkbox|radio|range">` (visually hidden, oversized) for
  selection controls; shared primitives `Ripple`/`FocusRing` for states and
  `src/internal/useModal` for modal overlays — no external a11y framework
- Props interface extends `Omit<ButtonHTMLAttributes, ...>` to avoid type conflicts
- `data-variant`, `data-size`, etc. for CSS styling hooks
- Controlled + uncontrolled patterns for stateful props (e.g. toggle `selected`)
- Shape state resolved in JS → single `data-shape-state` attribute for clean CSS precedence
- 48dp minimum touch target — via `::before` on button-like hosts, or by
  oversizing the invisible native input on selection controls
- Storybook `title` is flat — `Components/<Name>` (no per-variant hierarchy; each
  component's variants/sizes/states are exercised within its own stories)

## Testing

- Vitest + Testing Library + userEvent + vitest-axe
- Every component must have an axe a11y test
- Use `userEvent.setup({ pointerEventsCheck: 0 })` for disabled button click tests

### Visual Regression Testing (Playwright)

- `vrt/vrt.spec.ts` screenshots **every Storybook story × light/dark** against
  a built Storybook; every new story doubles as a VRT case — no extra config
- CI: the `VRT` workflow runs on every PR; on failure, download the
  `vrt-diff` artifact to review expected/actual/diff images
- Baselines live in `vrt/__screenshots__/` and are **canonical for the
  GitHub Actions runner** — never regenerate them locally (even the official
  Playwright Docker image differs in emoji/symbol fallback fonts). For an
  intentional visual change, add the **`update-vrt-baselines` label** to the
  PR: CI regenerates the baselines, commits them to the branch, and removes
  the label (a bot push then needs a one-click workflow approval)
- Local run: `npm run build-storybook && npm run vrt` inside the
  `mcr.microsoft.com/playwright` Docker image gets close (expect a handful
  of glyph-fallback diffs); native macOS/Windows runs will not match
- Determinism hooks: the runner sets `window.__VRT__` (preview freezes the
  clock via MockDate) and captures with reduced motion + animations disabled

## Commands

```bash
npm run dev        # Storybook dev server
npm test           # Vitest (all tests)
npm run build      # Library build (dist/)
npm run typecheck  # tsc --noEmit
npm run vrt        # Visual regression (build-storybook first; baselines are CI-canonical)
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
