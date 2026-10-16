'use client'

import {
  cloneElement,
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
  type SyntheticEvent,
} from 'react'
import clsx from 'clsx'
import { usePopupPosition } from '../../internal/usePopupPosition'
import { useFormReset } from '../../internal/useFormReset'
import { useControllableState } from '../../internal/useControllableState'
import { useIsoLayoutEffect } from '../../internal/useIsoLayoutEffect'
import { assignRef } from '../../internal/assignRef'
import { prefersReducedMotion } from '../../internal/spring'
import { ArrowDropDownIcon } from '../../internal/icons'
import {
  Listbox,
  Option,
  collectOptions,
  firstEnabled,
  lastEnabled,
  stepEnabled,
  type OptionData,
  type OptionProps,
} from '../../internal/listbox/Listbox'
import fieldStyles from '../TextField/TextField.module.css'
import type { TextFieldLabelPlacement } from '../TextField/TextField'
import styles from './Autocomplete.module.css'
import { useLocaleProps } from '../../internal/locale'

export type AutocompleteVariant = 'filled' | 'outlined'

/** Where the label sits — the same values as TextField `labelPlacement` (B37). */
export type AutocompleteLabelPlacement = TextFieldLabelPlacement

/** An entry of the `options` prop: a string (value = label) or an object. */
export type AutocompleteOption =
  | string
  | {
      /** The value the option selects (submitted with the form). */
      value: string
      /** The text shown in the list and, once picked, in the input. */
      label: string
      /** Visible, inert, and skipped by keyboard navigation. */
      disabled?: boolean
      /** A second line below the label, as `Option supportingText` (not matched by filtering). */
      supportingText?: ReactNode
    }

/** An option as `filterOptions` sees it (from `options` or from `Option` children). */
export interface AutocompleteOptionItem {
  value: string
  /** Plain-text label: the `options` label, or an `Option`'s `textValue` / text content. */
  label: string
  disabled: boolean
}

/** The second argument of `filterOptions`. */
export interface AutocompleteFilterState {
  /** The text to filter by: `''` while the input still shows the committed value. */
  inputValue: string
}

export interface AutocompleteProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'children' | 'defaultValue' | 'onChange' | 'color' | 'placeholder'
> {
  /** Text field container style (the same two as `TextField`). @default 'filled' */
  variant?: AutocompleteVariant
  /**
   * Floating label; also names the input and the listbox. Rendered with a trailing `*` when `required`.
   *
   * Accepts rich content (text, emphasis, a small icon) — keep it short and
   * on one line, as m3 asks: the label is a single line (truncated with an
   * ellipsis), clicks on it go to the field, and the outlined notch draws a
   * hidden copy of it to measure its width. So no links or buttons in the
   * label, and no elements with an `id`.
   */
  label?: ReactNode
  /**
   * Where the label sits, as TextField `labelPlacement` (B37 / B52):
   * `'floating'` inside the container (the outlined variant notches the
   * border), `'above'` minimized above the container. The listbox still
   * opens right below the container. @default 'floating'
   */
  labelPlacement?: AutocompleteLabelPlacement
  /**
   * Keep the floating label minimized even while the input is empty, and
   * show the placeholder (TextField `shrinkLabel`). No effect without a
   * `label` or with `labelPlacement="above"`. @default false
   */
  shrinkLabel?: boolean
  /** The options, as strings or `{ value, label, disabled, supportingText }` objects. Use `Option` children instead for icons. */
  options?: readonly AutocompleteOption[]
  /** `Option` elements (direct children or inside Fragments), used when `options` is not given. */
  children?: ReactNode
  /** Controlled value (`''` = nothing selected; with `freeSolo`, any text). */
  value?: string
  /** Uncontrolled initial value. @default '' */
  defaultValue?: string
  /**
   * Fires when the value changes: an option is picked, the input is cleared
   * (or Escape clears it, with `clearOnEscape`), or — with `freeSolo` — typed text is committed with
   * Enter or on blur. Not fired on form reset.
   */
  onChange?: (event: SyntheticEvent, value: string) => void
  /** Controlled text of the input. */
  inputValue?: string
  /**
   * Uncontrolled initial text of the input. Defaults to the label of
   * `defaultValue` (or `defaultValue` itself with `freeSolo`).
   */
  defaultInputValue?: string
  /** Fires on every change of the input text: typing, picking an option, clearing, and the reset on blur. */
  onInputChange?: (event: SyntheticEvent, inputValue: string) => void
  /** Controlled open state of the listbox. */
  open?: boolean
  /** Uncontrolled initial open state. @default false */
  defaultOpen?: boolean
  /** Notified when the listbox should open or close. */
  onOpenChange?: (open: boolean) => void
  /**
   * Open the listbox when the input receives focus (with no active option).
   * Neither m3 nor Compose opens on focus, so this is opt-in, as in MUI
   * (B52). @default false
   */
  openOnFocus?: boolean
  /**
   * Accept any text, not only an option: Enter (with no option active) or
   * leaving the field commits the typed text as the value — as typed, even
   * when it equals an option's label (an option is selected only by picking
   * it, B52). Without it, the text returns to the selected option's label on
   * blur. @default false
   */
  freeSolo?: boolean
  /**
   * Escape with the listbox closed clears the input and the value (and is
   * consumed). Without it, that Escape does nothing and reaches enclosing
   * handlers — an enclosing Dialog closes. Escape with the listbox open only
   * closes the listbox either way. @default false
   */
  clearOnEscape?: boolean
  /**
   * Custom filtering. Receives every option and `{ inputValue }`; returns the
   * options to show, in order. The default keeps the options whose label
   * contains the text, ignoring case and accents.
   */
  filterOptions?: (
    options: AutocompleteOptionItem[],
    state: AutocompleteFilterState,
  ) => AutocompleteOptionItem[]
  /**
   * Shown in the listbox when no option matches. Without it the listbox
   * closes instead (Compose `EditableExposedDropdownMenuSample`).
   */
  noOptionsText?: ReactNode
  /**
   * Accessible name of the trailing toggle button (Compose
   * `Strings.ToggleDropdownMenu`). @default 'Toggle dropdown menu'
   */
  toggleLabel?: string
  /** Form field name of the hidden native input that carries the value. */
  name?: string
  /** Associates the hidden native input with a `<form>` elsewhere in the page (native `form` attribute). */
  form?: string
  /** Disables the field (and leaves the value out of form submission). @default false */
  disabled?: boolean
  /** Requires a value for form submission (native constraint validation) and appends `*` to the label. @default false */
  required?: boolean
  /** Error state — error colors, `aria-invalid`, and `errorText`. Ignored while `disabled`. @default false */
  error?: boolean
  /**
   * Helper line below the field. Replaced by `errorText` while in error.
   * Accepts rich content — a short link is fine (it stays reachable and is
   * part of the field's description via `aria-describedby`); keep it to
   * about one line, as m3 asks.
   */
  supportingText?: ReactNode
  /**
   * Shown instead of `supportingText` (with `role="alert"`) when `error` is set.
   * Accepts rich content, like `supportingText`.
   */
  errorText?: ReactNode
  /** Icon at the start of the field (decorative). */
  startIcon?: ReactNode
  /** Stretch the field (and therefore the listbox) to the container's width. @default false */
  fullWidth?: boolean
  /** Placeholder of the input (shown once the label has floated, or always without a label). */
  placeholder?: string
  /** Applied to the `role="combobox"` `<input>`. */
  id?: string
  /** Focus the input on mount. */
  autoFocus?: boolean
  /** Ref to the `role="combobox"` text `<input>` (the forwarded `ref` points at the root). */
  inputRef?: Ref<HTMLInputElement>
}

/** Gap between the field and the listbox: none (Compose `topToAnchorBottom`). */
const ANCHOR_GAP_PX = 0

/** Minimum distance the listbox keeps from the viewport edges when clamped. */
const VIEWPORT_MARGIN_PX = 8

/** Lower-cased, accent-free, trimmed text for the default filter (MUI `createFilterOptions`). */
function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

/** The default `filterOptions`: label contains the input text, ignoring case and accents. */
function defaultFilterOptions(
  options: AutocompleteOptionItem[],
  { inputValue }: AutocompleteFilterState,
): AutocompleteOptionItem[] {
  const needle = normalize(inputValue)
  if (needle === '') return options
  return options.filter((option) => normalize(option.label).includes(needle))
}

/** `options` entries as option data (each rendered as an `Option`). */
function fromOptionsProp(options: readonly AutocompleteOption[]): OptionData[] {
  return options.map((entry) => {
    const {
      value,
      label,
      disabled = false,
      supportingText,
    } = typeof entry === 'string'
      ? { value: entry, label: entry, supportingText: undefined }
      : entry
    return {
      value,
      label,
      disabled,
      children: label,
      element: (
        <Option value={value} disabled={disabled} supportingText={supportingText}>
          {label}
        </Option>
      ) as ReactElement<OptionProps>,
    }
  })
}

/**
 * Material Design 3 Autocomplete — the editable exposed dropdown menu
 * (Compose `ExposedDropdownMenuBox` + an editable `TextField` with the
 * `PrimaryEditable` anchor and a `SecondaryEditable` trailing icon, as in
 * `EditableExposedDropdownMenuSample`). m3 menus guidelines: "A menu can
 * include a text field to filter options. This pattern is also known as
 * autocomplete."
 *
 * The field is the `TextField` anatomy with a real text `<input>`; typing
 * filters the listbox, which is the one `Select` uses (top layer, field
 * width, the m3 select / autocomplete menu tokens — B52). Options that
 * stay ease into their new position as the list is filtered (DefaultSpatial;
 * none under reduced motion).
 *
 * Accessibility follows the WAI-ARIA APG editable combobox with list
 * autocomplete: the input is `role="combobox"` with `aria-autocomplete="list"`
 * and keeps focus while the listbox is open; the active option is exposed
 * through `aria-activedescendant`. ArrowDown / ArrowUp open and move (wrapping),
 * Alt+ArrowDown opens without moving, Enter picks the active option (or
 * commits the text with `freeSolo`), Escape closes the listbox (consumed, so an
 * enclosing Dialog stays open) and, when it is already closed, clears the field
 * with `clearOnEscape` — else it is left to enclosing handlers. Typing opens the listbox without
 * activating an option. The trailing arrow is a button (`tabindex="-1"`) that
 * toggles the listbox.
 *
 * A visually hidden native `<input>` carries `name` / `value` for form
 * submission, `required` validation, and form reset.
 */
export const Autocomplete = forwardRef<HTMLDivElement, AutocompleteProps>(function Autocomplete(
  inProps,
  forwardedRef,
) {
  const {
    variant = 'filled',
    label,
    labelPlacement = 'floating',
    shrinkLabel = false,
    options: optionsProp,
    children,
    value: valueProp,
    defaultValue = '',
    onChange,
    inputValue: inputValueProp,
    defaultInputValue,
    onInputChange,
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    openOnFocus = false,
    freeSolo = false,
    clearOnEscape = false,
    filterOptions = defaultFilterOptions,
    noOptionsText,
    toggleLabel = 'Toggle dropdown menu',
    name,
    form,
    disabled = false,
    required = false,
    error = false,
    supportingText,
    errorText,
    startIcon,
    fullWidth = false,
    placeholder,
    id: providedId,
    autoFocus,
    inputRef,
    className,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    'aria-describedby': ariaDescribedBy,
    ...rest
  } = useLocaleProps('Autocomplete', inProps)
  const autoId = useId()
  const inputId = providedId ?? `${autoId}-input`
  const labelId = `${autoId}-label`
  const listboxId = `${autoId}-listbox`
  const supportingId = `${autoId}-supporting`

  const options = optionsProp ? fromOptionsProp(optionsProp) : collectOptions(children)
  const labelOf = (value: string) =>
    options.find((option) => option.value === value)?.label ?? (freeSolo ? value : '')

  const [value, setValue, isValueControlled] = useControllableState({
    value: valueProp,
    defaultValue,
    name: 'Autocomplete',
    state: 'value',
  })
  const [initialInputValue] = useState(() => defaultInputValue ?? labelOf(defaultValue))
  const [inputValue, setInputValue, isInputControlled] = useControllableState({
    value: inputValueProp,
    defaultValue: initialInputValue,
    name: 'Autocomplete',
    state: 'inputValue',
  })
  const [openState, setOpenState] = useControllableState({
    value: openProp,
    defaultValue: defaultOpen,
    name: 'Autocomplete',
    state: 'open',
  })
  const open = !disabled && openState

  // Whether the text was typed since the last commit (blur then commits or
  // reverts it).
  const [dirty, setDirty] = useState(false)
  const [focused, setFocused] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [keyboardActive, setKeyboardActive] = useState(false)

  const rootRef = useRef<HTMLDivElement>(null)
  const fieldRef = useRef<HTMLDivElement>(null)
  const textInputRef = useRef<HTMLInputElement>(null)
  const listboxRef = useRef<HTMLUListElement>(null)
  const nativeInputRef = useRef<HTMLInputElement>(null)

  // The text filters unless it is still the picked option's label: opening
  // on a picked value shows every option (MUI `inputPristine`).
  const filterText = !dirty && inputValue === labelOf(value) ? '' : inputValue
  // Map back to the option data (filterOptions may return copies).
  const filtered = filterOptions(options, { inputValue: filterText })
    .map((item) => options.find((option) => option.value === item.value))
    .filter((option): option is OptionData => !!option)

  const popupVisible = open && (filtered.length > 0 || noOptionsText != null)
  const active = activeIndex < filtered.length ? activeIndex : -1
  const selectedIndex = filtered.findIndex((option) => option.value === value)

  const latest = useRef({ open, onOpenChange, setOpenState })
  latest.current = { open, onOpenChange, setOpenState }
  const setOpen = (next: boolean) => {
    // Several requests in one event (focus + click with `openOnFocus`)
    // notify once.
    if (latest.current.open === next) return
    latest.current.open = next
    latest.current.setOpenState(next)
    latest.current.onOpenChange?.(next)
  }

  const changeInput = (event: SyntheticEvent, next: string) => {
    if (next === inputValue) return
    setInputValue(next)
    onInputChange?.(event, next)
  }

  const changeValue = (event: SyntheticEvent, next: string) => {
    if (next === value) return
    setValue(next)
    onChange?.(event, next)
  }

  const openListbox = (target: number, viaKeyboard: boolean) => {
    setActiveIndex(target)
    setKeyboardActive(viaKeyboard)
    setOpen(true)
  }

  const close = () => {
    setOpen(false)
    setActiveIndex(-1)
  }

  /** Picks `filtered[index]`: the value, its label in the input, and close. */
  const select = (index: number, event: SyntheticEvent) => {
    const option = filtered[index]
    if (!option || option.disabled) return
    changeValue(event, option.value)
    changeInput(event, option.label)
    setDirty(false)
    close()
  }

  /** Leaves the field with the text in a consistent state (blur / Tab). */
  const commitText = (event: SyntheticEvent) => {
    if (!dirty) return
    setDirty(false)
    if (freeSolo) {
      // The typed string, even when it equals an option label: an option is
      // selected only by picking it (B52; Compose selects on item click only).
      changeValue(event, inputValue)
    } else {
      // Not an option: the text returns to the selected option's label.
      changeInput(event, labelOf(value))
    }
  }

  // Closing forgets the active option; a controlled `open` opening starts
  // with none (APG list autocomplete without automatic selection).
  useEffect(() => {
    if (!open) setActiveIndex(-1)
  }, [open])

  // Keep the keyboard-active option visible inside a scrolling listbox, and
  // show the selected one when the listbox opens.
  useEffect(() => {
    if (!popupVisible) return
    const index = active !== -1 ? active : selectedIndex
    if (index === -1 || (active !== -1 && !keyboardActive)) return
    document.getElementById(`${listboxId}-option-${index}`)?.scrollIntoView?.({ block: 'nearest' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popupVisible, active, keyboardActive])

  useEffect(() => {
    if (!open) return
    // An outside press closes (`pointerdown`, like Menu / Select).
    const onPointerDown = (event: globalThis.PointerEvent) => {
      const root = rootRef.current
      if (root && !root.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const side = usePopupPosition({
    open: popupVisible,
    anchorRef: fieldRef,
    popupRef: listboxRef,
    side: 'bottom',
    align: 'start',
    gap: ANCHOR_GAP_PX,
    margin: VIEWPORT_MARGIN_PX,
    matchAnchorWidth: true,
  })

  // m3: "Menu items ease into their new position as the menu is filtered."
  // FLIP: options that stay are translated back to where they were and then
  // released, so they move on DefaultSpatial (Listbox.module.css); options
  // that appear fade in. Reduced motion (B3): no motion.
  const positions = useRef(new Map<string, number>())
  const filteredKey = filtered.map((option) => option.value).join('\u0000')
  useIsoLayoutEffect(() => {
    const list = listboxRef.current
    if (!list || !popupVisible) {
      positions.current = new Map()
      return
    }
    const elements = Array.from(list.querySelectorAll<HTMLElement>('[role="option"]'))
    const before = positions.current
    const after = new Map<string, number>()
    elements.forEach((el, i) => {
      if (filtered[i]) after.set(filtered[i].value, el.offsetTop)
    })
    positions.current = after
    if (before.size === 0 || prefersReducedMotion()) return
    const moved: HTMLElement[] = []
    elements.forEach((el, i) => {
      const option = filtered[i]
      if (!option) return
      const from = before.get(option.value)
      const to = after.get(option.value)!
      if (from === undefined) {
        el.style.transition = 'none'
        el.style.opacity = '0'
        moved.push(el)
      } else if (from !== to) {
        el.style.transition = 'none'
        el.style.transform = `translateY(${from - to}px)`
        moved.push(el)
      }
    })
    if (moved.length === 0) return
    // Commit the starting frame, then release to the CSS transition.
    void list.offsetHeight
    for (const el of moved) {
      el.style.transition = ''
      el.style.transform = ''
      el.style.opacity = ''
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredKey, popupVisible])

  // Native form reset: an uncontrolled Autocomplete returns to its initial
  // value and text (the browser resets the hidden input to its default too).
  const initialValue = useRef(defaultValue)
  useFormReset(nativeInputRef, () => {
    if (!isValueControlled) setValue(initialValue.current)
    if (!isInputControlled) setInputValue(initialInputValue)
    setDirty(false)
  })

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return
    const { key, altKey } = event
    const initialActive = () =>
      selectedIndex !== -1 && !filtered[selectedIndex].disabled
        ? selectedIndex
        : firstEnabled(filtered)
    switch (key) {
      case 'ArrowDown': {
        event.preventDefault()
        if (!popupVisible) {
          openListbox(altKey ? -1 : initialActive(), true)
          return
        }
        if (altKey) return
        // Wraps from the last option to the first (APG list autocomplete).
        const next =
          active === -1 || stepEnabled(filtered, active, 1) === active
            ? firstEnabled(filtered)
            : stepEnabled(filtered, active, 1)
        setActiveIndex(next)
        setKeyboardActive(true)
        return
      }
      case 'ArrowUp': {
        event.preventDefault()
        if (!popupVisible) {
          if (!altKey) openListbox(lastEnabled(filtered), true)
          return
        }
        if (altKey) {
          close()
          return
        }
        const prev =
          active === -1 || stepEnabled(filtered, active, -1) === active
            ? lastEnabled(filtered)
            : stepEnabled(filtered, active, -1)
        setActiveIndex(prev)
        setKeyboardActive(true)
        return
      }
      case 'Enter':
        if (popupVisible && active !== -1) {
          event.preventDefault()
          select(active, event)
          return
        }
        if (freeSolo) commitText(event)
        if (open) close()
        return
      case 'Escape':
        if (popupVisible) {
          // Consumed: an enclosing modal (useModal) ignores a prevented Escape.
          event.preventDefault()
          close()
          return
        }
        // APG: Escape on a closed listbox "optionally clears" the textbox —
        // opt-in (MUI `clearOnEscape`), so by default the key propagates and
        // an enclosing modal closes (B42 addendum, #517).
        if (clearOnEscape && (inputValue !== '' || value !== '')) {
          event.preventDefault()
          changeInput(event, '')
          changeValue(event, '')
          setDirty(false)
        }
        if (open) close()
        return
      case 'Home':
      case 'End':
      case 'ArrowLeft':
      case 'ArrowRight':
        // The caret moves in the input; visual focus returns to it.
        setActiveIndex(-1)
        return
    }
  }

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value
    changeInput(event, next)
    setDirty(true)
    setActiveIndex(-1)
    setKeyboardActive(false)
    // Clearing the text clears the selection (MUI).
    if (next === '' && !freeSolo) changeValue(event, '')
    setOpen(true)
  }

  const handleFieldMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    // Presses on the container padding / toggle keep focus in the input;
    // presses on the input itself place the caret as usual.
    if (event.button !== 0 || event.target === textInputRef.current) return
    event.preventDefault()
  }

  const handleFieldClick = () => {
    if (disabled) return
    textInputRef.current?.focus()
    if (!open) {
      setDirty(false)
      openListbox(-1, false)
    }
  }

  const handleToggleClick = (event: MouseEvent<HTMLButtonElement>) => {
    // The field's click handler would reopen it.
    event.stopPropagation()
    if (disabled) return
    textInputRef.current?.focus()
    if (popupVisible) {
      close()
    } else {
      setDirty(false)
      openListbox(-1, false)
    }
  }

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    setFocused(false)
    commitText(event)
    close()
  }

  const showError = error && !disabled
  const showErrorText = showError && !!errorText
  const displaySupportingText = showErrorText ? errorText : supportingText
  const hasSupportingText = !!displaySupportingText
  const populated = inputValue !== ''

  const describedBy =
    [hasSupportingText && supportingId, ariaDescribedBy].filter(Boolean).join(' ') || undefined
  const labelledBy = ariaLabelledBy ?? (label && ariaLabel == null ? labelId : undefined)

  // `above`: the label leaves the container, which then lays out like a
  // label-less field (B37).
  const labelAbove = !!label && labelPlacement === 'above'
  const labelText = label ? (
    <>
      {label}
      {required && <span aria-hidden="true">*</span>}
    </>
  ) : undefined

  const setRootRef = (node: HTMLDivElement | null) => {
    rootRef.current = node
    assignRef(forwardedRef, node)
  }
  const setTextInputRef = (node: HTMLInputElement | null) => {
    textInputRef.current = node
    assignRef(inputRef, node)
  }

  return (
    <div
      {...rest}
      ref={setRootRef}
      className={clsx(
        fieldStyles.textField,
        fieldStyles[variant],
        styles.autocomplete,
        focused && fieldStyles.focused,
        populated && fieldStyles.populated,
        showError && fieldStyles.error,
        disabled && fieldStyles.disabled,
        startIcon != null && fieldStyles.hasLeadingIcon,
        fieldStyles.hasTrailingIcon,
        (!label || labelAbove) && fieldStyles.noLabel,
        label && !labelAbove && shrinkLabel && fieldStyles.shrinkLabel,
        fullWidth && styles.fullWidth,
        className,
      )}
      data-open={popupVisible || undefined}
    >
      {labelAbove && (
        <label id={labelId} htmlFor={inputId} className={fieldStyles.aboveLabel}>
          {labelText}
        </label>
      )}
      <div
        ref={fieldRef}
        className={clsx(fieldStyles.field, styles.field)}
        onMouseDown={handleFieldMouseDown}
        onClick={handleFieldClick}
      >
        {variant === 'filled' && (
          <>
            <span className={fieldStyles.background} aria-hidden="true" />
            <span className={fieldStyles.stateLayer} aria-hidden="true" />
            <span className={fieldStyles.activeIndicator} aria-hidden="true" />
          </>
        )}

        {variant === 'outlined' && (
          <div className={fieldStyles.outline} aria-hidden="true">
            <div className={fieldStyles.outlineStart} />
            <div className={fieldStyles.outlineNotch}>
              {labelText && !labelAbove && (
                <span className={fieldStyles.outlineLabel}>{labelText}</span>
              )}
            </div>
            <div className={fieldStyles.outlineEnd} />
          </div>
        )}

        {startIcon != null && (
          <span className={fieldStyles.leadingIcon} aria-hidden="true">
            {startIcon}
          </span>
        )}

        <div className={fieldStyles.middle}>
          {labelText && !labelAbove && (
            <label id={labelId} htmlFor={inputId} className={fieldStyles.label}>
              {labelText}
            </label>
          )}
          <div className={fieldStyles.content}>
            <input
              ref={setTextInputRef}
              id={inputId}
              type="text"
              role="combobox"
              className={fieldStyles.input}
              value={inputValue}
              placeholder={placeholder}
              disabled={disabled}
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus={autoFocus}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              aria-autocomplete="list"
              aria-expanded={popupVisible}
              aria-controls={listboxId}
              aria-activedescendant={
                popupVisible && active !== -1 ? `${listboxId}-option-${active}` : undefined
              }
              aria-label={ariaLabel}
              aria-labelledby={labelledBy}
              aria-describedby={describedBy}
              aria-required={required || undefined}
              aria-invalid={showError || undefined}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                setFocused(true)
                if (openOnFocus && !disabled && !latest.current.open) {
                  setDirty(false)
                  openListbox(-1, false)
                }
              }}
              onBlur={handleBlur}
            />
          </div>
        </div>

        <button
          type="button"
          tabIndex={-1}
          className={clsx(fieldStyles.trailingIcon, styles.toggle)}
          aria-label={toggleLabel}
          aria-expanded={popupVisible}
          aria-controls={listboxId}
          disabled={disabled}
          onClick={handleToggleClick}
        >
          <ArrowDropDownIcon aria-hidden="true" />
        </button>
      </div>

      {hasSupportingText && (
        <div className={fieldStyles.supportingText} id={supportingId}>
          <span role={showErrorText ? 'alert' : undefined}>{displaySupportingText}</span>
        </div>
      )}

      {/* Form wiring, as in Select: visually hidden (not type="hidden") so
          `required` takes part in constraint validation; focusing it hands
          focus to the text input. */}
      <input
        ref={nativeInputRef}
        className={styles.nativeInput}
        name={name}
        form={form}
        value={value}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          // Autofill / scripted changes on the native input: adopt known values.
          const next = event.target.value
          const option = options.find((o) => o.value === next && !o.disabled)
          if (option || freeSolo) {
            changeValue(event, next)
            changeInput(event, option ? option.label : next)
          }
        }}
        required={required}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
        onFocus={() => textInputRef.current?.focus()}
      />

      <Listbox
        ref={listboxRef}
        id={listboxId}
        open={popupVisible}
        side={side}
        labelledBy={labelledBy}
        ariaLabel={ariaLabel}
        filterable
        emptyText={noOptionsText}
        context={{
          options: filtered,
          selectedValue: value,
          activeIndex: active,
          keyboardActive,
          idFor: (index) => `${listboxId}-option-${index}`,
          select,
          hover: (index) => {
            if (index === active && !keyboardActive) return
            setActiveIndex(index)
            setKeyboardActive(false)
          },
        }}
      >
        {filtered.map((option) => cloneElement(option.element, { key: option.value }))}
      </Listbox>
    </div>
  )
})

export { Option, type OptionProps }
