# Select (exposed dropdown menu) — adjudicated spec sheet

Date: 2026-10-13. Issue #434, phase 1 (non-editable select). Phase 2
(autocomplete, the editable combobox) shares the popup and the option
component (`src/internal/listbox`) and is covered in
docs/specs/autocomplete.md (ruling B42). API ruling:
docs/decisions/phase-b-api.md **B31** (listbox look, `openOnFocus`, label
placement and option supporting text: **B52**).

Sources:

- **m3.material.io** (Spec Priority #1), menus / guidelines, as quoted in
  #434: "Menus can open from many components, including icon buttons, split
  buttons, and text fields", "Text field dropdown menus", "A menu can open
  from a text field". This pass did not re-read the site (no rendered-page
  check, so there are no token-table values). The visual values below come
  from Compose.
- **Compose** (Spec Priority #2), androidx-main raw sources:
  `ExposedDropdownMenu.kt`, `Menu.kt`, `MenuDefaults.kt`,
  `tokens/MenuTokens.kt`, `tokens/SegmentedMenuTokens.kt`,
  `tokens/StandardMenuTokens.kt`, `tokens/FilledAutocompleteTokens.kt`, and
  `samples/.../ExposedDropdownMenuSamples.kt`. Line numbers refer to the
  2026-10-13 snapshot.
- **material-web** (Priority #3): `md-filled-select` / `md-outlined-select`,
  named in the issue as the web reference. Its values were not re-read. The
  ARIA pattern follows the WAI-ARIA APG select-only combobox instead.

## Structure (Compose)

| Aspect | Value | Source |
|---|---|---|
| Container | `ExposedDropdownMenuBox(expanded, onExpandedChange)` wraps an anchor plus `ExposedDropdownMenu` | `ExposedDropdownMenu.kt:137`, `:345` |
| Anchor type | `PrimaryNotEditable`: "a read-only text field". `PrimaryEditable` / `SecondaryEditable` are autocomplete (phase 2) | `:408–437` |
| Field | a `TextField(readOnly = true, singleLine)` with `ExposedDropdownMenuDefaults.textFieldColors()`. The colors are the text field's (FilledAutocompleteTokens: container surface-container-highest, trailing icon on-surface-variant, error → error, error hover → on-error-container) | samples `:72–83`; `FilledAutocompleteTokens` |
| Semantics | the anchor has `Role.DropdownList`, with `onClick` toggling | `:1008–1026` |
| Toggle | a pointer press anywhere on the anchor, or Enter / Space (key up), toggles `expanded` | `:949–1007` |
| Trailing icon | `Icons.Filled.ArrowDropDown`, `rotate(if (expanded) 180f else 0f)`, no animation | `:462–464` |
| Width | `exposedDropdownSize(matchAnchorWidth = true)`: min = max = anchor width | `:202–215`, `:300` |
| Max height | `calculateMaxHeight`: the larger of the room above and below the anchor, each minus `MenuVerticalMargin` (48dp) | `:1040–1059`; `Menu.kt:2324` |
| Position | `ExposedDropdownMenuPositionProvider`. x: start-to-anchor-start, else end-to-anchor-end, else window edge. y: top-to-anchor-bottom (**no gap**), else bottom-to-anchor-top, else clamped to the window | `:798–916` |
| Motion | `DropdownMenuContent`: scale 0.8 → 1 on FastSpatial, alpha on FastEffects, transform origin from the anchor intersection | `Menu.kt:1815–1872`, `:2216` |
| Container padding | 8dp vertical (`DropdownMenuVerticalPadding`), vertically scrollable | `Menu.kt:1866`, `:2386` |

## Listbox and option visuals: defaults vs. the Expressive sample

`ExposedDropdownMenu`'s **defaults** are the baseline menu: `MenuDefaults.shape`
(CornerExtraSmall, 4dp), `MenuDefaults.containerColor` (SurfaceContainer),
elevation Level2 (`MenuTokens`, `ExposedDropdownMenu.kt:351–354`), and baseline
`DropdownMenuItem`s (48dp, LabelLarge, 12dp padding).

The **current Compose sample** (`ExposedDropdownMenuSample`, samples `:65–113`)
uses the Expressive menu instead:

- `containerColor = MenuDefaults.groupStandardContainerColor`
  (StandardMenuTokens.ContainerColor = **SurfaceContainerLow**)
- `shape = MenuDefaults.standaloneGroupShape` (SegmentedMenuTokens.ContainerShape = **CornerLarge, 16dp**)
- `SelectableDropdownMenuItem(shapes = MenuDefaults.itemShape(index, count),
  selected, selectedLeadingIcon = Check (MenuDefaults.LeadingIconSize = 20dp),
  contentPadding = ExposedDropdownMenuDefaults.ItemContentPadding)`
- option text `MaterialTheme.typography.bodyLarge` (this is also
  SegmentedMenuTokens.ItemLabelTextFont)

### ~~Ruling SE1: follow the Expressive sample~~ — superseded by B52 (#518)

> **Superseded (2026-10-16, docs/decisions/phase-b-api.md B52).** m3.material.io
> has ACTIVE token sets "Text field - Select, filled / outlined"
> (`md.comp.{filled,outlined}-select`) and "Text field - Autocomplete, filled /
> outlined" (`md.comp.{filled,outlined}-autocomplete`) whose `menu.*` tokens are
> the **baseline menu**. Spec Priority #1 wins over the Compose sample, so the
> listbox now follows them — see "Ruling B52" below. SE1 and its table are
> kept struck through for the record.

~~This is an Expressive library, and the `Menu variant="vertical"` already
implements the same SegmentedMenuTokens / StandardMenuTokens mapping. A
Select that picks one value is the case `SelectableDropdownMenuItem` exists
for (`Role.RadioButton`, `Menu.kt:726`). **Ruling: the listbox and options
follow the sample's Expressive styling.** The baseline defaults are recorded
above for reference. If an owner wants the baseline look, the change is
limited to the `--_listbox-*` / `--_option-*` tokens, which since phase 2 live
in the shared `src/internal/listbox/Listbox.module.css` (Select and
Autocomplete both use them).~~

| Part | Value | Source |
|---|---|---|
| ~~Listbox container~~ | ~~surface-container-low, corner-large (16dp), shadow level 2, 8dp vertical padding~~ | ~~StandardMenuTokens.ContainerColor; SegmentedMenuTokens.ContainerShape; MenuTokens.ContainerElevation; `DropdownMenuVerticalPadding`~~ |
| ~~Option height~~ | ~~min 44dp~~ | ~~`SegmentedMenuTokens.Item`; `Menu.kt:2060`~~ |
| ~~Option inset~~ | ~~4dp horizontal (the item surface sits inside the container)~~ | ~~`DropdownMenuSelectableItemPadding`, `Menu.kt:2381`~~ |
| ~~Option content padding~~ | ~~**16dp horizontal, 0 vertical**~~ | ~~`ExposedDropdownMenuDefaults.ItemContentPadding`, `ExposedDropdownMenu.kt:794`, `:1085`~~ |
| ~~Icon–text spacing~~ | ~~8dp (12dp only with precision-pointer sizing, which is not adopted)~~ | ~~`MenuDefaults.itemHorizontalArrangement`, `MenuDefaults.kt:851–857`~~ |
| ~~Leading icon~~ | ~~20dp, on-surface-variant~~ | ~~`MenuDefaults.LeadingIconSize`; StandardMenuTokens.ItemLeadingIconColor~~ |
| ~~Label~~ | ~~body-large, on-surface~~ | ~~samples `:94`; StandardMenuTokens.ItemLabelTextColor~~ |
| ~~Shapes~~ | ~~first 12/4dp, middle 4dp, last 4/12dp, single 4dp; **selected 12dp** (CornerMedium)~~ | ~~`MenuDefaults.itemShape` / `leadingItemShape` / `trailingItemShape` / `selectedItemShape`~~ |
| ~~Selected~~ | ~~container tertiary-container, label and icons on-tertiary-container, the check mark replaces the start icon (with no start icon it expands in)~~ | ~~StandardMenuTokens.ItemSelected*; `Menu.kt:2066–2093`~~ |
| ~~Disabled~~ | ~~on-surface @ 0.38 (selected + disabled: container and content @ 0.38)~~ | ~~StandardMenuTokens.ItemDisabled* / ItemSelectedDisabled*~~ |
| ~~Motion~~ | ~~container color FastEffects, shape morph FastSpatial, check icon expand FastSpatial + fade FastEffects~~ | ~~`Menu.kt:2013–2020`, `:2071–2081`~~ |
| ~~State layers~~ | ~~hover 0.08 / pressed 0.10 of the label color (on-surface; selected on-tertiary-container), via the shared Ripple~~ | ~~StateTokens~~ |
| ~~Keyboard focus indicator~~ | ~~secondary ring (shared FocusRing), inset 3dp~~ | ~~SegmentedMenuTokens.ItemFocusIndicatorColor; MenuTokens.FocusIndicatorColor~~ |

### Ruling B52: the m3 select / autocomplete menu tokens

| Part | Value | Source |
|---|---|---|
| Listbox container | surface-container, corner extra-small (4dp), shadow level 2, 8dp vertical padding | m3 `md.comp.{filled,outlined}-select` / `-autocomplete` `menu.*`; Compose `FilledAutocompleteTokens.MenuContainer*` (tokens/FilledAutocompleteTokens.kt:23-31); padding `DropdownMenuVerticalPadding` (Menu.kt:2386) |
| Width | the field's (`matchAnchorWidth`); no 112–280dp clamp | `exposedDropdownSize(matchAnchorWidth = true)`; the 280dp `DropdownMenuItemDefaultMaxWidth` (Menu.kt:2390) is a menu-item rule, not a select rule |
| Option height | min 48dp (grows with wrapped text / supporting text) | m3 `menu.list-item.container.height`; `MenuListItemContainerHeight` (Menu.kt:2374) |
| Option inset / shape | full width, square corners (no positional or selected shapes) | baseline `DropdownMenuItemContent` (Menu.kt:2141-2198) |
| Option padding | 16dp horizontal (m3 silent), 8dp vertical (m3 vertical menu top / bottom space) | `ExposedDropdownMenuDefaults.ItemContentPadding`; m3 menus specs |
| Icon | 24dp, on-surface-variant; 12dp icon–text spacing | m3 select `menu` icon size; `ListTokens.ItemLeadingIconSize`; `DropdownMenuItemHorizontalPadding` (Menu.kt:2376) |
| Label | label-large, on-surface, **wraps** (no ellipsis) | m3 select `menu` label tokens; Compose `Text` without `maxLines` |
| Supporting text (`Option supportingText`) | body-small, on-surface-variant, wraps; disabled 38% | m3 `md.comp.menus.menu-item.supporting-text` (the select set has none); Compose Column layout (Menu.kt:2252-2262) |
| Selected | container surface-container-highest only — **no check mark**, label / icon colors unchanged, the start icon stays | m3 select `menu` selected list-item container token; the set has no selected label / icon / check token |
| Disabled | on-surface @ 0.38 (selected + disabled: container @ 0.38) | MenuTokens / m3 disabled opacity |
| Motion | listbox open scale + fade unchanged; option container color on FastEffects | `Menu.kt:1815–1872` |
| State layers / focus | hover 0.08 / pressed 0.10 of on-surface; secondary focus ring inset 3dp | StateTokens; `MenuTokens.FocusIndicatorColor` |
| Divider | n/a (the listbox has no dividers) | m3 `menu.divider` surface-variant 1dp |

## Web adaptations

| # | Topic | Compose | Ours | Why |
|---|---|---|---|---|
| SE2 | Focus while open | `PrimaryNotEditable` moves focus into the popup | focus **stays on the combobox**; the active option is exposed through `aria-activedescendant` | WAI-ARIA APG select-only combobox, the web screen-reader contract |
| SE3 | Anchor | the whole `TextField`, including its supporting text | the 56dp field container: the listbox sits directly below the field and covers the supporting text | Compose positions below its anchor's bounds, which would leave the supporting text between the field and the menu. The field is the visual anchor (material-web / MUI do the same) |
| SE4 | Gap | none (`topToAnchorBottom`) | none | — |
| SE5 | Max height | room on the larger side minus 48dp | room on the side used (the shared popup helper flips to the larger side when it doesn't fit) minus 48dp (helper margin 8px + 40px in CSS) | the same result, from the helper's `--_popup-available-height` |
| SE6 | Viewport clamp | window edges | 8px viewport margin (the same as Menu) | shared helper (B4) |
| SE7 | Navigation wrap | focus traversal in the popup | ArrowUp / ArrowDown stop at the ends (no wrap). Disabled options are skipped | APG select-only combobox. MUI Select skips disabled options by default |
| SE8 | Tab while open | n/a | commits the active option, closes, and moves focus on | APG select-only combobox ("Tab: sets the value to the focused option") |
| SE9 | Form | n/a | a visually hidden native `<input>` (not `type="hidden"`, so `required` takes part in validation) carries `name` / `value`. Form reset restores an uncontrolled `defaultValue` | web forms |
| SE10 | Open on focus | never (no focus listener, `ExposedDropdownMenu.kt:245`); m3 silent | opt-in `openOnFocus` (default `false`): focus opens on the selected option, the focus ring only for keyboard focus | MUI parity for forms that mix Select and Autocomplete (B52) |
| SE11 | Label placement | `TextFieldLabelPosition` on the anchor `TextField`; samples keep `Inside()`; m3 has no above label for dropdowns | `labelPlacement` / `shrinkLabel`, as TextField (B37); the listbox still sits below the 56dp container | B37 parity (B52) |

## Keyboard (APG select-only combobox)

| Key | Closed | Open |
|---|---|---|
| ArrowDown / ArrowUp | open on the selected option (or the first enabled one) | move by one enabled option, no wrap |
| Alt+ArrowDown | open | — |
| Alt+ArrowUp | — | select the active option and close |
| Enter / Space | open | select the active option and close |
| Home / End | open on the first / last enabled option | move to the first / last enabled option |
| PageUp / PageDown | — | move by 10 enabled options |
| printable characters | open on the next match (typeahead) | typeahead: a repeated character cycles, a typed prefix matches, and the buffer resets after a 500ms pause (shared with Menu) |
| Escape | (not consumed) | close without selecting. The event is consumed, so an enclosing modal stays open |
| Tab | normal | select the active option, close, and move focus on |

## Not in phase 1

- `multiple` (multi-select): Compose's `ExposedDropdownMenu` has no
  multi-select, and the m3 menu guidance doesn't describe one either. It is
  left for a later decision.
- Option groups and dividers inside the listbox. (Native mode renders
  `<optgroup>` natively — see "Native mode" below, B53.)
- Autocomplete: phase 2, docs/specs/autocomplete.md.

## Native mode (`<Select native>`, B53, #519)

Neither m3.material.io nor Compose has a native select (m3's menus and text
fields pages are silent; Compose's `ExposedDropdownMenuBox` always draws its
own popup). This is a web adaptation after MUI `Select native`; the ruling is
docs/decisions/phase-b-api.md B53.

| Part | Native mode |
|---|---|
| Field | the same TextField anatomy and tokens as above (filled / outlined / tonal, floating label, start icon, `ArrowDropDown`, supporting / error text, required `*`) around a real `<select>` (`appearance: none`) |
| Popup | the OS picker — the menu tokens above do not apply. No listbox, `Option`, typeahead or `aria-activedescendant` |
| Children | native `<option>` / `<optgroup>` |
| Label | floats when the selected value is non-empty, or while focused. An empty-value option counts as "nothing selected": its text shows (placeholder color) only while focused or without a label |
| Arrow | not rotated (the picker's open state is not observable) |
| Clicks | on the field padding, label or arrow focus the `<select>` and call `showPicker()` where supported |
| Form | `name` / `form` / `required` / `disabled` on the `<select>`; submit, validation and reset are native. Controlled values survive a reset |
| `ref` / `inputRef` | `ref` = the field root (A10, as in Select / TextField and MUI); `inputRef` = the `<select>` |
| `onChange` | `(event: ChangeEvent<HTMLSelectElement>, value)` |
| Not supported | `multiple`, `size` (no text-field sizes in m3), option icons, `open` / `placeholder` |
