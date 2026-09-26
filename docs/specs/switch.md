# Switch — adjudicated spec sheet

Date: 2026-09-26. Compiled from three independent research passes
(m3.material.io via Playwright + the site's raw `TOKEN_TABLE` JSON /
Compose androidx-main raw sources / material-web repo), adjudicated per the
Spec Priority in CLAUDE.md. Raw per-source reports were produced by the
`.claude/agents/*-researcher` subagents.

## Scope

One component; the only configuration axis is the **thumb icon**: none /
icon on selected only / icon on both (m3 Configurations; Compose
`thumbContent`; material-web `icons` + `show-only-selected-icon`).
No size variants and no Expressive visual variant anywhere — Expressive
affects only the theme motion scheme (bouncier thumb spring). Compose ships
exactly one `Switch` composable; drag-to-toggle is a Compose TODO
(b/223797571) and absent from material-web — clicking/keyboard only.

## Anatomy & dimensions (all three sources agree)

| Attribute | Value | Source |
|---|---|---|
| Track | 52×32dp, `corner.full`, outline 2dp (unselected only; selected track has no outline — Compose draws it `Color.Transparent`) | `md.comp.switch.track.*`; `SwitchTokens` L113–123 |
| Handle (unselected, no icon) | 16×16dp | `unselected.handle.*`; `UnselectedHandleWidth` |
| Handle (selected, or any state with icon) | 24×24dp | `selected.handle.*` / `with-icon.handle.*`; Compose `hasContent || checked → 24dp` |
| Handle (pressed, either selection) | 28×28dp | `pressed.handle.*`; `PressedHandleWidth` |
| Handle travel | thumb path = 52 − 24 − 4 = 24dp; unselected rest offset 8dp, selected 24dp; pressed hugs the 2dp outline (2dp / 22dp) | Compose `ThumbNode` L295–305 |
| Icon | 16dp both states; handle is 24dp whenever an icon shows | `*.icon.size`; `SwitchDefaults.IconSize` |
| State layer | 40dp circle, travels **with the handle** | `state-layer.size`; Compose indication on thumb Box; mweb ripple in handle container |
| Touch target | 48×48dp | m3 Measurements; `minimumInteractiveComponentSize()` |
| Deprecated (do not use) | handle 20dp single-size, handle elevation/shadow | m3 rows with warning icon (pre-update elevated-thumb design) |

## Color tokens

Enabled (all sources agree):

| Part | Selected | Unselected |
|---|---|---|
| Track | `primary` | `surface-container-highest` + 2dp `outline` border |
| Handle | `on-primary` | `outline` |
| Icon | `primary` | `surface-container-highest` |

Interaction states (hover / focus / pressed — same colors for all three):

| Part | Selected | Unselected |
|---|---|---|
| Handle | **`primary-container`** | **`on-surface-variant`** |
| Icon | `primary` | `surface-container-highest` |
| Track | unchanged | unchanged (outline stays `outline`) |
| State layer | `primary` @ 0.08 / 0.10 / 0.10 | `on-surface` @ 0.08 / 0.10 / 0.10 |

Disabled (Compose composites every color over `surface`):

| Part | Selected | Unselected |
|---|---|---|
| Track | `on-surface` @ **0.12** | `surface-container-highest` @ 0.12, outline `on-surface` @ 0.12 |
| Handle | `surface` @ **1.0** (not dimmed) | `on-surface` @ 0.38 |
| Icon | `on-surface` @ 0.38 | `surface-container-highest` @ 0.38 |

### Ruling S1 — interaction handle colors (m3 vs Compose runtime)

Compose's shipped `SwitchColors` has no hover/focus/pressed slots — the
hover/focus/pressed handle-color tokens are dead in Compose, exactly like
Radio's R1. m3 (Priority #1) specifies the shift and material-web implements
it. **Ruling: implement the interaction handle-color shift** (selected →
`primary-container`, unselected → `on-surface-variant`). Reaffirms the
selection-controls audit's SC4 ruling.

### Ruling S2 — focus state layer

Radio's R2 applies unchanged: m3 defines the 0.10 focus layer, Compose
renders focus through the ripple, material-web deliberately doesn't.
**Show the 0.10 state layer on `:focus-visible`** (in addition to the focus
ring). This is the Switch half of the R2 follow-up recorded in
`docs/audits/selection-controls.md`.

### Note — NO pressed color cross-over on Switch

Unlike Radio and Checkbox, the pressed state-layer colors do **not** swap:
selected pressed stays `primary`, unselected pressed stays `on-surface`
(m3 token table, non-deprecated; material-web v0.192 agrees). Do not copy
the Radio/Checkbox cross-over here.

### Note — track outline `outline` is CURRENT for Switch

The button-family "outline vs outline-variant" legacy issue does not apply:
m3 and Compose both map the unselected track outline to `md.sys.color.outline`.
(Compose trivia: `SwitchDefaults` reads it via the focus-state token
`UnselectedFocusTrackOutlineColor`; both resolve to `outline`.)

## Motion (m3 silent; Compose is the source)

- Thumb **slide and size** animate with one spec: `MotionScheme.FastSpatial`
  — standard `spring(0.9, 1400)` ≈ 150–200ms, near-critically damped;
  Expressive theme `spring(0.6, 800)` (bouncy). While **pressed, changes
  snap** (`SnapSpec`, zero duration) — the 28dp press squeeze and any
  press-time slide are instant.
- Track/handle **colors do not animate** in Compose (instant switch); icon
  has **no crossfade** in Compose (drawn statically). material-web's 300ms
  overshoot bezier, 250ms size morph, and 33ms/167ms icon rotate-crossfade
  are hand-tuned web choices, not spec values — structure may inspire, but
  Compose wins on values per Spec Priority.
- CSS mapping guidance: slide/size ≈ 150–200ms standard easing (springy
  `cubic-bezier(0.34, 1.4, 0.5, 1)` only under an Expressive motion theme);
  pressed size change instant; disabled changes snap (`transition: none`).
- RTL: material-web's logical `margin-inline` technique is the right web
  mechanism for the slide.

## Behavior & accessibility

- Semantics: native input with `role="switch"` semantics; Compose uses
  `Role.Switch` + `toggleable`. material-web renders
  `<input type="checkbox" role="switch">` — with a light-DOM native input we
  keep native `<label>` association (their aria-label caveat is a shadow-DOM
  workaround; do not copy).
- Keyboard: Tab focuses the switch; **Space AND Enter toggle** (m3 a11y
  page; native checkbox lacks Enter — material-web adds it manually per the
  APG switch pattern; we must too).
- Feedback: handle grows to 28dp on press; effect is immediate (no save).
- Focus ring: `secondary`, 3dp, 2dp outer offset (m3 focus.indicator.*);
  material-web rings the whole track pill (track corner shape) — adopt the
  track-pill ring shape.
- Disabled: colors above, no state layer, not focusable, transitions off.
- Density: never reduce the 48dp target by default.
- Labels: inline label describing what the switch controls; label color
  `on-surface`, never changes with state.

## Known source differences recorded by this adjudication

| Topic | m3.material.io | Compose (shipped) | material-web | Ruling |
|---|---|---|---|---|
| Interaction handle/icon colors | shift (primary-container / on-surface-variant) | tokens exist, unused (no color slots) | implements | follow m3 (S1) |
| Focus state layer | 0.10 tokens | ripple/theme-gated inset ring | unsupported | follow m3 (S2) |
| Pressed state-layer opacity | 0.10 | 0.10 (`StateTokens`) | 0.12 (v0.192 legacy) | 0.10 |
| Thumb motion | not specified | FastSpatial spring; snap while pressed | 300ms overshoot bezier | follow Compose |
| Icon crossfade | not specified | none (static) | 33ms opacity + 167ms rotate | follow Compose (none); revisit if m3 ever specs it |
| Drag-to-toggle | not specified | TODO b/223797571 (absent) | absent | out of scope |

material-web bug noted in passing (do not copy): `_track.scss` uses
`.unselected:focus-visible` on a non-focusable div — a dead selector; the
working pattern is `:focus-within`-equivalent (our `:has(.input:focus-visible)`).
