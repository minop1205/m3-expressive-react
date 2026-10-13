# Drag handle (VerticalDragHandle) — adjudicated spec sheet

Date: 2026-10-13 (#444). Sources: Jetpack Compose androidx-main, raw sources
under `compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/`:
`DragHandle.kt` (cited as `DH:<line>`) and `tokens/DragHandleTokens.kt`
(`DHT:<line>`). m3.material.io has no drag handle component page; Compose's
KDoc links the foundations page "Understanding layout → Parts of layout"
(DH:50–51), which only describes the handle in prose (not checked here: the
Playwright MCP browser was not used for this item). material-web has no drag
handle. API ruling: **B44** in `docs/decisions/phase-b-api.md`.

## Spec position

- Compose ships one public composable, `VerticalDragHandle(modifier, sizes,
  colors, shapes, interactionSource)` (DH:73), with per-state value classes
  `DragHandleColors` (DH:138), `DragHandleShapes` (DH:169) and
  `DragHandleSizes` (DH:200), and `VerticalDragHandleDefaults` (DH:223).
  There is no horizontal variant (the bottom sheet's handle is a different
  component, `BottomSheetDefaults.DragHandle`).
- The handle itself does **not** drag anything: it only reports interactions.
  The pane-resize behaviour (`Modifier.paneExpansionDraggable`, keyboard /
  semantics) lives in `material3-adaptive`, which is outside this library's
  reference set. The Web behaviour below therefore follows the WAI-ARIA APG
  window splitter pattern.

## Values

| Item | Value | Source |
|---|---|---|
| Resting size | **4 × 48dp** (`Width` × `Height`) | DHT:67–68, DHT:46–47, DH:340 |
| Pressed size | **12 × 52dp** | DHT:61–62, DHT:55–56, DH:341 |
| Dragged size | **12 × 52dp** | DHT:42–43, DHT:36–37, DH:342 |
| Resting color | **Outline** | DHT:24–25, DH:320 |
| Pressed / dragged color | **OnSurface** | DHT:49–50, DHT:30–31, DH:321–322 |
| Resting shape | **CornerFull** | DHT:64–65, DH:331 |
| Pressed / dragged shape | **CornerMedium** (12dp) | DHT:58–59, DHT:39–40, DH:332–333 |
| Elevation | Level0 in every state | DHT:33–34, DHT:45, DHT:52–53 |
| Container width | **24dp** (`ContainerWidth`; not read by `VerticalDragHandle` itself — the pane spacer it sits in) | DHT:27–28 |
| Touch target | `minimumInteractiveComponentSize()` → 48dp | DH:87 |
| State precedence | dragged > pressed > rest, for size, shape and color | DH:91–96, DH:100–105, DH:117–122 |
| Pressed trigger | pointer down (Initial pass) until up / cancel | DH:346–358 |
| Dragged trigger | `collectIsDraggedAsState()` on the interaction source (a `DragInteraction` from the caller's draggable) | DH:82 |
| Transitions | none — the size, shape and color switch instantly (no `animate*`) | DH:84–126 |
| State layer | `indication(interactionSource, ripple())`, clipped to the current shape | DH:97, DH:125 |

## Web adaptation (B44)

- Host: a focusable `<div role="separator" aria-orientation="vertical">`,
  24px wide (`ContainerWidth`), at least 52px tall, centring the capsule; a
  `::before` gives the 48 × 52px touch target. `cursor: col-resize`,
  `touch-action: none`.
- Pointer: pointer down = pressed; the first horizontal movement = dragged
  (`onDragStart`); every move reports `startValue ± dx` clamped to
  `[min, max]` through `onChange(event, value)`; release / cancel / lost
  capture = `onDragEnd`.
- Keyboard (APG window splitter): ←/→ by `step` (Shift: `shiftStep`),
  Page Up / Page Down by `shiftStep`, Home / End to `min` / `max`, ↑/↓ grow /
  shrink. The optional Enter (collapse / restore) and F6 (pane cycling) keys
  are not implemented (they need app-level pane knowledge).
- State layers: the shared `Ripple` inside the capsule, driven by the host
  (`control`), with `dragged` for the 0.16 layer. `FocusRing` sized to the
  capsule.
- Disabled: not in Compose. Web addition: `aria-disabled`, out of the tab
  order, capsule at on-surface 38% (the standard disabled content color).
- Reduced motion: nothing to do — there is no animation.
