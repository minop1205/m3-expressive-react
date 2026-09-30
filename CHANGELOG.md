# Changelog

## 1.1.0 (2026-10-01)

Spec-conformance release. Every component was re-audited against
m3.material.io and Jetpack Compose `material3` (reports in `docs/audits/`,
API rulings in `docs/decisions/phase-b-api.md`) and every confirmed finding
was fixed. The public API stays **backward compatible**: nothing was removed;
renamed or replaced props remain as deprecated aliases until v2. Several
components change **visual defaults and accessibility semantics** — review the
"Behavior changes" list before upgrading.

### Highlights

- **Motion schemes**: `ThemeProvider motionScheme="expressive" | "standard"`
  (default expressive) and `--md-sys-motion-spring-*` tokens; every component
  animates with Compose's spring keys. Reduced motion makes spatial motion
  instant and keeps fades (indeterminate progress keeps a minimal motion).
- **Accessibility**: 0.10 focus state layer on keyboard focus (shared
  Ripple); APG keyboard models for Tabs, SegmentedButton, ButtonGroup, Chip
  (`ChipSet`), List, Toolbar, Carousel, DatePicker grid, TimePicker dial,
  FabMenu and SearchBar; WCAG 1.4.13 tooltips; clickable containers no longer
  swallow nested controls; forced-colors visibility for Divider and
  progress indicators.
- **Popups** (Menu, Tooltip, DatePickerField, SearchBar docked view) render
  in the top layer with flip + viewport clamp.
- **i18n**: every built-in string is an overridable `*Label` / `get*Label`
  prop with an English default.

### Behavior changes (review when upgrading)

- **AppBar**: `medium` is 112dp (136dp with `subtitle`, HeadlineMedium) and
  `large` 120dp (152dp, DisplaySmall) — the Expressive flexible variants;
  centered titles are centered across the full bar; icon slots are 48dp with
  16dp edge insets; nav icon is on-surface. `hidden` now slides out and
  becomes inert (was the native `hidden` attribute).
- **Badge**: no longer a live region (`role="status"` removed); announced via
  visually hidden text ("New notification" / "{n} new notifications");
  `visible={false}` also hides it from assistive tech; 16dp is a min height.
- **ButtonGroup**: standard spacing follows the spec per size (18/12/8/8/8);
  press widens the pressed button 15% and squeezes neighbours (was a scale).
- **Card / List**: a clickable container no longer intercepts keys/clicks of
  nested controls. Clickable `ListItem` renders its leading slot + text as a
  native `<button>`/`<a>` with `trailing` as a sibling (`role`, `tabIndex`,
  `onKeyDown`, `aria-*` land on that element; leading slot no longer
  `aria-hidden`). Lists with selection share one Tab stop with arrow keys.
- **Carousel**: keyline layout (items are masked, not scaled/faded);
  `uncontained` no longer snaps; hero is centered.
- **Chip**: state-layer colors follow variant/selection; labels truncate;
  88dp min width with a remove button.
- **DatePicker / DatePickerField**: the field commits typed dates on
  Enter/blur (not per keystroke); the mode toggle shows by default; grid is
  always 6 rows and the first weekday follows `locale`.
- **Divider**: decorative by default (hidden from assistive tech); pass
  `decorative={false}` for a semantic separator.
- **Fab**: extended FABs use the Expressive sizes (56/80/96dp); no pressed
  corner morph; small FAB has a 48dp touch target.
- **FabMenu**: closed items are inert; menu keyboard pattern; the toggle's
  accessible name stays constant (`closeAriaLabel` is ignored).
- **IconButton**: outlined no longer widens the container; disabled toggles
  always use disabled colors; unselected filled toggle uses
  surface-container / on-surface-variant.
- **NavigationBar**: flexible 64dp container (was 80dp); badges are read
  after the label.
- **ProgressIndicator**: circular default size is 40dp for the flat 4dp
  configuration (44/48/52 for the others); stroke no longer scales with
  `size`.
- **SearchBar**: the input is a `combobox` when it has results (was
  `searchbox`); `startIcon` is no longer forced `aria-hidden`; 360dp min width;
  Enter that commits an IME composition no longer calls `onSearch`.
- **SegmentedButton**: single-select is a `radiogroup` of `radio`s with
  `aria-checked` (was `aria-pressed` buttons) with one Tab stop; segments are
  equal width; the check slot is always reserved (no row jump).
- **Snackbar**: fills available width up to 600dp; the action is a text
  Button and dismiss a standard IconButton; `onDismiss(event, reason)`.
- **SplitButton**: styled by Button (outlined content on-surface-variant,
  disabled container 10%, border no longer adds width).
- **SwipeToDismiss**: `onDismiss` fires after the exit animation; 8px touch
  slop (nested buttons receive clicks); fling dismissal; RTL-aware.
- **Tabs**: arrow keys move focus only — Space/Enter select (`onChange` no
  longer fires on arrows); icon+label tabs are 64dp; fixed tabs are equal
  width; the indicator slides.
- **TextField**: min width 280dp; prefix/suffix and the counter are read by
  assistive tech; outlined hover label is on-surface.
- **TimePicker**: selectors and AM/PM are radio groups; dial numbers read
  "3 o'clock" / "15 minutes"; input fields are 96×72 display-medium; typed
  input is validated instead of clamped.
- **Tooltip**: rich tooltips default to `bottom`; a rich tooltip with an
  action is a non-modal `dialog`; hoverable, 1.5s hide delay, Escape
  anywhere, one open at a time.

### Added

- **ThemeProvider** `motionScheme`; `--md-sys-motion-spring-*` tokens.
- **AppBar** `subtitle`, `titleAlignment`, `scrolled`, `collapsedFraction`,
  `hidden`, `scrollBehavior`, `scrollTarget`.
- **Toolbar** arrow keys, `startContent`/`endContent`, `expanded` /
  `defaultExpanded` / `onExpandedChange`, `hidden`, `scrollBehavior`,
  `scrollTarget`.
- **ButtonGroup** `selectionMode`, `value` / `defaultValue` /
  `onChange(event, value)`, `selectionRequired`.
- **Card** `href` (renders `<a>`), `CardActionArea`, `CardActions`.
- **List** `selectionMode`, `value` / `defaultValue` / `onChange`,
  `variant="standard" | "segmented"`; **ListItem** `value`, `href`.
- **Chip** input-chip selection (opt-in), `avatar`, `getRemoveLabel`;
  **ChipSet**.
- **Carousel** `getItemLabel`, `roleDescriptionLabel`,
  `itemRoleDescriptionLabel`; **CarouselItem** `onClick` / `href` /
  `disabled`.
- **DatePicker** `onAccept`, `onCancel`, `open`, `onClose(reason)`,
  `mode` / `defaultMode` / `onModeChange`, `showModeToggle`, label props.
- **TimePicker** the same action/dialog props, `ampm`, `locale`, label props;
  24-hour dial.
- **Snackbar** `actionOnNewLine`, `dismissLabel`; **SnackbarProvider** +
  `useSnackbar()`.
- **Tooltip** `persistent`.
- **NavigationBar / NavigationRail items** `selectedIcon`, `badgeLabel`;
  **NavigationRail** `modal`, `hideOnCollapse`, `onClose`, `modalLabel`.
- **FabMenu** `size`, `tonal`.
- **Badge** `label`; **Divider** `decorative`; **SegmentedButton** option
  `ariaLabel`; **SearchBar** `suggestionsLabel`; **SwipeToDismiss**
  `dismissed` / `defaultDismissed` / `onDismissedChange`,
  `startToEndBackground` / `endToStartBackground`; **TextField**
  `getCounterLabel`; **Dialog** `closeLabel`.

### Deprecated (removed in v2)

- `TopAppBar variant="center"` → `titleAlignment="center"`.
- `TimePicker mode` without `onModeChange` → `defaultMode`.
- `FabMenu closeAriaLabel` (ignored).
- `SegmentedButtons` (plural alias, deprecated since 1.0.0): its removal,
  announced for this release, is **postponed to v2** to keep 1.x compatible.
- `BottomAppBar` is not deprecated, but `Toolbar variant="docked"` is the
  recommended replacement.

### Docs

- Spec audit reports for every component (`docs/audits/`), Phase B API
  rulings (`docs/decisions/phase-b-api.md`), docs site linked from the README.

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
