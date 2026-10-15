# Changelog

## Unreleased

### Migration notes

- **Modals in the top layer (from 1.5.0)**: since 1.5.0 the modal DatePicker /
  TimePicker, Dialog and the other modals (BottomSheet, SideSheet,
  NavigationDrawer, NavigationRail) show themselves in the browser top layer
  (#494, B45). If your app wrapped one in its own popover / top-layer
  container, remove that wrapper — otherwise the app's layer is painted above
  the modal and blocks it.

## 1.5.0 (2026-10-15)

Follow-ups from a downstream app's report, each decided spec-first: m3.material.io,
then Jetpack Compose, with the rulings (B45–B51) recorded in
`docs/decisions/phase-b-api.md`. All changes are additive or bug fixes.

### Behavior changes to check

- **Modals in the top layer**: open Dialog, modal BottomSheet / SideSheet /
  NavigationDrawer / NavigationRail and the modal DatePicker / TimePicker are
  now shown in the browser top layer (`popover="manual"`), so a dialog opened
  from a menu item paints above the menu and app stacking contexts can no
  longer clip a modal. The DOM position (and so the theme tokens) is
  unchanged; the z-index tokens remain the fallback without the Popover API.
  A snackbar shown while a menu or modal is open paints above it (#494, B45).
- **Dialog**: long content now scrolls only the body; the icon, headline and
  actions stay pinned (m3 "the dialog title is pinned at the top, with buttons
  pinned at the bottom") (#495, B46).

### Added

- **Dialog**: `--md-dialog-container-min-width` / `--md-dialog-container-max-width`
  custom properties (defaults 280px / 560px, the m3 range) (#495, B46).
- **Slider**: `onChangeCommitted(event, value)` — fires at the end of an
  interaction with Compose `onValueChangeFinished` semantics: pointer release
  (drag end or tap), the keyup of each keyboard step, and assistive-technology
  value changes (#497, B47).
- **TextField / Select / Autocomplete / DatePickerField**: `label`,
  `supportingText` and `errorText` (DatePickerField: `getErrorLabel`) accept
  React nodes; the outlined notch follows the rendered label. The m3 guidance
  (short single-line label) is in the docs (#498, B48).
- **Tabs**: `Tab href` for navigation tabs (`<a role="tab">`, the app's router
  handles the click); `TabContext` + `TabPanel` link tabs and panels with
  `id` / `aria-controls` / `aria-labelledby` (WAI-ARIA APG Tabs); the
  `--md-tabs-container-color` custom property (#499, B49).
- **LocaleProvider** (new, `m3-expressive-react/LocaleProvider`): one place to
  set the `locale`, the 12 / 24-hour default and every built-in label
  (pickers, Snackbar, SearchBar, Chip, Dialog, sheets, Badge, …). Props still
  override; without a provider nothing changes. `useLocale()` reads the
  resolved values. New i18n guide with a Japanese example (#500, B50).

### Decided not to add (B51)

- A focusable disabled state for Button / IconButton (#496), a menu-level
  `onAction` (#501) and a tooltip show delay (#502): neither m3 nor Compose
  defines them. The ruling documents the alternatives.

## 1.4.1 (2026-10-15)

### Fixed

- **Package**: the 1.4.0 tarball contained a stale pre-1.4 `dist/`. Select,
  Autocomplete, PullToRefresh, DragHandle and ScrollField were missing, and
  the 1.4.0 fixes (modal stack, form reset, exit motion, …) were not in it.
  1.4.1 is built from the 1.4.x source. `npm publish` now always rebuilds
  first (`prepublishOnly`), and a `check:pack` step fails when any exported
  file is missing from the tarball (#493).
- **Modals** (`useModal`): an element focused by React `autoFocus` inside the
  surface keeps focus on open, and the focus-return target is recorded before
  children move focus, so closing no longer tries to return to an element
  inside the closing modal or to an input that has gone (#503).
- **Tooltip**: opens on focus only for keyboard (`:focus-visible`) focus, not
  when focus is moved programmatically, e.g. returning after a dialog closes
  (#503).
- **TextField**: `inputProps.required` / `readOnly` / `disabled` / `type` /
  `rows` are no longer overridden by the component's defaults. An explicit
  top-level prop still wins (#503).

### Added

- **Ripple** / **FocusRing** subpath entries (`m3-expressive-react/Ripple`,
  `m3-expressive-react/FocusRing`) that load their CSS, for apps that build
  their own controls with them in per-component (`tokens.css`) mode (#503).

## 1.4.0 (2026-10-13)

A quality release: a spec-compliance sweep of every component (issues
#406–#489) plus the missing MD3 configurations from m3.material.io and Compose.
Every change is additive or a bug fix. The behavior changes worth checking
before you upgrade are listed first.

### Behavior changes to check

- **Tooltip** (rich): without `placement`, a rich tooltip now opens at the
  **bottom-end corner** of its trigger (m3 "bottom right"), moving to the other
  corners near viewport edges. Pass `placement="bottom"` for the previous
  centered position (#440, ruling B38).
- **SegmentedButton** (single-select): arrow keys and Home / End now **select**
  the focused segment (APG radio group, like ButtonGroup), and clicking the
  selected segment again no longer fires `onChange`. The props are typed by
  `multiSelect`, so passing a non-literal `boolean` to `multiSelect` no longer
  type-checks (#422).
- **Tabs**: activating the already-selected tab no longer fires `onChange`, and
  `preventDefault()` in a tab's `onClick` cancels the selection (#422).
- **Overlays**: one Escape now closes only the topmost modal. A tooltip or menu
  inside a dialog closes first; the dialog needs a second Escape (#406).
- **Dialog** `fullScreen`: the close button is now a standard `IconButton`
  (ripple, pressed state, focus ring) (#423).
- **Menu** (baseline variant): selected items now show the secondary-container
  fill from the spec (#435).
- **Controlled components** (24 of them, via the new shared hook): switching a
  prop between controlled and uncontrolled now logs a development warning. A
  controlled prop that becomes `undefined` keeps its last value instead of
  falling back to stale internal state (#413).
- **TextField** (uncontrolled) is now a native uncontrolled input, so
  `form.reset()` works. Switching it to controlled later logs React's standard
  warning (#432).
- **FocusRing**: an element that already has keyboard (`:focus-visible`) focus
  when its ring mounts (e.g. `autoFocus`, a menu's first item) now shows the
  ring (#412).
- **Package**: `clsx` is no longer bundled (it is a normal dependency);
  `@material/material-color-utilities` stays bundled and moves to
  devDependencies, with its Apache-2.0 notice in `THIRD_PARTY_NOTICES.md`.
  React peers are now `^18.0.0 || ^19.0.0`, and `engines.node >= 18` (#408,
  #411).

### Added

- **New components**
  - **Select** / **Option** — the non-editable exposed dropdown menu
    (APG select-only combobox; filled / outlined; form submit and reset)
    (#434, B31).
  - **Autocomplete** — the editable variant with list autocomplete, filtering
    with eased item motion, `freeSolo`, `filterOptions` (#434, B42).
  - **PullToRefresh** — Compose `PullToRefreshBox` as a scroll container, with
    the contained loading indicator or the circular indicator (#441, B32).
  - **DragHandle** — Compose `VerticalDragHandle`, a pane-resize handle
    (APG window splitter) (#444, B44).
  - **ScrollField** — Compose `ScrollField`, a wheel picker (ARIA spinbutton),
    also used by the TimePicker scroll mode (#444, B43).
- **Menu**: `MenuGroup selectionMode="single" | "multiple"` with
  `value` / `defaultValue` / `onChange` (`menuitemradio` / `menuitemcheckbox`,
  multi-select stays open, `closeOnSelect`); `MenuItem supportingText` and
  `selectedIcon`; submenus (`MenuItem submenu`, APG keyboard, hover intent);
  context menus via `anchorPosition` (`trigger` is now optional) (#435, #436,
  B33, B34).
- **BottomSheet**: `variant="standard"` (non-modal, in the layout) and opt-in
  partially-expanded / expanded detents (`skipPartiallyExpanded={false}`,
  `expanded` / `defaultExpanded` / `onExpandedChange`). Sheets still open fully
  by default (#437, B35).
- **SearchBar**: `layout="fullscreen"` (Compose contained full-screen search,
  top layer, focus trapped) and `backLabel` (#442, B39).
- **ChipSet**: `selectionMode="single" | "multiple"` with `value` /
  `defaultValue` / `onChange` and `selectionRequired`; filter chip `endIcon`
  for a dropdown arrow that turns while its menu is open (#438, B36).
- **TextField**: `labelPlacement="above"` and `shrinkLabel` (Compose
  `TextFieldLabelPosition`), also on DatePickerField (#439, B37); experimental
  `tonal` style (also on Select) and a documented password-toggle recipe
  (#444, B44).
- **Tooltip**: `placement` `'start' | 'end' | 'left' | 'right'` with flip, and
  an optional `caret` (#440, B38).
- **Tabs**: `Tab iconPosition="start"` (Compose `LeadingIconTab`) and a `badge`
  slot (#443, B40).
- **TimePicker**: `variant="vibrant"`, `orientation="horizontal"` and
  `mode="scroll"` (#444, B43).
- **FabMenu** `horizontalAlignment`, **Toolbar** `disableElevation`,
  **NavigationDrawer** `variant="dismissible"` (#444, B41).
- **Overlays**: `onClose(event, reason)` on Dialog, BottomSheet, SideSheet,
  NavigationDrawer and the modal NavigationRail (`'escapeKeyDown' |
  'backdropClick' | 'closeButton' | 'drag'`) (#407).
- **NavigationDrawer** `defaultValue`; **ButtonGroup** / **ChipSet**
  group-level `disabled`; **DatePickerField** `inputRef` / `inputProps` /
  `name`; **DatePicker** / **DatePickerField** `referenceDate` for
  hydration-stable SSR (#421, #410).
- **Next.js App Router**: interactive modules ship a `'use client'` directive,
  so the library can be imported from Server Components (#409).
- **Design tokens**: overlay stacking tokens `--md-sys-z-tooltip | search |
  popup | modal | snackbar` (#424).

### Fixed

- **Overlays**: a modal opened from (or beside) another modal is no longer
  inert; modals close in any order; the Tab wrap skips roving / unchecked
  radio stops; focus falls back sensibly when the trigger is gone; Snackbar
  actions stay usable and announced while a dialog is open (#406). Dialog,
  BottomSheet and SideSheet now play their exit motion (#433); BottomSheet no
  longer dismisses on a stale fling or swallows activations after
  `pointercancel` (#433); the scroll lock no longer shifts the page by the
  scrollbar width (#424).
- **Popups**: popups hide while their anchor is scrolled out of view, keep focus
  when they do, and ignore transient viewport resizes (#430, #470, #485);
  Menu and Tooltip compose in both directions (#419); SearchBar reopens after
  Escape; typeahead cycles, ignores icon ligatures and is shared with FabMenu;
  disabled SearchBar / SplitButton never open (#430, #420).
- **Forced colors (Windows High Contrast)**: state and boundaries stay visible
  in Slider, Tabs, TimePicker, Chip, buttons, navigation, Badge, TextField,
  DatePicker and all surfaces (#427).
- **RTL**: TextField notch / label, TimePicker digit order, NavigationDrawer /
  SideSheet slide direction, DatePicker chevrons, Slider thumb / label, and
  every former `:dir(rtl)` rule, which minifiers had compiled to `:lang()`
  (#428, #460).
- **Forms**: Checkbox, Switch, Radio, RadioGroup and TextField follow
  `form.reset()`; required labels no longer read "star"; autofill and partial
  number input keep the label floated; `inputProps['aria-describedby']` is
  merged (#432, #414).
- **Slider**: overlapping range thumbs can be separated; ticks sit on the step
  grid; `min > max` is normalized; clicks map exactly to the handle; values
  round to the step; 48dp hit area (#431, #429).
- **DatePicker / TimePicker**: keyboard focus stays within `min` / `max`;
  pickers reopen on the value's month / the hour field; years 0–99 parse
  correctly; same-day ranges with a time of day work; Cancel reverts to the
  latest value (#415).
- **Package / SSR**: CommonJS TypeScript consumers no longer get TS1479 from
  the root entry; no React 18 `useLayoutEffect` server warnings; no
  hydration-risky render values (#408, #410).
- **Components**: TextField icon buttons keep focus (#414); Carousel lays out
  replaced items (#416); SwipeToDismiss drops stale presses and makes dismissed
  rows inert (#417); ButtonGroup styles Tooltip-wrapped buttons (#418); Card
  activates Space on keyup; ChipSet keeps focus when its last chip is removed;
  Snackbar settles promises on unmount and pauses under a resting pointer;
  progress indicators clamp `NaN` (#423); Ripple hover resets after disable
  (#412); icon-only tabs are 48dp (#484); ThemeProvider sets `color-scheme`
  (#424); Checkbox / Radio / Switch `style` goes to the root and Checkbox
  `error` sets `aria-invalid` (#421); modal NavigationDrawer surface is a
  `div` (axe) (#429).
- **Motion tokens**: fixed-millisecond transitions mapped to tokens or
  documented as exceptions (#424).

### Tooling

- CI runs publint, `@arethetypeswrong/cli` and an RSC import check; new
  coverage report (`npm run test:coverage`), a variant-wide axe matrix and an
  SSR smoke test for every exported component (#408, #409, #410, #425).

## 1.3.1 (2026-10-08)

### Fixed

- **Divider** `orientation="vertical"`: stretches to the height of its row
  again under host / reset CSS that sizes `<hr>` (e.g. Docusaurus/Infima's
  `hr { height: 1px }`), instead of collapsing to a 1×1 dot (#400).

## 1.3.0 (2026-10-08)

### Added

- **AppBar** `variant="search"` — the M3 Expressive **search app bar**
  (#393). A `SearchBar` passed as `searchBar` replaces the heading text, with
  the navigation icon and actions outside it (icons inside the field come
  from the SearchBar's own `startIcon` / `endIcon`). Surface-container field
  (surface-container-highest on scroll), `titleAlignment="center"` for
  centered text, and the existing scroll behaviors. A `title` is rendered as
  a visually hidden `<h1>`. API ruling B30 in `docs/decisions/phase-b-api.md`.
- **SearchBar**: `startIcon={false}` removes the leading icon; new host custom
  properties `--md-search-bar-container-color` / `-width` / `-min-width` /
  `-input-text-align`.

### Fixed

- **AppBar** `scrollBehavior="enterAlways"`: no transform while the bar is at
  rest, so fixed-position descendants (e.g. the SearchBar scrim) are no longer
  clipped to the bar.

## 1.2.3 (2026-10-07)

### Fixed

- **Host typography CSS no longer shifts component margins** (#394): page
  styles for prose (e.g. Docusaurus/Infima `.markdown`, Tailwind Typography,
  CMS stylesheets) used to override the library's margin resets on the
  AppBar title / subtitle (title and subtitle drifted apart by 25px), the
  Dialog title, the SideSheet headline and the List / ListItem /
  SwipeToDismiss list elements. Those resets now use a higher-specificity
  rule (`0,3,0`, no `!important`); elements and semantics are unchanged.
  To set margins on `List`, `ListItem` or `SwipeToDismiss` from a
  `className`, use a selector of at least `0,3,1` or an inline `style`.

## 1.2.2 (2026-10-07)

Docs-only patch (no library code changes).

### Docs

- **Icons page**: the Button demo's label is centered on its icon again —
  MDX had wrapped the label in a paragraph whose margin pushed it 10px up
  (#390). Live demos now neutralise such MDX-generated paragraphs inside
  controls, so a label written over several lines can't misalign.

## 1.2.1 (2026-10-07)

### Fixed

- **Button / FabMenu icons**: the Button icon slots (`startIcon` / `endIcon`)
  and the FabMenu toggle / item icon slots now set `fill: currentColor`, like
  every other icon slot. Fill-based SVGs without their own `fill` (e.g.
  Material Symbols) previously rendered black — for example on a filled
  Button.

### Docs

- **Icons guide rewritten** (#387): which packages to install, the exact
  install commands, Vite setup (`vite-plugin-svgr`) including the TypeScript
  types, Next.js setup for Turbopack and webpack (`@svgr/webpack`), choosing
  Material Symbols styles / fill / weight, the icon-font and lucide-react
  alternatives with their caveats, sizing and color, and accessibility. Every
  step was verified in fresh projects.

## 1.2.0 (2026-10-07)

Packaging, interaction polish and documentation. Backward compatible: the root
entry exports exactly the same names, and `styles.css` keeps working as before.

### Added

- **Per-component subpath imports** (#378): every component folder is an
  entry point with a default export, e.g.
  `import Button from 'm3-expressive-react/Button'` (named imports such as
  `import { RadioGroup } from 'm3-expressive-react/Radio'` work too). The
  default is the folder's namesake component; `AppBar` → `TopAppBar`,
  `ProgressIndicator` → `LinearProgressIndicator`. ESM, CJS and types
  (`bundler` / `node16` / `nodenext` / legacy `node` resolution) for all 36
  subpaths.
- **Per-component CSS**: a subpath import loads only that component's CSS
  (plus the shared Ripple / FocusRing styles). New
  `m3-expressive-react/tokens.css` entry (design tokens + typescale) to
  import once alongside subpath imports. `require()` and the `node` export
  condition resolve to CSS-free modules (Jest, SSR with externalized deps).
- **Carousel: mouse drag** (#374): drag to scroll with fling and snap
  (`uncontained` coasts without snapping), an 8px slop, no item activation
  after a drag, `grab` / `grabbing` cursors. The vertical wheel is not
  captured (use Shift+wheel or a trackpad); a "Show all" example shows the
  m3-recommended alternative.
- **Token** `--md-web-motion-easing-back-out` — a web-adaptation easing used
  by Switch (not an MD3 token).

### Changed

- **Switch motion** (#373, web adaptation to match material-web): the handle
  grows over 100ms on press and shrinks over 250ms on release, and the on/off
  slide uses material-web's 300ms back-out overshoot. The switch no longer
  follows `ThemeProvider motionScheme`; disabled and reduced motion stay
  instant.
- The library build emits one file per source module (`preserveModules`)
  with per-file `.d.ts` / `.d.cts` declarations instead of a single bundle.
  The root entry exports exactly the same names and stays tree-shakeable;
  `styles.css` keeps every rule in the same order (the FocusRing rules that
  were repeated for each `composes:` user now appear once).

### Fixed

- **Carousel jitter** (#375): multi-browse and hero items no longer jitter
  while scrolling — the keyline mask is transform-only and runs as
  scroll-driven animations on the compositor where supported (rAF fallback
  elsewhere). Items now sit inside two clip wrappers.
- **Radio / Checkbox / Switch** (#376): the control is vertically centered on
  the text when placed inline in a label.
- **CSS minifiers** (#372): NavigationRail's hide-on-collapse transform no
  longer trips cssnano (postcss-calc); the README warns that clean-css breaks
  `@starting-style` and should be replaced by cssnano or Lightning CSS.

### Docs

- Pages for all 36 components with live demos, accessibility notes and
  generated prop tables (#367–#372), plus demos for notable props (#377).
- The docs site is now published from `main`, so it always documents the
  released version; pull requests build-check the site (#379).

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
