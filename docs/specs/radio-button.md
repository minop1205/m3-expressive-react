# Radio Button — adjudicated spec sheet

Date: 2026-09-23. Compiled from three independent research passes
(m3.material.io via Playwright / Compose androidx-main raw sources /
material-web repo), adjudicated per the Spec Priority in CLAUDE.md
(m3.material.io > Compose > material-web). Raw per-source reports were
produced by the `.claude/agents/*-researcher` subagents.

## Scope

Single variant only — no size, error, or Expressive visual variants exist in
any source (m3.material.io token picker has one entry; Compose ships one
public `RadioButton` composable and no `RadioButtonExpressiveTokens`;
material-web token set is pre-Expressive v0.192). The only Expressive effect
is theme-level motion (see Motion). Neither Compose nor material-web ships a
RadioGroup component — our `RadioGroup` is a deliberate Web/MUI API addition
(grouping semantics come from the native inputs + `role="radiogroup"`).

## Anatomy & dimensions

| Attribute | Value | Source |
|---|---|---|
| Icon size (outer ring outer diameter) | 20dp | `md.comp.radio-button.icon.size`; `RadioButtonTokens.IconSize` |
| Outer ring stroke width | 2dp | Compose `RadioStrokeWidth` (RadioButton.kt L318–323); not published on m3 site |
| Outer ring stroke centerline radius | 9dp (outer edge r=10, inner edge r=8) | Compose `RadioButtonImpl` draw math |
| Inner dot rendered diameter (selected, at rest) | 10dp (fill radius 5dp = animated 6dp − stroke/2) | Compose `RadioButtonImpl`; matches material-web SVG r=5 |
| State layer size | 40dp | `md.comp.radio-button.state-layer.size`; `RadioButtonTokens.StateLayerSize` |
| Touch target | 48×48dp minimum | m3 Measurements + accessibility page; Compose `minimumInteractiveComponentSize()` |
| Focus ring | encircles the 40dp state layer with 2px offset (≈44dp ring), NOT the 20dp icon | material-web `_radio.scss` (`md-focus-ring` 44px); Compose `ripple(focusRingShape = CircleShape)` on the 40dp indication |

## Color tokens (complete set — 26 tokens on m3.material.io, no deprecated rows)

Icon = ring + dot; they always share one color. Site table verified current
(hover 0.08 / focus 0.10 / pressed 0.10 — no legacy 0.12 rows).

| State | Selected icon | Unselected icon | Selected state layer | Unselected state layer |
|---|---|---|---|---|
| Enabled | `primary` | `on-surface-variant` | — | — |
| Hovered | `primary` | `on-surface` | `primary` @ 0.08 | `on-surface` @ 0.08 |
| Focused | `primary` | `on-surface` | `primary` @ 0.10 | `on-surface` @ 0.10 |
| Pressed | `primary` | `on-surface` | **`on-surface`** @ 0.10 | **`primary`** @ 0.10 |
| Disabled | `on-surface` @ 0.38 | `on-surface` @ 0.38 | none (no disabled layer tokens) | none |

Two behaviors that are easy to get wrong, both confirmed in all three sources'
token sets:

1. **Pressed state-layer colors cross over**: pressing an *unselected* radio
   shows a `primary` layer (the target state's color); pressing a *selected*
   radio shows `on-surface`. Hover/focus do NOT cross over.
2. **Interaction shifts the unselected icon color** from `on-surface-variant`
   to `on-surface` on hover, focus, AND pressed.

Adjacent label text: `on-surface`, unchanged by interaction or selection
(m3 Color section). No error-state tokens, no dragged state, no shape token
(implicitly circular).

### Ruling R1 — interaction icon colors (m3 vs Compose runtime)

Compose's *shipped* code ignores the hover/focus/pressed icon-color tokens
(`RadioButtonColors` has only 4 slots; `radioColor(enabled, selected)` never
reads interaction state), even though `RadioButtonTokens` defines them.
m3.material.io (Priority #1) and the token layer in all three sources specify
the shift, and material-web implements it. **Ruling: implement the
interaction icon-color shift (row 2 above).** Compose's runtime omission is
recorded as a known difference, not followed.

### Ruling R2 — focus state layer (m3/Compose vs material-web)

material-web deliberately drops focus state layers (`$unsupported-tokens`),
rendering only the focus ring. m3 defines focus layer tokens @ 0.10 and
Compose renders focus interactions through the ripple indication.
**Ruling: show the 0.10 state layer on `:focus-visible`, in addition to the
focus ring.** This supersedes the earlier "FocusRing only, no focus layer"
decision recorded in `docs/audits/selection-controls.md` (marked superseded
there); Checkbox/Switch still follow the old decision — follow-up alongside
issues #75/#76.

## Motion

m3.material.io publishes NO motion values for radio button; Compose
(Priority #2) is the source. Compose androidx-main is fully spring-based via
`MotionScheme` (the old `MotionTokens` tween values are unused; both call
sites carry a TODO "load from component tokens"):

| Property | Spec | Standard scheme | Expressive scheme |
|---|---|---|---|
| Dot radius (0dp ↔ 6dp, **animates both directions**) | `FastSpatial` | spring(damping 0.9, stiffness 1400) ≈ ~150–200ms, near-critically damped (barely perceptible overshoot) | spring(0.6, 800) — visibly bouncy |
| Icon color | `DefaultEffects` | spring(1.0, 1600) ≈ ~100–150ms, no overshoot | identical |

- Enabled ↔ disabled color changes do NOT animate (snap; Compose L148–152).
- material-web's `300ms emphasized-decelerate` grow + fade-only uncheck is a
  legacy web-team choice (pre-spring motion system) — **do not follow**.
- CSS mapping guidance (project conventions): standard-scheme dot ≈ 150–200ms
  with standard/slight-overshoot easing on `transform: scale()`, shrinking on
  uncheck too; the springy `cubic-bezier(0.34, 1.4, 0.5, 1)` is only
  appropriate if we ever theme the Expressive motion scheme.

## Behavior & accessibility

- Semantics: each radio is `role=radio` with checked state exposed; group
  container is `role=radiogroup` labelled via `aria-label`/`aria-labelledby`.
  Our native `<input type="radio">` supplies role, state, native `<label>`
  association, and AT group-size announcement for free (material-web needs
  ElementInternals workarounds for all of these — do not copy them).
- Click/tap on the icon **or its label** selects; selecting never toggles off
  (clicking a selected radio re-selects, no `change`).
- Keyboard (m3 a11y table; native input behavior — assert in tests):
  - Tab into group → focuses the selected radio, or first if none;
    Shift+Tab → selected, or last if none.
  - Arrows move focus AND select, wrap around first/last, skip disabled
    radios, respect RTL (Left/Right invert), and fire `change`.
  - Space selects a focused unselected radio; no-op if already selected.
- Touch target 48×48 CSS px minimum; never density-reduce by default.
- Form: default `value` is `"on"`; group-aware `valueMissing` validation and
  localized messages come with the native input.
- Guidelines: every radio gets an adjacent label; stack groups vertically;
  ≤5 options (else use a menu/list); pre-select one where possible;
  provide an explicit "none" option if opting out must be possible.
- Disabled: 0.38 icon opacity, no state layer, not focusable, no animation.
- Compose precedent for composition: `onClick = null` renders a purely
  presentational radio (no semantics/target/ripple) for row-level selection —
  analogous situations on the web should put the input on the row, not hide
  a second interactive element.

## Known source differences recorded by this adjudication

| Topic | m3.material.io | Compose (shipped) | material-web | Ruling |
|---|---|---|---|---|
| Interaction icon colors | shift to on-surface / primary | tokens exist but unused (4-slot colors) | implements shift | follow m3 (R1) |
| Focus state layer | 0.10 tokens | rendered via ripple | intentionally unsupported | follow m3/Compose (R2) |
| Pressed/focus layer opacity | 0.10 | 0.10 (`StateTokens`) | 0.12 (v0.192 — legacy) | 0.10 |
| Dot uncheck motion | not specified | spring shrink 6→0dp | opacity fade only | follow Compose |
| Check motion | not specified | FastSpatial spring | 300ms emphasized-decelerate | follow Compose |

Minor source-quality note: Compose `ComponentStyles.kt` (internal styleable
path, not shipped) swaps the two disabled-opacity constants relative to their
names — harmless while both are 0.38; the public `RadioButtonDefaults` path
pairs them correctly. Watch if the values ever diverge.
