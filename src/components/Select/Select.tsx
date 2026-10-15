'use client'

import {
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
  type ReactNode,
  type Ref,
  type SyntheticEvent,
} from 'react'
import clsx from 'clsx'
import { usePopupPosition } from '../../internal/usePopupPosition'
import { useFormReset } from '../../internal/useFormReset'
import { assignRef } from '../../internal/assignRef'
import { ArrowDropDownIcon } from '../../internal/icons'
import {
  createMenuTypeahead,
  getTypeaheadLabel,
  matchTypeahead,
} from '../../internal/menuNavigation'
import {
  Listbox,
  collectOptions,
  firstEnabled as firstEnabledIn,
  lastEnabled as lastEnabledIn,
  stepEnabled as stepEnabledIn,
} from '../../internal/listbox/Listbox'
import fieldStyles from '../TextField/TextField.module.css'
import styles from './Select.module.css'

export type SelectVariant = 'filled' | 'outlined'

export interface SelectProps
  extends Omit<
    HTMLAttributes<HTMLDivElement>,
    'children' | 'defaultValue' | 'onChange' | 'color' | 'placeholder'
  > {
  /** Text field container style (the same two as `TextField`). @default 'filled' */
  variant?: SelectVariant
  /**
   * Expressive tonal style, as TextField `tonal` (Compose `tonalColors()` +
   * `roundedShape`): 12dp rounded container, no indicator on `filled`,
   * outline-variant border and inside label on `outlined`.
   *
   * @experimental Compose still marks these values `TODO(b/448727879)`, so
   * the look may change when the spec settles.
   * @default false
   */
  tonal?: boolean
  /**
   * Floating label; also names the combobox and the listbox. Rendered with a trailing `*` when `required`.
   *
   * Accepts rich content (text, emphasis, a small icon) — keep it short and
   * on one line, as m3 asks: the label is a single line (truncated with an
   * ellipsis), clicks on it go to the field, and the outlined notch draws a
   * hidden copy of it to measure its width. So no links or buttons in the
   * label, and no elements with an `id`.
   */
  label?: ReactNode
  /** Controlled selected value (`''` = nothing selected). */
  value?: string
  /** Uncontrolled initial value. @default '' */
  defaultValue?: string
  /**
   * Fires when the user picks a different option — with the click or key
   * event and the new value (A2). Not fired on form reset.
   */
  onChange?: (event: SyntheticEvent, value: string) => void
  /** Controlled open state of the listbox. */
  open?: boolean
  /** Uncontrolled initial open state. @default false */
  defaultOpen?: boolean
  /** Notified when the listbox should open or close. */
  onOpenChange?: (open: boolean) => void
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
  /** Shown in the field while nothing is selected (once the label has floated, or always without a label). */
  placeholder?: string
  /** Applied to the `role="combobox"` element. */
  id?: string
  /** Focus the combobox on mount. */
  autoFocus?: boolean
  /** Ref to the hidden native `<input>` that carries the value for forms (the forwarded `ref` points at the root). */
  inputRef?: Ref<HTMLInputElement>
  /** `Option` elements (direct children or inside Fragments). */
  children?: ReactNode
}

/** Gap between the field and the listbox: none (Compose `topToAnchorBottom`). */
const ANCHOR_GAP_PX = 0

/** Minimum distance the listbox keeps from the viewport edges when clamped. */
const VIEWPORT_MARGIN_PX = 8

/** Options PageUp / PageDown move by (APG). */
const PAGE_STEP = 10

/**
 * Material Design 3 Select — the non-editable exposed dropdown menu
 * (Compose `ExposedDropdownMenuBox` + a read-only `TextField` with the
 * `PrimaryNotEditable` anchor, `ExposedDropdownMenu(matchAnchorWidth = true)`).
 *
 * The field is the `TextField` anatomy (filled / outlined, floating label,
 * start icon, supporting / error text) with the `ArrowDropDown` trailing icon,
 * rotated 180° while open. The listbox is drawn in the top layer below the
 * field (flipped above when there is no room, clamped to the viewport),
 * exactly as wide as the field and capped to the room left on that side —
 * styled after the Compose sample: a surface-container-low, 16dp-corner,
 * elevation-2 surface with 44dp body-large options (16dp padding, positional
 * corners), and a tertiary-container selected option with a check mark that
 * morphs to 12dp corners.
 *
 * Accessibility follows the WAI-ARIA APG select-only combobox: the field is a
 * focusable `role="combobox"` that keeps focus while the `role="listbox"`
 * popup is open, the active option is exposed through
 * `aria-activedescendant`. Closed: ArrowDown / ArrowUp / Enter / Space /
 * Alt+ArrowDown open (Home / End open on the first / last option), and
 * typing opens on the matching option. Open: ArrowUp / ArrowDown move (no
 * wrap), Home / End / PageUp / PageDown jump, typing moves by typeahead,
 * Enter / Space / Alt+ArrowUp select and close, Tab selects and moves on,
 * Escape closes without selecting. Disabled options are skipped.
 *
 * A visually hidden native `<input>` carries `name` / `value` for form
 * submission, `required` validation, and form reset (uncontrolled values
 * return to `defaultValue`).
 */
export const Select = forwardRef<HTMLDivElement, SelectProps>(function Select(
  {
    variant = 'filled',
    tonal = false,
    label,
    value: controlledValue,
    defaultValue = '',
    onChange,
    open: controlledOpen,
    defaultOpen = false,
    onOpenChange,
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
    children,
    className,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    'aria-describedby': ariaDescribedBy,
    ...rest
  },
  forwardedRef,
) {
  const autoId = useId()
  const comboboxId = providedId ?? `${autoId}-combobox`
  const labelId = `${autoId}-label`
  const listboxId = `${autoId}-listbox`
  const supportingId = `${autoId}-supporting`

  const options = collectOptions(children)

  // Uncontrolled semantics: only the initial `defaultValue` counts (the
  // form-reset target), as in TextField.
  const [initialDefaultValue] = useState(defaultValue)
  const [internalValue, setInternalValue] = useState(defaultValue)
  const isValueControlled = controlledValue !== undefined
  const value = isValueControlled ? controlledValue : internalValue
  const selectedIndex = options.findIndex((option) => option.value === value)

  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const isOpenControlled = controlledOpen !== undefined
  const open = !disabled && (isOpenControlled ? controlledOpen : internalOpen)

  const [focused, setFocused] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  // Whether the active option was reached by keyboard (shows the focus
  // indicator and scrolls it into view) rather than by the pointer.
  const [keyboardActive, setKeyboardActive] = useState(false)
  const typeahead = useRef(createMenuTypeahead())

  const fieldRef = useRef<HTMLDivElement>(null)
  const comboboxRef = useRef<HTMLDivElement>(null)
  const listboxRef = useRef<HTMLUListElement>(null)
  const nativeInputRef = useRef<HTMLInputElement>(null)

  // Read through a ref: the document listener below is bound once per open.
  const latest = useRef({ isOpenControlled, onOpenChange })
  latest.current = { isOpenControlled, onOpenChange }
  const setOpen = (next: boolean) => {
    if (!latest.current.isOpenControlled) setInternalOpen(next)
    latest.current.onOpenChange?.(next)
  }

  const isEnabled = (index: number) => !!options[index] && !options[index].disabled
  const firstEnabled = () => firstEnabledIn(options)
  const lastEnabled = () => lastEnabledIn(options)
  /** The next enabled option from `from` in `step` direction, clamped at the ends (no wrap). */
  const stepEnabled = (from: number, step: number) => stepEnabledIn(options, from, step)
  const initialActive = () => (isEnabled(selectedIndex) ? selectedIndex : firstEnabled())

  const openListbox = (target: number, viaKeyboard: boolean) => {
    setActiveIndex(target)
    setKeyboardActive(viaKeyboard)
    if (!open) setOpen(true)
  }

  // Opened from outside (controlled `open`, `defaultOpen`): start on the
  // selected option. Closing forgets the active option.
  useEffect(() => {
    if (!open) {
      setActiveIndex(-1)
      return
    }
    setActiveIndex((current) => (current === -1 ? initialActive() : current))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const select = (index: number, event: SyntheticEvent) => {
    const option = options[index]
    if (!option || option.disabled) return
    if (option.value !== value) {
      if (!isValueControlled) setInternalValue(option.value)
      onChange?.(event, option.value)
    }
  }

  const close = () => {
    if (open) setOpen(false)
  }

  // Keep the keyboard-active option visible inside a scrolling listbox, and
  // show the selected one when the listbox opens.
  useEffect(() => {
    if (!open || activeIndex === -1) return
    if (!keyboardActive && activeIndex !== initialActive()) return
    const el = document.getElementById(`${listboxId}-option-${activeIndex}`)
    el?.scrollIntoView?.({ block: 'nearest' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeIndex, keyboardActive])

  useEffect(() => {
    if (!open) return
    // An outside press closes (`pointerdown`, like Menu). Presses inside the
    // field toggle it themselves; presses on options select.
    const onPointerDown = (event: globalThis.PointerEvent) => {
      const root = fieldRef.current?.parentElement
      if (root && !root.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const side = usePopupPosition({
    open,
    anchorRef: fieldRef,
    popupRef: listboxRef,
    side: 'bottom',
    align: 'start',
    gap: ANCHOR_GAP_PX,
    margin: VIEWPORT_MARGIN_PX,
    matchAnchorWidth: true,
  })

  // Native form reset: an uncontrolled Select returns to its initial
  // `defaultValue` (the browser resets the hidden input to its default too).
  useFormReset(nativeInputRef, () => {
    if (!isValueControlled) setInternalValue(initialDefaultValue)
  })

  const optionLabels = () =>
    Array.from(
      listboxRef.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? [],
      getTypeaheadLabel,
    )

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return
    const { key, altKey } = event
    if (!open) {
      switch (key) {
        case 'ArrowDown':
        case 'ArrowUp':
        case 'Enter':
        case ' ':
          event.preventDefault()
          openListbox(initialActive(), true)
          return
        case 'Home':
          event.preventDefault()
          openListbox(firstEnabled(), true)
          return
        case 'End':
          event.preventDefault()
          openListbox(lastEnabled(), true)
          return
      }
      const match = matchTypeahead(
        event,
        optionLabels(),
        selectedIndex,
        typeahead.current,
        Date.now(),
        isEnabled,
      )
      if (match !== null) {
        event.preventDefault()
        openListbox(match === -1 ? initialActive() : match, true)
      }
      return
    }

    const move = (target: number) => {
      event.preventDefault()
      setActiveIndex(target)
      setKeyboardActive(true)
    }
    switch (key) {
      case 'ArrowDown':
        return move(activeIndex === -1 ? firstEnabled() : stepEnabled(activeIndex, 1))
      case 'ArrowUp':
        if (altKey) {
          event.preventDefault()
          select(activeIndex, event)
          close()
          return
        }
        return move(activeIndex === -1 ? lastEnabled() : stepEnabled(activeIndex, -1))
      case 'Home':
        return move(firstEnabled())
      case 'End':
        return move(lastEnabled())
      case 'PageDown':
        return move(stepEnabled(activeIndex, PAGE_STEP))
      case 'PageUp':
        return move(stepEnabled(activeIndex === -1 ? options.length : activeIndex, -PAGE_STEP))
      case 'Enter':
      case ' ':
        event.preventDefault()
        select(activeIndex, event)
        close()
        return
      case 'Escape':
        // Consumed: an enclosing modal (useModal) ignores a prevented Escape.
        event.preventDefault()
        close()
        return
      case 'Tab':
        // APG select-only combobox: Tab commits the active option, closes,
        // and moves focus on as usual (no preventDefault).
        select(activeIndex, event)
        close()
        return
    }
    const match = matchTypeahead(
      event,
      optionLabels(),
      activeIndex,
      typeahead.current,
      Date.now(),
      isEnabled,
    )
    if (match !== null) {
      event.preventDefault()
      if (match !== -1) {
        setActiveIndex(match)
        setKeyboardActive(true)
      }
    }
  }

  const handleFieldMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    // Keep (or take) focus on the combobox: a press on the container's
    // padding would otherwise blur it, and text must not get selected.
    if (event.button !== 0) return
    event.preventDefault()
  }

  const handleFieldClick = () => {
    if (disabled) return
    comboboxRef.current?.focus()
    if (open) close()
    else openListbox(initialActive(), false)
  }

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    setFocused(false)
    rest.onBlur?.(event)
    // Focus left (Tab handled in keydown, or moved programmatically).
    close()
  }

  const showError = error && !disabled
  const showErrorText = showError && !!errorText
  const displaySupportingText = showErrorText ? errorText : supportingText
  const hasSupportingText = !!displaySupportingText
  const populated = selectedIndex !== -1
  const selected = populated ? options[selectedIndex] : undefined

  const describedBy =
    [hasSupportingText && supportingId, ariaDescribedBy].filter(Boolean).join(' ') || undefined
  const labelledBy = ariaLabelledBy ?? (label && ariaLabel == null ? labelId : undefined)

  const labelText = label ? (
    <>
      {label}
      {required && <span aria-hidden="true">*</span>}
    </>
  ) : undefined

  const setNativeInputRef = (node: HTMLInputElement | null) => {
    nativeInputRef.current = node
    assignRef(inputRef, node)
  }

  const { onBlur: _onBlur, onFocus, ...rootProps } = rest

  return (
    <div
      {...rootProps}
      ref={forwardedRef}
      className={clsx(
        fieldStyles.textField,
        fieldStyles[variant],
        tonal && fieldStyles.tonal,
        styles.select,
        (focused || open) && fieldStyles.focused,
        populated && fieldStyles.populated,
        showError && fieldStyles.error,
        disabled && fieldStyles.disabled,
        startIcon != null && fieldStyles.hasLeadingIcon,
        fieldStyles.hasTrailingIcon,
        !label && fieldStyles.noLabel,
        fullWidth && styles.fullWidth,
        className,
      )}
      data-open={open || undefined}
    >
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
              {labelText && !tonal && (
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
          {labelText && (
            <span id={labelId} className={fieldStyles.label}>
              {labelText}
            </span>
          )}
          <div className={fieldStyles.content}>
            <div
              ref={comboboxRef}
              id={comboboxId}
              role="combobox"
              tabIndex={disabled ? undefined : 0}
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus={autoFocus}
              aria-haspopup="listbox"
              aria-expanded={open}
              aria-controls={listboxId}
              aria-activedescendant={
                open && activeIndex !== -1 ? `${listboxId}-option-${activeIndex}` : undefined
              }
              aria-label={ariaLabel}
              aria-labelledby={labelledBy}
              aria-describedby={describedBy}
              aria-required={required || undefined}
              aria-invalid={showError || undefined}
              aria-disabled={disabled || undefined}
              className={clsx(fieldStyles.input, styles.combobox)}
              onKeyDown={handleKeyDown}
              onFocus={(event) => {
                setFocused(true)
                onFocus?.(event)
              }}
              onBlur={handleBlur}
            >
              {selected ? (
                selected.children
              ) : placeholder ? (
                <span className={styles.placeholder}>{placeholder}</span>
              ) : null}
            </div>
          </div>
        </div>

        <span
          className={clsx(fieldStyles.trailingIcon, styles.arrow)}
          aria-hidden="true"
        >
          <ArrowDropDownIcon />
        </span>
      </div>

      {hasSupportingText && (
        <div className={fieldStyles.supportingText} id={supportingId}>
          <span role={showErrorText ? 'alert' : undefined}>{displaySupportingText}</span>
        </div>
      )}

      {/* Form wiring: visually hidden (not type="hidden") so `required`
          takes part in constraint validation; the browser's validation
          bubble points at the field, and focusing it hands focus to the
          combobox. */}
      <input
        ref={setNativeInputRef}
        className={styles.nativeInput}
        name={name}
        form={form}
        value={value}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          // Autofill / scripted changes on the native input: adopt known values.
          const next = event.target.value
          const index = options.findIndex((option) => option.value === next)
          if (index !== -1) select(index, event)
        }}
        required={required}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
        onFocus={() => comboboxRef.current?.focus()}
      />

      <Listbox
        ref={listboxRef}
        id={listboxId}
        open={open}
        side={side}
        labelledBy={labelledBy}
        ariaLabel={ariaLabel}
        context={{
          options,
          selectedValue: value,
          activeIndex,
          keyboardActive,
          idFor: (index) => `${listboxId}-option-${index}`,
          select: (index, event) => {
            select(index, event)
            close()
          },
          hover: (index) => {
            if (index === activeIndex && !keyboardActive) return
            setActiveIndex(index)
            setKeyboardActive(false)
          },
        }}
      >
        {children}
      </Listbox>
    </div>
  )
})

export { Option, type OptionProps } from '../../internal/listbox/Listbox'
