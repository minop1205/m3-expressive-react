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
