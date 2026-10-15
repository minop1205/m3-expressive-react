# Autocomplete (editable exposed dropdown menu) — adjudicated spec sheet

Date: 2026-10-13. Issue #434, phase 2 (the editable combobox). Phase 1, the
non-editable `Select`, is in docs/specs/select.md, and this sheet only covers
what differs from it. API ruling: docs/decisions/phase-b-api.md **B42**.

Sources:

- **m3.material.io** (Spec Priority #1), menus / guidelines, as quoted in
  #434: "A menu can include a text field to filter options. This pattern is
  also known as autocomplete." and "Menu items ease into their new position
  as the menu is filtered." This pass did not re-read the site.
- **Compose** (Spec Priority #2), androidx-main raw sources:
  `ExposedDropdownMenu.kt` and
  `samples/.../ExposedDropdownMenuSamples.kt` (`EditableExposedDropdownMenuSample`).
  Line numbers refer to the 2026-10-13 snapshot.
- **material-web** (Priority #3) has no autocomplete. The ARIA pattern
  follows the WAI-ARIA APG
  [editable combobox with list autocomplete](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-autocomplete-list/).

## Structure (Compose)

| Aspect | Value | Source |
|---|---|---|
| Anchor | an editable `TextField` with `menuAnchor(PrimaryEditable)`: "When this anchor opens the menu, focus will remain on the text field in order to allow typing" | `ExposedDropdownMenu.kt:418–426`; samples `:130–136` |
| Trailing icon | `ExposedDropdownMenuDefaults.TrailingIcon` with `menuAnchor(SecondaryEditable)`: "a better experience for certain accessibility services to choose a menu option without typing". Its semantics are `Role.Button` with the `Strings.ToggleDropdownMenu` description and an expanded / collapsed state. A press on it is consumed, so it toggles without moving the caret | samples `:140–148`; `:1008–1013`, `:156`, `:966–969` |
| Primary anchor semantics | `Role.DropdownList`; a semantic click focuses the field and shows the soft keyboard | `:1014`, `:1018–1023` |
| Keys | Enter toggles the menu (Space types a space); Tab / ArrowUp / ArrowDown move into the menu while it is open | `:978–1004` |
| Filtering | the sample filters the options by the text (subsequence match, case-insensitive, matched characters underlined) and keeps the menu closed while nothing matches: `expanded = allowExpanded && filteredOptions.isNotEmpty()` | samples `:121–127`, `:264–288` |
| Pick | `setTextAndPlaceCursorAtEnd(option.text)` and close | samples `:160–163` |
| Items | plain `DropdownMenuItem` (no selected state), body-large, `ItemContentPadding` | samples `:157–166` |
| Height | the sample caps the menu at 280dp (`heightIn(max = 280.dp)`) | samples `:153` |
| Listbox, positioning, open motion | the same as the non-editable menu | docs/specs/select.md |

## Adjudication

| # | Topic | Compose | Ours | Why |
|---|---|---|---|---|
| AC1 | Listbox and options | the sample uses baseline `DropdownMenuItem`s with no selected state | the shared Select listbox (`src/internal/listbox`): the Expressive options of SE1, with the selected value checked | one look for both exposed dropdown menus. Showing the current value while filtering is the MUI default too |
| AC2 | Focus | `PrimaryEditable` keeps focus in the field. Arrow keys / Tab move focus into the menu | focus **always stays in the input**. The active option is exposed through `aria-activedescendant` | APG editable combobox, the web screen-reader contract (as SE2) |
| AC3 | Filter | the sample matches a subsequence | the default `filterOptions` keeps the options whose label **contains** the text, ignoring case and accents (MUI `createFilterOptions`). `filterOptions` replaces it | the sample's matcher is sample code, not an API default. Substring matching is what web users expect from MUI |
| AC4 | No match | the menu stays closed | closed, unless `noOptionsText` is given, which shows an inert row in a plain list (no `role="listbox"`, which must own options) | Compose by default; the MUI message is opt-in |
| AC5 | Filtering motion | none in Compose (the menu recomposes) | m3: options that stay **ease into their new position** (a FLIP translate on DefaultSpatial) and new ones fade in (DefaultEffects). Reduced motion: no motion (the spatial token is 0ms and the JS skips the move) | the m3 guideline. Item moves are spatial, so they use the spatial spring; the fade is effects |
| AC6 | Toggle button | `SecondaryEditable` icon, `Role.Button` | a `<button tabindex="-1">` named by `toggleLabel` (default `'Toggle dropdown menu'`, the Compose string) with `aria-expanded` / `aria-controls`. 48dp touch target. Presses keep focus in the input | APG (the optional button is not in the Tab order) + Compose semantics |
| AC7 | Height | 280dp cap in the sample | no fixed cap; the shared listbox's room-minus-48dp rule (SE5) | the cap is sample code. The shared rule already keeps the list on screen |
| AC8 | Space | types a space; Enter toggles | Space types; Enter picks the active option (it never opens the list). ArrowDown / Alt+ArrowDown open | APG list autocomplete |
| AC9 | Text after leaving | n/a | without `freeSolo`, unmatched text returns to the selected option's label on blur, and clearing the text clears the value. With `freeSolo`, the text is committed as the value on Enter and on blur (an exact label match commits that option's value) | MUI `clearOnBlur` for the first. Committing on blur keeps the form value and the visible text in sync |
| AC10 | Showing all on open | n/a | when the text is still the picked option's label, opening shows every option (the selected one checked) | MUI `inputPristine` |

## Keyboard (APG list autocomplete, no automatic selection)

| Key | Closed | Open |
|---|---|---|
| typing | opens the filtered listbox with no active option | filters; no option is active |
| ArrowDown | opens on the selected option (or the first enabled one) | next enabled option, wrapping to the first |
| ArrowUp | opens on the last enabled option | previous enabled option, wrapping to the last |
| Alt+ArrowDown | opens with no active option | — |
| Alt+ArrowUp | — | closes |
| Enter | `freeSolo`: commits the text | picks the active option (value, its label in the input) and closes; with no active option it closes (and `freeSolo` commits the text) |
| Escape | ~~clears the text and the value~~ superseded by the B42 addendum (#517): with `clearOnEscape`, clears the text and the value (consumed); without it (default), nothing — the key propagates, so an enclosing Dialog closes | closes, keeping the text. Consumed, so an enclosing modal stays open |
| Home / End / ArrowLeft / ArrowRight | move the caret | move the caret; visual focus returns to the input |
| Tab | normal | closes (the text is committed or reverted as in AC9) and moves on |

Disabled options are announced (`aria-disabled`) and skipped.

## Not in phase 2

- Multiple values (chips), async loading, grouping, and the clear button
  (`clearOnEscape` clears with Escape instead). Kept lean per #434.
- Highlighting the matched text (the Compose sample underlines it).
