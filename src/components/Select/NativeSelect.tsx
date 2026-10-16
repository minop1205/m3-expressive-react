'use client'

import {
  Children,
  forwardRef,
  isValidElement,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type FocusEvent,
  type MouseEvent,
  type ReactNode,
  type Ref,
  type SelectHTMLAttributes,
} from 'react'
import clsx from 'clsx'
import { useFormReset } from '../../internal/useFormReset'
import { useIsoLayoutEffect } from '../../internal/useIsoLayoutEffect'
import { assignRef } from '../../internal/assignRef'
import { ArrowDropDownIcon } from '../../internal/icons'
import fieldStyles from '../TextField/TextField.module.css'
import selectStyles from './Select.module.css'
import styles from './NativeSelect.module.css'

/**
 * Props of `<Select native>` (ruling B53): the Select field around a real
 * `<select>`. `ref`, `className` and `style` go to the field root (as in
 * Select / TextField, A10); `inputRef` and every other attribute go to the
 * `<select>`.
 */
export interface NativeSelectProps
  extends Omit<
    SelectHTMLAttributes<HTMLSelectElement>,
    'children' | 'value' | 'defaultValue' | 'onChange' | 'multiple' | 'size' | 'color'
  > {
  /**
   * Render a native `<select>` with the OS picker instead of the listbox.
   * Children are then `<option>` / `<optgroup>` elements.
   */
  native: true
  /** Text field container style. @default 'filled' */
  variant?: 'filled' | 'outlined'
  /**
   * Expressive tonal style, as TextField `tonal`.
   * @experimental Compose still marks these values `TODO(b/448727879)`.
   * @default false
   */
  tonal?: boolean
  /**
   * Floating label (a `<label>` for the `<select>`). Rendered with a trailing
   * `*` when `required`. Floats while focused or while the selected value is
   * not empty.
   */
  label?: ReactNode
  /** Controlled selected value. */
  value?: string
  /** Uncontrolled initial value (default: the first enabled option, as natively). */
  defaultValue?: string
  /**
   * Fires on the native `change` event — with that event (so
   * `event.target.value` works, as in MUI) and the new value (A2). Not fired
   * on form reset.
   */
  onChange?: (event: ChangeEvent<HTMLSelectElement>, value: string) => void
  /** Error state — error colors, `aria-invalid`, and `errorText`. Ignored while `disabled`. @default false */
  error?: boolean
  /** Helper line below the field. Replaced by `errorText` while in error. */
  supportingText?: ReactNode
  /** Shown instead of `supportingText` (with `role="alert"`) when `error` is set. */
  errorText?: ReactNode
  /** Icon at the start of the field (decorative). */
  startIcon?: ReactNode
  /** Stretch the field to the container's width. @default false */
  fullWidth?: boolean
  /** Applied to the field's root element. */
  className?: string
  /** Applied to the field's root element. */
  style?: CSSProperties
  /** Ref to the native `<select>` (the forwarded `ref` points at the root). */
  inputRef?: Ref<HTMLSelectElement>
  /** Native `<option>` / `<optgroup>` elements. */
  children?: ReactNode
}

type OptionLike = { value?: unknown; disabled?: boolean; children?: ReactNode; label?: ReactNode }

const textOf = (node: ReactNode): string => {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  return ''
}

/**
 * The value a `<select>` starts with when nothing is marked selected: the
 * first option that is not disabled (nor in a disabled `<optgroup>`). Used
 * for the first (and server) render only; the DOM is read after mount.
 */
function firstOptionValue(children: ReactNode, groupDisabled = false): string | undefined {
  for (const child of Children.toArray(children)) {
    if (!isValidElement<OptionLike>(child)) continue
    const { props } = child
    if (child.type === 'option') {
      if (groupDisabled || props.disabled) continue
      return props.value !== undefined ? String(props.value) : textOf(props.children).trim()
    }
    const nested = firstOptionValue(
      props.children,
      groupDisabled || (child.type === 'optgroup' && !!props.disabled),
    )
    if (nested !== undefined) return nested
  }
  return undefined
}

/**
 * `<Select native>` (ruling B53, #519): the TextField / Select field — label,
 * filled / outlined / tonal, start icon, `ArrowDropDown`, supporting / error
 * text — drawn around a real `<select>` whose popup is the OS picker. A web
 * adaptation (MUI `Select native`); m3 and Compose have no native select.
 */
export const NativeSelect = forwardRef<HTMLDivElement, Omit<NativeSelectProps, 'native'>>(
  function NativeSelect(
    {
      variant = 'filled',
      tonal = false,
      label,
      value: controlledValue,
      defaultValue,
      onChange,
      disabled = false,
      required = false,
      error = false,
      supportingText,
      errorText,
      startIcon,
      fullWidth = false,
      id: providedId,
      inputRef,
      children,
      className,
      style,
      onFocus,
      onBlur,
      'aria-describedby': ariaDescribedBy,
      ...selectProps
    },
    forwardedRef,
  ) {
    const autoId = useId()
    const selectId = providedId ?? `${autoId}-select`
    const supportingId = `${autoId}-supporting`
    const selectRef = useRef<HTMLSelectElement | null>(null)

    const isControlled = useRef(controlledValue !== undefined).current

    // The value the DOM shows (drives the floating label). Seeded from the
    // props / first option for the server render, then read from the element.
    const [shownValue, setShownValue] = useState(
      () => controlledValue ?? defaultValue ?? firstOptionValue(children) ?? '',
    )
    useIsoLayoutEffect(() => {
      const el = selectRef.current
      if (el && el.value !== shownValue) setShownValue(el.value)
    })

    const [focused, setFocused] = useState(false)

    // Form reset: the browser restores the default option right after the
    // `reset` event. Uncontrolled: adopt it. Controlled: put the controlled
    // value back (a controlled value survives a reset, as in Select).
    const latestValue = useRef(controlledValue)
    latestValue.current = controlledValue
    useFormReset(selectRef, () => {
      queueMicrotask(() => {
        const el = selectRef.current
        if (!el) return
        if (isControlled && latestValue.current !== undefined) el.value = latestValue.current
        setShownValue(el.value)
      })
    })

    const setRefs = (node: HTMLSelectElement | null) => {
      selectRef.current = node
      assignRef(inputRef, node)
    }

    const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
      const next = event.target.value
      if (!isControlled) setShownValue(next)
      onChange?.(event, next)
    }

    const handleFieldClick = (event: MouseEvent<HTMLDivElement>) => {
      const el = selectRef.current
      if (disabled || !el || event.target === el) return
      // A press on the padding, label or arrow: focus the <select> and open
      // the OS picker where the browser lets us (`showPicker()`).
      el.focus()
      try {
        el.showPicker?.()
      } catch {
        // Not allowed here (no user activation, cross-origin frame): focus only.
      }
    }

    const showError = error && !disabled
    const showErrorText = showError && !!errorText
    const displaySupportingText = showErrorText ? errorText : supportingText
    const hasSupportingText = !!displaySupportingText
    const populated = shownValue !== ''

    const describedBy =
      [hasSupportingText && supportingId, ariaDescribedBy].filter(Boolean).join(' ') || undefined

    const labelText = label ? (
      <>
        {label}
        {required && <span aria-hidden="true">*</span>}
      </>
    ) : undefined

    return (
      <div
        className={clsx(
          fieldStyles.textField,
          fieldStyles[variant],
          tonal && fieldStyles.tonal,
          selectStyles.select,
          styles.native,
          focused && fieldStyles.focused,
          populated && fieldStyles.populated,
          showError && fieldStyles.error,
          disabled && fieldStyles.disabled,
          startIcon != null && fieldStyles.hasLeadingIcon,
          fieldStyles.hasTrailingIcon,
          !label && fieldStyles.noLabel,
          fullWidth && selectStyles.fullWidth,
          className,
        )}
        ref={forwardedRef}
        style={style}
        data-native=""
        data-empty={!populated || undefined}
        data-has-label={label ? '' : undefined}
      >
        <div className={clsx(fieldStyles.field, selectStyles.field)} onClick={handleFieldClick}>
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
              <label className={fieldStyles.label} htmlFor={selectId}>
                {labelText}
              </label>
            )}
            <div className={fieldStyles.content}>
              <select
                {...selectProps}
                ref={setRefs}
                id={selectId}
                className={clsx(fieldStyles.input, styles.select)}
                value={controlledValue}
                defaultValue={isControlled ? undefined : defaultValue}
                onChange={handleChange}
                disabled={disabled}
                required={required}
                aria-invalid={showError || undefined}
                aria-describedby={describedBy}
                onFocus={(event: FocusEvent<HTMLSelectElement>) => {
                  setFocused(true)
                  onFocus?.(event)
                }}
                onBlur={(event: FocusEvent<HTMLSelectElement>) => {
                  setFocused(false)
                  onBlur?.(event)
                }}
              >
                {children}
              </select>
            </div>
          </div>

          <span className={fieldStyles.trailingIcon} aria-hidden="true">
            <ArrowDropDownIcon />
          </span>
        </div>

        {hasSupportingText && (
          <div className={fieldStyles.supportingText} id={supportingId}>
            <span role={showErrorText ? 'alert' : undefined}>{displaySupportingText}</span>
          </div>
        )}
      </div>
    )
  },
)
