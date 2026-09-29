# Migrating to v1

v1 aligns the public API with MUI conventions: **event-first `onChange`
handlers, `startIcon`/`endIcon`, a unified `xs–xl` size scale, `open`-family
popup props, semantic color props, and refs that always point at the root
element**. Design (MD3/Compose fidelity) is unchanged — every change below is
API-only, with zero visual difference.

All changes are clean breaks unless a deprecated alias is explicitly noted.

## 1. `onChange` is now `(event, value)` everywhere

Every change handler receives the triggering event first and the value
second (MUI style).

| Component | Before | After |
|---|---|---|
| Checkbox | `onChange(checked, event)` | `onChange(event, checked)` |
| Switch | `onChange(selected, event)` | `onChange(event, selected)` |
| Slider | `onChange(value, event)` | `onChange(event, value)` |
| SearchBar | `onChange(value, event)` | `onChange(event, value)` |
| Radio | `onChange(event)` | `onChange(event, value)` — `value` is the radio's value string |
| Chip | `onSelectionChange(selected)` | **renamed** `onChange(event, selected)` |
| Button / IconButton (toggle) | `onChange(selected)` | `onChange(event, selected)` |
| NavigationBar / NavigationRail / NavigationDrawer / Tabs / SegmentedButton | `onChange(value)` | `onChange(event, value)` |

```tsx
// Before
<Switch selected={on} onChange={(next) => setOn(next)} />
// After
<Switch selected={on} onChange={(event, next) => setOn(next)} />
```

Unchanged on purpose:

- **TextField** keeps the native `onChange(event)` (read the value from
  `event.target.value`) — this is already MUI's text-input behavior.
- **DatePicker / TimePicker** keep value-first `onChange(value)` for now;
  MUI X pickers are value-first, so event-first would break that parity.
- **RadioGroup** already used `(event, value)` — no change.
- `onOpenChange(open)` / `onClose()` are open-state callbacks, not change
  handlers, and keep their single-argument shapes.

## 2. `leadingIcon` / `trailingIcon` → `startIcon` / `endIcon`

Applies to the content-flanking icon pairs on **MenuItem, SearchBar,
TextField**.

```tsx
// Before
<TextField leadingIcon={<Search />} trailingIcon={<Clear />} />
// After
<TextField startIcon={<Search />} endIcon={<Clear />} />
```

Not renamed: single `icon` props (Chip, Fab, …), state-specific icons
(`selectedIcon`, Switch's icon slots), and List's generic `leading` /
`trailing` slots (they accept non-icon content).

## 3. Slider sizes: `s` / `m` / `l` → `sm` / `md` / `lg`

The five-step scale family (Button, IconButton, ButtonGroup, SplitButton,
Slider) now shares one vocabulary: `xs | sm | md | lg | xl`.

```tsx
// Before                       // After
<Slider size="l" />             <Slider size="lg" />
```

`xs` and `xl` are unchanged. Fab (`small/regular/medium/large`) and Badge
(`small/large`) keep their MD3-specific scale names.

## 4. `SegmentedButtons` → `SegmentedButton`

The component and its props type are singular now:

```tsx
// Before
import { SegmentedButtons, type SegmentedButtonsProps } from 'md3-react'
// After
import { SegmentedButton, type SegmentedButtonProps } from 'md3-react'
```

The old names still work in this release as **deprecated aliases** (your
editor will show strikethrough + a hint) and will be removed in the next
release. This is the only rename that keeps an alias.

## 5. SearchBar: `expanded` → `open` / `defaultOpen` / `onOpenChange`

SearchBar's expanding search view now uses the same open-state API as Menu:

| Before | After |
|---|---|
| `expanded={isOpen}` | `open={isOpen}` |
| — | `defaultOpen` (new, uncontrolled initial state, default `false`) |
| `onExpandedChange={(v) => …}` | `onOpenChange={(open) => …}` |

Modal components (Dialog, BottomSheet, SideSheet, NavigationDrawer) keep
`onClose` — that convention is unchanged.

## 6. FAB: `color` + `tonal` instead of token-string colors

The old union leaked design-token names into the API. The new API is a
semantic color plus a tonal switch (`tonal` defaults to `true`, which is the
container palette — the old default):

| Before | After |
|---|---|
| `color="primary-container"` *(old default)* | *(nothing — new defaults are equivalent)* |
| `color="secondary-container"` | `color="secondary"` |
| `color="tertiary-container"` | `color="tertiary"` |
| `color="primary"` | `color="primary" tonal={false}` |
| `color="secondary"` | `color="secondary" tonal={false}` |
| `color="tertiary"` | `color="tertiary" tonal={false}` |

Rendered colors are pixel-identical for every equivalent pair.

The Extended FAB's container-follow mode also moved out of `expanded`,
which is a plain `boolean` again:

| Before | After |
|---|---|
| `expanded="container"` | `followContainer` (new boolean prop, default `false`; `expanded` is ignored while it is set) |

## 7. Refs point at the root; composite inputs gain `inputRef`

MUI parity: the forwarded `ref` is always the root element, and `{...rest}`
also lands on the root.

| Component | `ref` now points at | Native control access |
|---|---|---|
| TextField | root `<div>` (was the input/textarea) | new `inputRef` |
| SearchBar | root `<div role="search">` (was the input) | new `inputRef` |
| Chip | root `<span>` (was the primary-action button) | — |
| Checkbox | root `<span>` (was the input) | new `inputRef` |
| Radio | root `<span>` (was the input) | new `inputRef` |
| Switch | root `<span>` (was the input) | new `inputRef` |
| Slider | root `<span>` (unchanged) | new `inputRef` — the **first** range input (the start/minimum thumb of a range slider) |

Unlike TextField/SearchBar, `{...rest}` on the selection controls
(Checkbox, Radio, Switch) still lands on the **native input** — their props
extend `InputHTMLAttributes`, so `name` / `value` / form wiring keep flowing
through rest as before. Only the forwarded `ref` moved. (Slider's rest
already landed on the root and is unchanged.)

```tsx
// Before: ref reached the native input
const ref = useRef<HTMLInputElement>(null)
<TextField ref={ref} />            // ref.current?.focus()
// After
const inputRef = useRef<HTMLInputElement>(null)
<TextField inputRef={inputRef} />  // inputRef.current?.focus()
```

Because `{...rest}` moved to the root on TextField/SearchBar:

- Input-specific props you need are now **dedicated props**: `type`, `name`,
  `placeholder`, `required`, `readOnly`, `autoComplete` (TextField), plus
  `id` / `autoFocus` / `inputMode` which still route to the input.
- Attributes without a dedicated prop (`pattern`, `min`, `max`, `step`,
  TextField `onKeyDown`, …) no longer reach the input via rest — route them
  through the new **`inputProps`** escape hatch instead, which spreads extra
  attributes on the native control:

  ```tsx
  <TextField inputProps={{ pattern: '[0-9]*', onKeyDown: handleKey }} />
  ```

  `inputProps` never overrides the component's own wiring: the controlled
  `value` / `onChange`, `type`, and every dedicated prop you set win over
  conflicting `inputProps` keys.
- `className` / `style` / `data-*` / `aria-*` from rest style or annotate
  the **root** now. On SearchBar, `aria-label` names the search landmark;
  give the searchbox itself a distinct name via
  `inputProps={{ 'aria-label': … }}` (or rely on `placeholder`).

## Quick checklist

1. Flip argument order (or add the event) in every `onChange` — the compiler
   finds these for you.
2. Rename `leadingIcon`/`trailingIcon` → `startIcon`/`endIcon`
   (MenuItem/SearchBar/TextField), `onSelectionChange` → `onChange` (Chip).
3. `Slider size`: `s`→`sm`, `m`→`md`, `l`→`lg`.
4. `SegmentedButtons` → `SegmentedButton` (alias still works this release).
5. SearchBar: `expanded`→`open`, `onExpandedChange`→`onOpenChange`.
6. Fab: map token-string colors per the table above;
   `expanded="container"` → `followContainer`.
7. TextField/SearchBar/Checkbox/Radio/Switch `ref` users: switch to
   `inputRef` for the native control; move input-only rest attributes to
   dedicated props, or to `inputProps` (TextField/SearchBar) when no
   dedicated prop exists.
