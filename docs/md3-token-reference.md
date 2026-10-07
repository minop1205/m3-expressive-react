# Material Design 3 (Expressive) — Authoritative Token Reference

> Source of truth for the token pipeline. Values verified against the live
> `material-components/material-web` token modules (`v0_192`, baseline MD3) and
> the `androidx` Jetpack Compose `material3` token sources (Expressive deltas).
> Do not edit values without re-verifying against these sources.

## 1. State Layer Opacities

Source: `material-web/tokens/versions/v0_192/_md-sys-state.scss`

| State   | Opacity |
| ------- | ------- |
| Hover   | 0.08    |
| Focus   | 0.12    |
| Pressed | 0.12    |
| Dragged | 0.16    |

Opacity of the on-color overlay (e.g. `on-surface`, `on-primary`) painted over the component.

## 2. Elevation

| Level | dp  |
| ----- | --- |
| 0     | 0   |
| 1     | 1   |
| 2     | 3   |
| 3     | 6   |
| 4     | 8   |
| 5     | 12  |

MD3 expresses elevation with **shadow** (ambient + key) AND a **surface tint** overlay
(`surface-tint` = `primary`) whose opacity grows with level. Later guidance prefers
`surface-container-*` roles over tonal tint, but the tint mechanism remains in tokens.

## 3. Type Scale (Roboto; regular=400, medium=500; 1rem=16px)

| Role            | Size            | Line-height   | Weight | Letter-spacing       |
| --------------- | --------------- | ------------- | ------ | -------------------- |
| Display Large   | 57px (3.5625rem)| 64px (4rem)   | 400    | -0.25px (-0.015625rem)|
| Display Medium  | 45px (2.8125rem)| 52px (3.25rem)| 400    | 0                    |
| Display Small   | 36px (2.25rem)  | 44px (2.75rem)| 400    | 0                    |
| Headline Large  | 32px (2rem)     | 40px (2.5rem) | 400    | 0                    |
| Headline Medium | 28px (1.75rem)  | 36px (2.25rem)| 400    | 0                    |
| Headline Small  | 24px (1.5rem)   | 32px (2rem)   | 400    | 0                    |
| Title Large     | 22px (1.375rem) | 28px (1.75rem)| 400    | 0                    |
| Title Medium    | 16px (1rem)     | 24px (1.5rem) | 500    | 0.15px (0.009375rem) |
| Title Small     | 14px (0.875rem) | 20px (1.25rem)| 500    | 0.1px (0.00625rem)   |
| Body Large      | 16px (1rem)     | 24px (1.5rem) | 400    | 0.5px (0.03125rem)   |
| Body Medium     | 14px (0.875rem) | 20px (1.25rem)| 400    | 0.25px (0.015625rem) |
| Body Small      | 12px (0.75rem)  | 16px (1rem)   | 400    | 0.4px (0.025rem)     |
| Label Large     | 14px (0.875rem) | 20px (1.25rem)| 500    | 0.1px (0.00625rem)   |
| Label Medium    | 12px (0.75rem)  | 16px (1rem)   | 500    | 0.5px (0.03125rem)   |
| Label Small     | 11px (0.6875rem)| 16px (1rem)   | 500    | 0.5px (0.03125rem)   |

## 4. Shape Scale

| Token                              | dp                |
| ---------------------------------- | ----------------- |
| None                               | 0                 |
| Extra Small                        | 4                 |
| Small                              | 8                 |
| Medium                             | 12                |
| Large                              | 16                |
| Large Increased (Expressive)       | 20                |
| Extra Large                        | 28                |
| Extra Large Increased (Expressive) | 32                |
| Extra Extra Large (Expressive)     | 48                |
| Full                               | 9999px (fully rounded) |

The three "Expressive" rows (20/32/48) come from Compose `ShapeTokens.kt`, not baseline
`material-web`. Directional variants exist (e.g. `corner-large-top: 16px 16px 0 0`).

## 5. Motion

### Easing (cubic-bezier)

| Token                 | cubic-bezier            |
| --------------------- | ----------------------- |
| Linear                | 0, 0, 1, 1              |
| Standard              | 0.2, 0, 0, 1            |
| Standard Accelerate   | 0.3, 0, 1, 1            |
| Standard Decelerate   | 0, 0, 0, 1              |
| Emphasized            | 0.2, 0, 0, 1            |
| Emphasized Accelerate | 0.3, 0, 0.8, 0.15       |
| Emphasized Decelerate | 0.05, 0.7, 0.1, 1       |
| Legacy                | 0.4, 0, 0.2, 1          |
| Legacy Accelerate     | 0.4, 0, 1, 1            |
| Legacy Decelerate     | 0, 0, 0.2, 1            |

`emphasized` as a single cubic-bezier (`0.2,0,0,1`) is a lossy approximation of the true
two-segment path; use the accelerate/decelerate pair for accurate emphasized motion.

### Web-adaptation easing (not MD3 system tokens)

Curves with no MD3 / Compose counterpart, adopted from material-web by an
explicit owner ruling. They live in `src/styles/tokens.css` under the
`--md-web-motion-*` prefix (deliberately not `--md-sys-*`), so component code
still contains no raw `cubic-bezier(` (`src/theme/motionUsage.test.ts`).

| Token | cubic-bezier | Used by | Ruling |
| --- | --- | --- | --- |
| `--md-web-motion-easing-back-out` | 0.175, 0.885, 0.32, 1.275 | Switch handle slide (300ms = `duration-medium2`) | #373 — match material-web `_handle.scss` |

These do not follow `ThemeProvider motionScheme` and are not zeroed by the
reduced-motion token override — the using component must turn the transition
off under `prefers-reduced-motion: reduce` itself (Switch does).

### Duration tokens (ms)

|            | 1   | 2   | 3   | 4    |
| ---------- | --- | --- | --- | ---- |
| Short      | 50  | 100 | 150 | 200  |
| Medium     | 250 | 300 | 350 | 400  |
| Long       | 450 | 500 | 550 | 600  |
| Extra-long | 700 | 800 | 900 | 1000 |

### Expressive springs (damping ratio / stiffness)

Standard scheme:

| Spring          | Damping | Stiffness |
| --------------- | ------- | --------- |
| Spatial Fast    | 0.9     | 1400      |
| Spatial Default | 0.9     | 700       |
| Spatial Slow    | 0.9     | 300       |
| Effects Fast    | 1.0     | 3800      |
| Effects Default | 1.0     | 1600      |
| Effects Slow    | 1.0     | 800       |

Expressive scheme (lower-damped spatial → overshoot/bounce):

| Spring          | Damping | Stiffness |
| --------------- | ------- | --------- |
| Spatial Fast    | 0.6     | 800       |
| Spatial Default | 0.8     | 380       |
| Spatial Slow    | 0.8     | 200       |
| Effects Fast    | 1.0     | 3800      |
| Effects Default | 1.0     | 1600      |
| Effects Slow    | 1.0     | 800       |

Source: Compose `MotionScheme.kt`, `tokens/StandardMotionTokens.kt`,
`tokens/ExpressiveMotionTokens.kt` (androidx-main, token version v0_14_0). JS
access: `spatialSprings` / `effectsSprings` in `src/tokens/motion.ts`.

### Motion-scheme spring tokens (CSS)

Every spring is also exposed as CSS custom properties, so component CSS never
hardcodes a spring approximation:

```
--md-sys-motion-spring-{fast|default|slow}-{spatial|effects}-duration   /* e.g. 360ms */
--md-sys-motion-spring-{fast|default|slow}-{spatial|effects}-easing     /* linear(…) */
--md-sys-motion-spring-{fast|default|slow}-{spatial|effects}-damping    /* raw, unitless */
--md-sys-motion-spring-{fast|default|slow}-{spatial|effects}-stiffness  /* raw, unitless */
```

**Scheme switch.** `:root` carries the **expressive** values (library default,
ruling B2). `<ThemeProvider motionScheme="standard">` renders
`data-md-motion-scheme="standard"` on its root element, and tokens.css
redeclares the spring tokens for `[data-md-motion-scheme='standard']` (and
`'expressive'`, so providers nest). Effects springs are identical in both schemes.

| Spring          | Expressive (ζ / k → duration) | Standard (ζ / k → duration) |
| --------------- | ----------------------------- | --------------------------- |
| Fast spatial    | 0.6 / 800 → 360ms, peak 1.094 | 0.9 / 1400 → 230ms, ≈ 1.000 |
| Default spatial | 0.8 / 380 → 440ms, peak 1.015 | 0.9 / 700 → 320ms, ≈ 1.000  |
| Slow spatial    | 0.8 / 200 → 600ms, peak 1.015 | 0.9 / 300 → 490ms, ≈ 1.000  |
| Fast effects    | 1.0 / 3800 → 150ms            | same                        |
| Default effects | 1.0 / 1600 → 240ms            | same                        |
| Slow effects    | 1.0 / 800 → 330ms             | same                        |

**Derivation** (`src/theme/motionScheme.ts`; regenerate with
`node scripts/generate-motion-tokens.ts`, a unit test fails on drift):

1. Analytic step response of the damped spring (unit mass, ω₀ = √k, start 0 →
   target 1, zero initial velocity): for ζ < 1,
   `d(t) = e^(−ζω₀t)·(cos ω_d t + ζω₀/ω_d · sin ω_d t)`, ω_d = ω₀√(1−ζ²);
   for ζ = 1, `d(t) = (1 + ω₀t)·e^(−ω₀t)`. Progress = 1 − d(t).
2. Duration = last time |d(t)| ≥ 0.001 (0.1 % of the travel), rounded up to
   10ms — the CSS counterpart of Compose stopping at the visibility threshold.
3. Progress is sampled every 1ms over the duration and simplified
   (Ramer–Douglas–Peucker, 0.002 tolerance) into `linear()` stops. `linear()`
   accepts values > 1, so overshoot is encoded exactly (max error < 0.005).
   Browser support: Chrome 113, Firefox 112, Safari 17.2.

**Usage** — always pair duration and easing of the same spring; pick spatial
for size / position / shape, effects for color / opacity:

```css
.thing {
  transition:
    border-radius var(--md-sys-motion-spring-fast-spatial-duration)
      var(--md-sys-motion-spring-fast-spatial-easing),
    opacity var(--md-sys-motion-spring-fast-effects-duration)
      var(--md-sys-motion-spring-fast-effects-easing);
}
```

A CSS transition interrupted mid-flight restarts from the current value with
zero velocity (a true spring keeps its momentum) — acceptable for press and
toggle morphs; JS-driven animations that need velocity continuity should read
the raw damping / stiffness instead (`readSpring` / `stepSpring` in
`src/internal/spring.ts`).

**Reduced motion (ruling B3).** Under `prefers-reduced-motion: reduce`,
tokens.css redeclares the three **spatial** durations as `0ms` (for `:root`
and every `[data-md-motion-scheme]`, after the scheme rules), so spatial
motion driven by the tokens is instant while effects springs keep their
color / opacity fade — "instant or fade-only" with no per-component rule.
A component rule is still needed for keyframe animations, for spatial
properties animated on an effects token (e.g. the bounce-free press morph),
and JS motion must check `prefersReducedMotion()`. Only indeterminate
progress keeps a minimal motion (ProgressIndicator / LoadingIndicator).
VRT captures with reduced motion and animations disabled, so baselines are
unaffected.

**Component mapping** (Compose `MotionSchemeKeyTokens` per animation; #314):

| Component | Spatial | Effects |
| --- | --- | --- |
| Button / IconButton / SplitButton press morph | — (DefaultEffects: "prevent any bounce", B5) | DefaultEffects (shape), FastEffects (IconButton colors) |
| Button toggle (selected) morph, ButtonGroup press width | FastSpatial | — |
| SplitButton chevron rotate / offset | FastSpatial | — |
| SegmentedButton check scale-in, label shift | FastSpatial | DefaultEffects (check fade, icon crossfade) |
| Chip filter check slot | FastSpatial (expand) | DefaultEffects (shrink), SlowEffects / FastEffects (fade in / out) |
| Fab extended morph, FabMenu | FastSpatial | FastEffects |
| Tooltip / Menu open-close; Menu item + group shape morph | FastSpatial (scale, shape) | FastEffects (fade, item color) |
| Snackbar enter / exit | FastSpatial (scale) | FastEffects (fade; exit length = 150ms) |
| NavigationBar / NavigationRail item indicator | DefaultSpatial | DefaultEffects |
| NavigationRail expand / modal slide (JS) | DefaultSpatial | DefaultEffects (scrim, shadow) |
| NavigationDrawer (modal) | DefaultSpatial (open) | FastEffects (close), DefaultEffects (scrim in) |
| Tabs indicator; tab label color | DefaultSpatial | DefaultEffects (to selected) / FastEffects |
| SearchBar docked view | DefaultSpatial (expand) / FastSpatial (collapse) | content fades stay Compose tweens |
| AppBar / Toolbar | FastSpatial (slots, padding) | DefaultEffects (color, snap / hide) |
| DatePicker | FastSpatial (menu arrow) | DefaultEffects (year reveal, mode switch) |
| TimePicker | DefaultSpatial (hand) | DefaultEffects (dial crossfade) |
| Checkbox | DefaultSpatial (draw, check↔dash, fill scale) | DefaultEffects in / FastEffects out |
| RadioButton | FastSpatial (dot grow) | DefaultEffects (ring color, dot shrink†) |
| Switch | FastSpatial (icon rotate only) — thumb offset / size follow material-web (#373, see below) | — (colors: material-web 67ms) |
| TextField | FastSpatial (label, indicator / outline width, notch) | FastEffects (colors), SlowEffects / FastEffects (content show / hide) |
| Badge | FastSpatial (scale-in) | DefaultEffects (scale-out†) |
| Carousel item press shape | — (DefaultEffects, as B5) | — |
| BottomSheet / SideSheet scrim | — | DefaultEffects |

† Shrinking to `scale(0)` uses the critically damped DefaultEffects: an
expressive overshoot past 0 would render a mirrored dot / badge.

**Not scheme keys — stay on `--md-sys-motion-duration-*` / `-easing-*`:**
elevation (`box-shadow`; Compose `ElevationDefaults` tweens), state layers /
Ripple / FocusRing, Dialog and the DatePicker / TimePicker modal enter
(platform dialog), BottomSheet / SideSheet slide (`BottomSheetAnimationSpec`
tween 300ms FastOutSlowIn), SwipeToDismiss settle (`AnchoredDraggableDefaults`
tween), determinate progress (`ProgressAnimationSpec`, a fixed non-bouncy
spring), Slider (no Compose motion), Switch colors and thumb (web adaptation #373:
slide 300ms `--md-web-motion-easing-back-out`, press grow `duration-short2`
linear, release / selection resize `duration-medium1` `easing-standard` —
material-web values, superseding Compose FastSpatial + snap-while-pressed),
Checkbox mark
visibility gating and the any→unchecked `snap(delayMillis = 100)` hold.
`src/theme/motionUsage.test.ts` rejects `cubic-bezier(` in component code,
leftover `TODO(#314)`, unpaired spring easing / duration, and JS motion
without a reduced-motion check.

## 6. Color System / Dynamic Color

System color roles (from `_md-sys-color.scss`):

`primary, on-primary, primary-container, on-primary-container, secondary, on-secondary,
secondary-container, on-secondary-container, tertiary, on-tertiary, tertiary-container,
on-tertiary-container, error, on-error, error-container, on-error-container, background,
on-background, surface, on-surface, surface-variant, on-surface-variant, outline,
outline-variant, shadow, scrim, inverse-surface, inverse-on-surface, inverse-primary,
surface-tint, surface-dim, surface-bright, surface-container-lowest, surface-container-low,
surface-container, surface-container-high, surface-container-highest, primary-fixed,
primary-fixed-dim, on-primary-fixed, on-primary-fixed-variant` (+ secondary/tertiary `*-fixed`).

### `@material/material-color-utilities` API

- `themeFromSourceColor(argbFromHex('#rrggbb'))` → `Theme` with `.schemes.light/.dark`.
- Low-level (recommended): build a `DynamicScheme` (`SchemeTonalSpot` default; also
  `SchemeVibrant`, `SchemeExpressive`, `SchemeNeutral`, ...) from an `Hct` seed + `isDark`,
  then read roles via `MaterialDynamicColors` (e.g. `MaterialDynamicColors.primary.getArgb(scheme)`).
- `argbFromHex` / `hexFromArgb` convert hex ↔ internal ARGB ints.
- `SpecVersion.SPEC_2025` opts into the updated Expressive color algorithm.
- For light + dark: instantiate the scheme twice from one seed `Hct` (isDark false/true).

## 7. MD3 Expressive — deltas vs baseline

- Expanded shape scale (20/32/48dp) + Material Shapes library + shape morphing.
- Physics-based motion (spring tokens above); `MotionScheme.expressive()` / `.standard()`.
- Emphasized typography (heavier/larger for emphasis; roles unchanged).
- Updated color algorithm (`SPEC_2025`); more `surface-container` / accent-container usage.
- ~28-30 new/updated components; multi-size scale (xsmall..xlarge) and press-time shape morph.

### Pipeline caveats

- `material-web` SCSS = baseline only; Expressive shape/spring numbers come from `androidx`.
- Single-cubic-bezier `emphasized` is lossy; use accel/decel pair when accuracy matters.
- Elevation level0-5 → dp 0,1,3,6,8,12.
