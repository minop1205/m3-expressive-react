# Changelog

## 1.0.0 (2026-09-29)

First stable release, published as **m3-expressive-react**.

### Highlights

- **36 Material Design 3 components** with Expressive support, spec-driven
  against m3.material.io and Jetpack Compose `material3` (adjudicated spec
  sheets and audit reports live in `docs/`)
- **Token-first styling**: components read `--md-sys-*` CSS custom
  properties; color is generated at runtime from a seed via Dynamic Color
  (`ThemeProvider`), light/dark included
- **MUI-idiomatic API**: single component per MD3 component selected by
  `variant`; `onChange(event, value)`; `startIcon`/`endIcon`; `xs–xl` size
  scale; `open`/`defaultOpen`/`onOpenChange`; `ref` always points at the
  root element with `inputRef` escape hatches
- **Accessibility built in**: native elements (`<button>`,
  `<input type="checkbox|radio|range">`) plus hand-rolled APG-compliant
  patterns — no external a11y framework; every component has an axe test
- **Icon-agnostic**: all icon props take `ReactNode`

### Breaking changes (from the 0.x development line)

The v1 API batch is documented in
[docs/migration-v1.md](docs/migration-v1.md): event-first `onChange`,
`startIcon`/`endIcon`, Slider size vocabulary, `SegmentedButton` (singular;
the plural alias remains this release only), SearchBar `open` family, FAB
`color`+`tonal`, root refs + `inputRef`/`inputProps`, and Fab
`followContainer`.
