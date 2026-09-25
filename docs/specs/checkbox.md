# Checkbox — adjudicated spec sheet

Date: 2026-09-26. Compiled from three independent research passes
(m3.material.io via Playwright — token names cross-checked against row DOM /
Compose androidx-main raw sources / material-web repo), adjudicated per the
Spec Priority in CLAUDE.md. Raw per-source reports were produced by the
`.claude/agents/*-researcher` subagents.

## Scope

One visual component, three selection states (**unselected / selected /
indeterminate**) and an **error** modifier that applies to all three
(m3 overview: "New indeterminate states as well as error states"). No size
variants, no Expressive configuration in any source. Compose ships
`Checkbox` + `TriStateCheckbox` (plus custom-stroke overloads); the
On→Off→Indeterminate cycling policy is left to the caller.

## Anatomy & dimensions

| Attribute | Value | Source |
|---|---|---|
| Container | **18×18dp**, 2dp rounded corners | `md.comp.checkbox.container.size` (the separate width/height tokens are deprecated on site); `CheckboxTokens.ContainerSize`; material-web 18px |
| Outline width (unselected, all states incl. disabled) | 2dp | site + `CheckboxTokens`; selected outline width 0 |
| Icon | 18dp (fills the container; mark drawn as fractions of container width) | `icon.size`; Compose draws relative to container |
| State layer | 40dp circle | `state-layer.size` |
| Touch target | 48×48dp | m3 Measurements + a11y; `minimumInteractiveComponentSize()` |

### Ruling C1 — container is 18dp (Compose default is legacy)

androidx-main **still ships 20dp + 2dp padding** behind
`ComposeMaterial3Flags.isCheckboxStylingFixEnabled = false` (default), whose
own KDoc calls the false-path "older Material Design 2 styling". The 18dp
value is: the site's current token, `CheckboxTokens.ContainerSize`, the
flag-ON path, and material-web. **Ruling: 18dp** (reaffirms the audit's
earlier 18dp ruling — our implementation is already correct). When following
Compose code details, prefer the flag-ON branch: checkmark geometry
start (0.25w, 0.5w) → cross (0.4w, 0.65w) → end (0.75w, 0.3w), and
`disabledCheckmarkColor` honored.

## Color tokens (complete m3 set; hover/focus/pressed icon+container colors
equal the base state, so only the differing values are tabled)

| State | Selected container / icon | Unselected outline | State layer (selected) | State layer (unselected) |
|---|---|---|---|---|
| Enabled | `primary` / `on-primary` | `on-surface-variant` 2dp | — | — |
| Hovered | unchanged | **`on-surface`** 2dp | `primary` @ 0.08 | `on-surface` @ 0.08 |
| Focused | unchanged | **`on-surface`** 2dp | `primary` @ 0.10 | `on-surface` @ 0.10 |
| Pressed | unchanged | **`on-surface`** 2dp | **`on-surface`** @ 0.10 | **`primary`** @ 0.10 |
| Disabled | `on-surface` @ 0.38 / icon `surface` | `on-surface` 2dp @ 0.38 | none | none |

- **Pressed state-layer colors cross over** (same rule as Radio; rows carry
  no deprecation): pressing unselected ripples `primary`, pressing selected
  ripples `on-surface`.
- **Error modifier** (all selection states): outline `error` (unselected),
  container `error` + icon `on-error` (selected/indeterminate); state layer
  `error` @ 0.08 / 0.10 / 0.10 for hover/focus/pressed.
- Indeterminate has **no dedicated color tokens** on the site — it uses the
  selected treatment (filled container, dash icon). Compose confirms:
  `On` and `Indeterminate` resolve identical colors when enabled.
- Deprecated site rows (warning icon — do not use): the old
  `disabled.{selected,unselected}.icon.*` naming (primary @ 0.38 — current
  disabled selected icon is `surface`), `unselected.icon.color`, unselected
  interaction `icon.color` rows, and the error `outline.width` variants.
- Adjacent label: `on-surface`, unchanged by interaction/selection.

### Ruling C2 — error state ships (m3 over Compose's missing API)

m3 fully tokenizes error for every state; Compose defines the error tokens
but exposes **no `isError` API or code path**; material-web lists them as
unsupported. **Ruling: keep our error prop/visuals per the m3 table**
(reaffirms the audit's ruling "site 優先 → 実装済みを維持").

### Ruling C3 — interaction outline color shift

Unselected outline `on-surface-variant` → `on-surface` on hover/focus/pressed
(m3; material-web implements; Compose's per-interaction tokens are dead —
same shape as Radio R1 / Switch S1). Follow m3; audit SC4 territory.

### Ruling C4 — focus state layer

Radio R2 applies: show the 0.10 layer on `:focus-visible` (m3 tokens +
Compose ripple vs material-web's deliberate omission). This is the Checkbox
half of the R2 follow-up in `docs/audits/selection-controls.md`.

## Motion (m3 silent; Compose is the source — flag-ON path where they differ)

Compose animates via `updateTransition(ToggleableState)`; every spec site is
TODO-flagged ("load from component tokens") but the shipped behavior is:

| Property | Transition | Spec (standard scheme) |
|---|---|---|
| Checkmark path draw (`checkDrawFraction` 0→1) | Off → On/Indeterminate | `DefaultSpatial` `spring(0.9, 700)` — the mark "draws itself" along the path via `PathMeasure.getSegment` |
| Mark disappear | any → Off | **snap after a 100ms delay** (`snap(delayMillis = 100)`) — no reverse draw |
| Check ↔ dash morph (`gravitationShiftFraction`) | On ↔ Indeterminate | `DefaultSpatial` spring — cross/left/right Y-points lerp to the centerline, collapsing the check into a dash |
| Container/border color | to Off: `FastEffects` `spring(1.0, 3800)`; to On/Ind: `DefaultEffects` `spring(1.0, 1600)` | colors snap when disabled (no enabled↔disabled animation) |

- Expressive theme changes only `DefaultSpatial` → `spring(0.8, 380)`
  (bouncier draw/morph); effects springs are identical.
- material-web's 150ms exit / 350ms enter fades+scale and its
  prev-state-class system (`prev-checked` etc.) are a web approximation —
  its **structure** is instructive (keep the outgoing mark's shape while
  fading; never morph from unselected — draw in place), and matches
  Compose's "snap to Off / draw from Off" semantics.
- CSS mapping guidance: draw-in ≈ 200–350ms path/scale with standard easing
  (spring(0.9, 700) settles ≈ 250ms); disappear = fast fade/snap (~100ms),
  never a reverse draw; check↔dash = shape morph, not crossfade.

## Behavior & accessibility

- Semantics: native `<input type="checkbox">`; **indeterminate must reach AT**
  — set the native `input.indeterminate` IDL property AND `aria-checked="mixed"`
  (material-web's dual-exposure technique; remove aria-checked entirely when
  not indeterminate so native semantics win). This is issue #74's target.
- Compose exposes tri-state via `triStateToggleable` state descriptions;
  `Role.Checkbox`.
- Clicking an indeterminate checkbox follows native behavior: indeterminate
  clears, checked becomes true.
- Form: indeterminate submits **nothing** (`getFormValue` → null), matching
  native; default value `"on"`.
- Parent/child pattern (guidelines): some-but-not-all children checked →
  parent indeterminate; activating an indeterminate parent checks all.
- Keyboard: Space toggles (native). The site's checkbox keyboard table is
  **corrupted** (copy-pasted Chips content) — treat native checkbox + APG as
  the spec. Unlike Switch, Enter does NOT toggle a checkbox.
- Label click toggles; label `on-surface`; 48dp target, no default density.
- Disabled: no state layer, snap transitions, not focusable.
- Forced colors: container `CanvasText`, mark `Canvas`, disabled `GrayText`
  @ opacity 1 (material-web pattern, matches our HCM convention).

## Known source differences recorded by this adjudication

| Topic | m3.material.io | Compose (shipped) | material-web | Ruling |
|---|---|---|---|---|
| Container size | 18dp (current token) | 20dp + 2dp pad (flag off = self-described MD2 legacy) | 18px | **18dp** (C1) |
| Error state | fully tokenized | tokens only, no API | tokens unsupported | ship it (C2) |
| Interaction outline shift | on-surface | tokens dead | implements | follow m3 (C3) |
| Focus state layer | 0.10 tokens | ripple | unsupported | show it (C4) |
| Pressed/focus layer opacity | 0.10 | 0.10 | 0.12 (legacy) | 0.10 |
| Indeterminate tokens | none (uses selected treatment) | same colors as On | selected treatment | selected treatment |
| Uncheck motion | not specified | snap after 100ms delay | 150ms fade w/ shape held | follow Compose semantics |
