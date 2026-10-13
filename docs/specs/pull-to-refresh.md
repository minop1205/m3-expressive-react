# Pull to refresh — adjudicated spec sheet

Date: 2026-10-13 (#441). Sources: m3.material.io loading-indicator overview
(quoted in #441), and Jetpack Compose androidx-main at
`ff2eff7956ef478526de475d1f242b2e1d8778ce`, raw sources under
`compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/`:
`pulltorefresh/PullToRefresh.kt` (cited as `PTR:<line>`),
`LoadingIndicator.kt` (`LI:<line>`) and `tokens/LoadingIndicatorTokens.kt`.
material-web has no pull-to-refresh. API ruling: **B32** in
`docs/decisions/phase-b-api.md`.

## Spec position

- **m3.material.io** has no pull-to-refresh component page. The loading
  indicator overview says it is "Used for pull-to-refresh interactions" and
  "Loading indicators are used in the pull-to-refresh behavior". No dimension
  or token table exists, so **Compose is the source** for every value below.
- **Compose** ships `PullToRefreshBox` (PTR:135; the `PTR:172` overload
  without `enabled` / `threshold` is `DeprecationLevel.HIDDEN`), the
  `Modifier.pullToRefresh` node, and two indicators in
  `PullToRefreshDefaults`: `Indicator` (circular arrow → spinner) and the
  Expressive `LoadingIndicator` (`ContainedLoadingIndicator`). The file still
  says "TODO: Link to Material design specs when available".

## Gesture

| Item | Value | Source |
|---|---|---|
| Positional threshold | **80dp** (`PullToRefreshDefaults.PositionalThreshold`) | PTR:490 |
| Drag resistance | `DragMultiplier = 0.5` — `adjustedDistancePulled = distancePulled × 0.5` | PTR:306, PTR:922 |
| Progress | `adjustedDistancePulled / threshold` | `progress` getter |
| Indicator offset ≤ threshold | linear: `adjustedDistancePulled` | `calculateVerticalOffset` PTR:408 |
| Indicator offset > threshold | `overshoot = progress − 1`, `t = clamp(overshoot, 0, 2)`, `tension = t − t²/4`, offset = `threshold × (1 + tension)` → `distanceFraction` tops out at **2** | PTR:408–422 |
| Refresh trigger | on release, `adjustedDistancePulled > threshold` (strictly greater) and not already refreshing | `onRelease` PTR:385 |
| While refreshing | the pull consumes nothing (no new pull) | `consumeAvailableOffset` |
| Start condition | nested scroll: only the **remaining** downward delta after the child list has scrolled to its top (`onPostScroll`), `UserInput` source only; an upward delta first un-pulls (`onPreScroll`) | `onPreScroll` / `onPostScroll` |
| Disabled | `enabled = false` → no consumption | `onPreScroll` / `onPostScroll` |

## Indicator box (`PullToRefreshDefaults.IndicatorBox`)

| Item | Value | Source |
|---|---|---|
| Max distance | `IndicatorMaxDistance = PositionalThreshold` (80dp); **not** scaled with a custom `threshold` | PTR:496 |
| Position | `translationY = distanceFraction × maxDistance − height` (fully hidden above the top at 0, top edge at 32dp / 40dp at the threshold) | PTR:553 |
| Clip | content clipped at the box top (`clipRect(top = 0)`) | PTR:536 |
| Shape | `CircleShape` (`indicatorShape`) | PTR:455 |
| Shadow | shown only while `distanceFraction > 0 || isRefreshing` | `layerBlock` |

### Circular flavor (`Indicator`)

| Item | Value | Source |
|---|---|---|
| Container | 40dp (`SpinnerContainerSize`), `surfaceContainerHigh` | PTR:534, PTR:898, PTR:464 |
| Elevation | `Elevation = ElevationTokens.Level2` | PTR:499 |
| Indicator color | `onSurfaceVariant` | PTR:477 |
| Spinner | 16dp (`SpinnerSize`), stroke 2.5dp, arc radius 5.5dp | PTR:893–897 |
| Pulling | `CircularArrowProgressIndicator`: first 40 % of progress discarded, arc trim ≤ 0.8 turn, arrow 10×5dp scaled with progress; alpha 0.3 below the threshold, 1 at / past it (animated, DefaultEffects) | `ArrowValues`, PTR:796, PTR:913 |
| Refreshing | `CircularProgressIndicator(strokeWidth = 2.5dp)` (no track) | `Indicator` |

### Loading flavor (`LoadingIndicator`, Expressive)

| Item | Value | Source |
|---|---|---|
| Container | 48 × 48dp (`LoadingIndicatorDefaults.ContainerWidth/Height` = `LoadingIndicatorTokens` 48dp) | PTR:907–910, LI:504–507 |
| Elevation | `LoadingIndicatorElevation = ElevationTokens.Level0` | PTR:502 |
| Colors | `containedContainerColor` = PrimaryContainer, `containedIndicatorColor` = OnPrimaryContainer (`LoadingIndicatorTokens.Contained*`) — Compose leaves "TODO Set the LoadingIndicator colors" at the call sites | PTR:473, PTR:487, LI:527–532 |
| Pulling | determinate `ContainedLoadingIndicator(progress = distanceFraction)`; past 1 the whole indicator rotates `−(progress − 1) × 180°` | PTR:686 |
| Refreshing | indeterminate `ContainedLoadingIndicator` | `LoadingIndicator` |

## Motion

| Animation | Compose | Here |
|---|---|---|
| Determinate ↔ indeterminate | `Crossfade(MotionSchemeKeyTokens.DefaultEffects)` | opacity on the DefaultEffects spring tokens |
| Arrow alpha 0.3 ↔ 1 | `animateFloatAsState(DefaultEffects)` | same |
| Settle to threshold / to hidden | `Animatable.animateTo(1f / 0f)` with the default `spring()` (no bounce, StiffnessMedium 1500) — **not** a MotionScheme key (PTR:766–770) | `transform` on `--md-sys-motion-duration-medium1` + `--md-sys-motion-easing-standard` (a ζ = 1, k = 1500 spring settles in ≈ 240ms), like the other non-scheme Compose specs (docs/md3-token-reference.md §5) |
| Following the finger | snap (`state.snapTo`) | no transition while pulling |

## Web adaptation (ruling B32)

- **Scroll container.** Compose consumes nested-scroll leftovers from any
  scrollable child. The web component *is* the scroll container
  (`overflow-y: auto; overscroll-behavior-y: contain`); a pull starts only
  when it and every scrollable ancestor of the pointer target inside it are at
  `scrollTop === 0`.
- **Input.** Touch via non-passive `touchmove` (prevents the native
  scroll / overscroll while pulling); mouse and pen via Pointer Events with
  pointer capture. An 8px touch slop (Android `touchSlop`) is subtracted, as
  Compose's scrollable does before deltas reach the connection. An upward or
  horizontal move first is left to scrolling; a click that ends a real pull is
  swallowed.
- **Fidelity notes.** The overall `rotate(values.rotation)` of the arrow is
  kept (Compose passes the turn fraction as degrees, so it is < 2°). Moving
  back up after a pull un-pulls to 0 but does not hand the remaining delta to
  the list within the same gesture.
- **Reduced motion (B3).** No spatial pull motion: the indicator stays at its
  threshold position and fades with `min(1, distanceFraction)`; the
  determinate shape still reflects progress, the overshoot rotation is
  dropped. The indeterminate loading indicator keeps its own reduced-motion
  behavior.
- **Accessibility.** The gesture is not keyboard-reachable: apps must offer a
  visible refresh control. The root has `aria-busy="true"` while refreshing;
  a `role="status"` live region (outside the busy root, so it is not
  suppressed) announces `refreshingLabel`. The indicator is `aria-hidden`.
