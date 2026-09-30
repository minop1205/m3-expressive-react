---
name: audit-component
description: Deep MD3 spec audit of one component against m3.material.io and Compose androidx-main, producing docs/audits/<component>.md plus GitHub issues for confirmed findings. Usage: /audit-component <ComponentName>
---

# Component Spec Audit

Audit ONE component (`$ARGUMENTS`) against the spec sources, produce a report, and file
issues for confirmed findings. **Audit and fix are separate** — never change component
code in this flow. The pilot example to imitate: `docs/audits/button.md`; recent,
fuller examples: `docs/audits/textfield.md`, `docs/audits/iconbutton.md`,
`docs/audits/tooltip.md`.

## Spec priority (for conflicts)

1. m3.material.io (current token tables — note: focus/pressed state layers are 0.10 and
   disabled containers 0.10 in current tokens; old 0.12 guidance is dead)
2. Compose `androidx.compose.material3` @ androidx-main
3. material-web (maintenance mode; polish reference only)

Record every conflict AND its ruling with a one-line reason in the report.

- Site rows with a warning icon are deprecated/stale — suspect them before ruling.
- The site can disagree with ITSELF: guidelines prose vs token tables, a11y prose vs
  figure captions, token rows with swapped labels vs measurement diagrams. Check numbers
  against the tokens and diagrams.
- Matching numbers can mean different things (m3's 1.5 s tooltip hide delay vs Compose's
  1500 ms auto-dismiss) — compare semantics, not just values.
- A variant with no Compose counterpart can be CONFIRMED from the site alone; when the
  site is silent (e.g. swipe-to-dismiss), Compose is primary.
- Compose Defaults of 0dp / no shape can mean "caller decides" — not a real conflict.

## Step 1 — Read the implementation first

- `src/components/<Name>/` — component(s), `.module.css`, tests, stories
- `docs/audits/2026-07-15-cross-cutting.md` — the component's known issues (Tier table)
- `docs/decisions/phase-a-api.md` — settled public-API decisions; do NOT re-flag them
- Closed issues mentioning the component (`gh issue list --state closed --search <Name>`)
- `src/styles/tokens.css` values for any token the component references
- Verify any "shared implementation" assumption by reading the code before structuring
  the report (e.g. NavigationBar/Rail items are separate files; SplitButton does not
  reuse Button)
- Known library-wide gaps — cross-reference instead of filing duplicates: the missing
  0.10 focus state layer in the shared Ripple (hub issue #194)

## Step 2 — m3.material.io (Playwright MCP; WebFetch does NOT work on this SPA)

Read `/components/<component>/specs`, `/accessibility` AND `/guidelines` (a11y pages carry
requirements no token table has; guidelines hold things like the docked-search scrim).
Also read the a11y pages of EMBEDDED components (badge reading order lives only on
badges/accessibility) and sibling pages (extended-FAB sizes live on
`/components/extended-fab`). Use `browser_run_code_unsafe` with `page.waitForTimeout(3000)`
+ `page.evaluate(() => document.body.innerText)` for the prose.

Rules: `page.evaluate` for ALL DOM interaction — `page.locator().click()` / `page.$()`
hang. There is no `require`/`fs` inside `browser_run_code_unsafe`: return the text and
save it to scratch files with Bash (prefix them with the component name — the scratchpad
may be shared). Screenshots can only be saved under the repo's `.playwright-mcp/`
(gitignored).

Token tables are `token-viewer` custom elements and MUST be interacted with (a page may
have one set, several, or duplicate viewers; baseline and Expressive values can be mixed
in one set). Loop over EVERY set — measurement diagrams are images, so values live only
in the token sets:

1. If `[role="menuitem"]` is not already present, click
   `document.querySelectorAll('button.active-token-set-button')[0]` → wait 600ms
   (clicking it while the menu is open CLOSES it)
2. Pick the set from `[role="menuitem"]` by text → wait 1000ms. The menu item of the
   CURRENTLY selected set is prefixed with `check\n` — strip it before matching. Verify
   the switch via `button.active-token-set-button` `innerText`
3. Click the `expand_all` control inside the `token-viewer` (find by
   `textContent.trim() === 'expand_all'`, click its closest button) → wait 800ms
4. Extract `token-viewer` `innerText`; strip the header chrome

Values render as resolved baseline-light hexes — map them back to color roles
(#6750A4=primary, #49454F=on-surface-variant, #CAC4D0=outline-variant, #1D1B20=on-surface,
#E8DEF8=secondary-container, #F7F2FA=surface-container-low, #F3EDF7=surface-container…).
When a hex is shared by two roles (#FEF7FF = surface / surface-bright), a row's `info`
button (or `.token-value-color` where there is no `info` button) shows the
`md.sys.* → md.ref.*` chain. Ignore the bottom "Baseline tokens" viewer if its sets are
labeled `[Deprecated]`.

Shape and elevation values render as SVG previews: click the viewer's `visibility`
button and read each `token .token-value-wrapper` `innerText`. The viewer can STAY in
that view across set switches (the button then reads `view_list`); shapes then read as
text ("Small rounding") and elevation appears only as the inline box-shadow on
`.elevation-preview-block`.

Measurement diagrams are images only: rewrite the `img[alt*=measurements]` `src` to
`=w1400`, curl it into the scratchpad and read the image.

## Step 3 — Compose (delegate to a background subagent, or fetch yourself)

Fetch raw `.kt` from
`https://raw.githubusercontent.com/androidx/androidx/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/`.
LIST directories via the GitHub contents API instead of guessing names — files move and
get renamed (`IconButtonDefaults.kt` is its own file; `TopAppBarSmallTokens` became
`AppBar*Tokens`; the docked toolbar is `FlexibleBottomAppBar` in `AppBar.kt`; carousel
lives under `carousel/`).

- The component file(s) + its `*Defaults` object + token files (all variants/sizes)
- Supporting: `ShapeTokens`, `TypeScaleTokens`, `ElevationTokens`, `StateTokens`,
  `MotionScheme`/`*MotionTokens` when motion is involved
- Look beyond the component file: dialog wrappers (`TimePickerDialog.kt`) hold headline,
  actions and elevation; `internal/` holds real behavior (`BasicTooltip.kt`,
  `*WavyProgressModifiers.kt`); `samples/*Samples.kt` holds a11y wording and wiring
  (badge labels, FAB-menu keyboard handling); foundation `AnchoredDraggable.kt` holds
  swipe settle logic
- **CRITICAL**: extract BOTH the token values AND the `*Defaults` implemented values —
  Compose hardcodes corrections with TODO comments where token files are wrong (Button
  had 3 such cases). Also check `ComposeMaterial3Flags` branches (default-on visual flags
  override tokens) and import lines (Defaults often skip tokens entirely). Report dp
  numbers, role names, opacities, spring params verbatim; forbid guessing; require
  flagging anything unresolved.
- `keyframes { … using E }` applies easing to the interval STARTING at that keyframe;
  Compose's own comments on timings can be stale.
- Don't hand back while waiting on a nested researcher — fetch the files yourself if it is
  slow.

## Step 4 — Behavior and real-browser verification

- Keyboard: expected keys from the WAI-ARIA APG pattern for the widget class
  (menu button, dialog, radio group, slider…) + Compose semantics (Role, focus behavior)
- Check the implementation actually handles them (read the handlers; run existing tests)
- Focus management: initial focus, trap, restore; ARIA attributes and roles
- State layers hover 0.08 / focus 0.10 / pressed 0.10 / dragged 0.16; Ripple/FocusRing
  usage; 48dp touch targets; `prefers-reduced-motion` for JS-driven animation
- Check component CSS variables against the shared primitive's contract (Chip set
  `--md-ripple-hover-color`, which Ripple never reads — found only by measuring the
  state layer during a live hover)

Many findings only show in a real browser. Start Storybook
(`npx storybook dev -p 6007 --ci --no-open`, background), measure with Playwright, then
`pkill -f "storybook dev -p 6007"`:

- The Playwright MCP browser has **reduced motion on by default** — call
  `page.emulateMedia({ reducedMotion: 'no-preference' })` before measuring motion, or
  transitions read as `none`. Conversely, read border radii only under reduced motion
  (mid-transition values are stale). For rAF motion, sample the `transform` attribute per
  frame inside `page.evaluate` for exact cadence.
- Layout: `getBoundingClientRect` for flex widths, indicator vs label widths; compare
  outlined vs filled rects (a `border` on an auto-width element adds to its width even
  with border-box; `inset: 0` children sit inside the border); measure before/after
  selecting when selection adds an icon (layout jumps); slot hosts containing IconButton
  (40px layout, and standard IconButton does not inherit the parent color); absolutely
  positioned popups inside narrow `inline-flex` wrappers collapse to the wrapper width;
  scroll-driven JS — check what `offsetLeft` is relative to.
- Combinations stories don't cover: Storybook URL args
  (`&args=label:Create;size:large;expanded:!true`), or rewrite the root's `data-*`
  attributes via `page.evaluate`. Get story IDs from `/index.json`. Check every
  disabled × selected combination with computed styles (specificity leaks).
- Pseudo-elements behind `z-index: -1` don't show up in computed styles — screenshot
  bands and indicators.
- RTL: `document.documentElement.dir = 'rtl'`. Text scaling: set root font-size to 200%
  and compare `scrollHeight > clientHeight`. Forced colors:
  `page.emulateMedia({ forcedColors: 'active' })` + computed `background-color` (lines
  drawn with backgrounds vanish; SVG fill/stroke survive).
- jsdom axe misses rules: run axe-core in the real browser too (`page.addScriptTag` from
  cdnjs), with popups OPEN and with focusable elements / `<img>` placed in slots
  (`aria-hidden-focus`, `scrollable-region-focusable`, list/listitem nesting).
- Axe also misses invisible-but-reachable content: Tab through the CLOSED state of
  open/close components, and check the aria snapshot after hiding (`scale(0)` /
  `opacity: 0` do not remove elements from the a11y tree).
- Containers with `role="button"` or pointer capture: test key presses and clicks on
  nested controls (Enter/Space interception, click retargeting after
  `setPointerCapture` — jsdom reproduces neither).
- Native behaviors jsdom lacks (`type=search` Escape-clears, IME Enter) need a real
  browser.
- Children handling: count the wrapper slots — `Children.toArray` does not flatten
  Fragments, and a Fragment in a story can silently break a layout and its VRT baseline.
- A visual-only component without a host/behavior layer (e.g. Snackbar) passes jsdom and
  VRT — audit the behavior spec explicitly.
- Temp Vitest probes: `console.log` is swallowed; use `process.stderr.write`. Delete the
  probes afterwards. Slice `activeElement.textContent` before returning it.

## Step 5 — Report: `docs/audits/<component>.md` (Japanese, follow button.md's format)

1. 結論サマリ: what matches (list explicitly — it proves coverage), then a CONFIRMED
   findings table (ID like B1/M1…, impl vs あるべき値, severity) — CONFIRMED means both
   sources agree or one source + no contradiction
2. 軽微/判断のみ items (PLAUSIBLE, conflicting, or judgment calls — NOT issued)
3. ソース間の食い違い table with rulings
4. Detailed per-dimension tables (sizes / shapes / colors per state / motion / behavior)
5. Anything learned that improves this skill → update this SKILL.md in the same PR (when
   several audits run in parallel, collect the learnings and update the skill once
   instead, to avoid conflicts)

## Step 6 — Issues & PR

- One GitHub issue per CONFIRMED finding group (English, labels: `phase-b` + `tokens`/
  `a11y`/`vrt` as relevant, `api-design` when an API decision must come first), each
  citing `docs/audits/<component>.md <ID>` and expected VRT impact. VRT captures with
  reduced motion and animations disabled, so motion-dependent findings are usually
  invisible to it — say so.
- Add an "Issue:" line mapping IDs to issue numbers under the CONFIRMED table.
- PR the report to `develop` from branch `docs/<component>-audit`; fixes come later as
  separate 1-issue PRs (bundle only findings that rewrite the same code region).
- Commit subjects must not start with an uppercase letter (commitlint `subject-case`):
  "docs(audit): add the TextField spec audit".
