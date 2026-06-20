# CLAUDE.md — Project Instructions for Claude Code

This file is loaded automatically by Claude Code. It defines the rules and
conventions that every contributor (human or AI) must follow.

## Spec Priority

1. **m3.material.io** — the highest-priority source of truth for MD3 design specs
2. **material-web** (GitHub) — secondary reference for implementation patterns
3. **Material 3 Design Kit** (Figma) — tertiary reference; covers variants not
   documented on m3.material.io (e.g. vertical Divider inset)
4. When specs conflict, follow the higher-priority source

### Verifying specs with Playwright MCP

m3.material.io is a SPA — `WebFetch` returns only CSS/JS, not rendered content.
Use the Playwright MCP tools (configured in `.mcp.json`) to verify specs:

```
browser_navigate → https://m3.material.io/components/{component}/specs
browser_run_code_unsafe → extract page.evaluate(() => document.body.innerText)
```

### Known spec differences (m3.material.io vs material-web)

| Token / property             | m3.material.io      | material-web |
| ---------------------------- | ------------------- | ------------ |
| Outlined variant border color | `outline-variant`  | `outline`    |

This applies to Button, IconButton, and likely other outlined components.

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
- System tokens referenced as `var(--md-sys-*, <fallback>)`
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
