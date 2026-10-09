import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type ChangeEventHandler,
  type FocusEvent,
  type FocusEventHandler,
  type InputEvent,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type MouseEvent,
  type ReactNode,
  type Ref,
  type TextareaHTMLAttributes,
} from 'react'
import clsx from 'clsx'
import { useFormReset } from '../../internal/useFormReset'
import styles from './TextField.module.css'

export type TextFieldVariant = 'filled' | 'outlined'

export interface TextFieldProps
  extends Omit<
    HTMLAttributes<HTMLDivElement>,
    'children' | 'defaultValue' | 'onChange' | 'onFocus' | 'onBlur'
  > {
  /** Container style. @default 'filled' */
  variant?: TextFieldVariant
  /** Floating label; rendered with a trailing `*` when `required`. */
  label?: string
  /** Helper line below the field. Replaced by `errorText` while in error. */
  supportingText?: string
  /** Shown instead of `supportingText` (with `role="alert"`) when `error` is set. */
  errorText?: string
  /** Error state — error colors, `aria-invalid`, and `errorText`. Ignored while `disabled`. @default false */
  error?: boolean
  /** Icon at the start of the field (decorative). */
  startIcon?: ReactNode
  /** Icon at the end of the field (decorative). */
  endIcon?: ReactNode
  /** Static text before the input value (e.g. currency symbol). */
  prefixText?: string
  /** Static text after the input value (e.g. unit). */
  suffixText?: string
  /** Native input `maxLength`; also shows a `length / maxLength` counter in the supporting line. */
  maxLength?: number
  /**
   * Accessible wording for the `maxLength` counter (the visible `3 / 20` is
   * hidden from assistive tech in favor of this text).
   * @default (length, maxLength) => `Character count: ${length} of ${maxLength}`
   */
  getCounterLabel?: (length: number, maxLength: number) => string
  /** Render a `<textarea>` that auto-grows with its content. @default false */
  multiline?: boolean
  /** Initial visible rows of the `multiline` textarea. @default 2 */
  rows?: number
  /** Ref to the native `<input>` / `<textarea>` element (the forwarded `ref` points at the root). */
  inputRef?: Ref<HTMLInputElement | HTMLTextAreaElement>
  /**
   * Extra attributes spread on the native `<input>` (or `<textarea>` when
   * `multiline`) — the escape hatch for attributes without a dedicated prop
   * (`pattern`, `min`, `max`, `step`, `onKeyDown`, extra `aria-*`, …).
   * Precedence: the component's own wiring always wins over conflicting
   * `inputProps` keys — the controlled `value` / `onChange` / `onFocus` /
   * `onBlur`, `id`, `className`, and every dedicated input prop the
   * component sets (`type`, `name`, `placeholder`, `required`, `readOnly`,
   * `autoComplete`, `maxLength`, `rows`, …). Exceptions: `aria-describedby`
   * is merged (the field's own ids first), and an `onInput` handler is
   * called after the component's own.
   */
  inputProps?:
    | InputHTMLAttributes<HTMLInputElement>
    | TextareaHTMLAttributes<HTMLTextAreaElement>
  /** Applied to the native input (keeps the floating label association via `htmlFor`). */
  id?: string
  /** Controlled input value. */
  value?: string
  /** Uncontrolled initial value. */
  defaultValue?: string
  /** Native change handler for the input / textarea. */
  onChange?: ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>
  /** Focus handler for the input / textarea. */
  onFocus?: FocusEventHandler<HTMLInputElement | HTMLTextAreaElement>
  /** Blur handler for the input / textarea. */
  onBlur?: FocusEventHandler<HTMLInputElement | HTMLTextAreaElement>
  /** Native input `type` (single-line only). @default 'text' */
  type?: string
  /** Native input `name`. */
  name?: string
  /** Native input `placeholder`. */
  placeholder?: string
  /** Marks the input required and appends `*` to the label. @default false */
  required?: boolean
  /** Native input `readOnly`. @default false */
  readOnly?: boolean
  /** Native input `autoComplete`. */
  autoComplete?: string
  /** Disables the input and applies disabled styling. @default false */
  disabled?: boolean
}

const defaultCounterLabel = (length: number, maxLength: number) =>
  `Character count: ${length} of ${maxLength}`

/**
 * Material Design 3 Text field (filled / outlined).
 *
 * A single-line `<input>` — or auto-growing `<textarea>` with `multiline` —
 * wrapped in the MD3 field anatomy: floating label (outlined variant notches
 * the border), start/end icons, prefix/suffix text, and a supporting
 * line that holds helper text, the error message, and the `maxLength`
 * counter. Value follows the standard controlled (`value` + `onChange`) or
 * uncontrolled (`defaultValue`) input pattern; clicking anywhere on the
 * container focuses the input.
 *
 * MUI parity: the forwarded `ref` and any extra props (`{...rest}`) land on
 * the ROOT element; input concerns are dedicated props (`type`, `name`,
 * `placeholder`, `required`, `readOnly`, `autoComplete`, `maxLength`, …),
 * `inputRef` reaches the native `<input>` / `<textarea>`, and `inputProps`
 * spreads extra attributes on it (the component's own wiring wins).
 */
export const TextField = forwardRef<HTMLDivElement, TextFieldProps>(
  function TextField(
    {
      variant = 'filled',
      label,
      supportingText,
      errorText,
      error = false,
      startIcon,
      endIcon,
      prefixText,
      suffixText,
      maxLength,
      getCounterLabel = defaultCounterLabel,
      multiline = false,
      rows = 2,
      disabled = false,
      className,
      value: controlledValue,
      defaultValue,
      onChange,
      onFocus,
      onBlur,
      onClick,
      id: providedId,
      inputRef,
      inputProps,
      type = 'text',
      name,
      placeholder,
      required = false,
      readOnly = false,
      autoComplete,
      autoFocus,
      inputMode,
      ...rest
    },
    forwardedRef,
  ) {
    const generatedId = useId()
    const inputId = providedId ?? generatedId
    const supportingId = `${inputId}-supporting`
    const prefixId = `${inputId}-prefix`
    const suffixId = `${inputId}-suffix`

    const [focused, setFocused] = useState(false)
    const [internalValue, setInternalValue] = useState(defaultValue ?? '')
    // Uncontrolled semantics: only the initial `defaultValue` counts. Pinning
    // it keeps a later prop change from rewriting the native default (and
    // the shown value of a not-yet-edited input) behind the state's back.
    const [initialDefaultValue] = useState(defaultValue)
    const isControlled = controlledValue !== undefined
    const currentValue = isControlled ? controlledValue : internalValue
    // Content the value doesn't report: partial number input ("-", "1e" —
    // `value` is '' but `validity.badInput` is set) and browser autofill
    // (Chrome's page-load autofill fires no input event, and its preview
    // isn't readable from script). Either keeps the label floated and the
    // content visible (#432).
    const [badInput, setBadInput] = useState(false)
    const [autofilled, setAutofilled] = useState(false)
    const populated = currentValue.length > 0 || badInput || autofilled

    const internalRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

    const setRefs = useCallback(
      (el: HTMLInputElement | HTMLTextAreaElement | null) => {
        (internalRef as React.MutableRefObject<typeof el>).current = el
        if (typeof inputRef === 'function') {
          inputRef(el)
        } else if (inputRef) {
          (inputRef as React.MutableRefObject<typeof el>).current = el
        }
      },
      [inputRef],
    )

    const handleFocus = useCallback(
      (event: FocusEvent<HTMLInputElement & HTMLTextAreaElement>) => {
        setFocused(true)
        onFocus?.(event)
      },
      [onFocus],
    )

    const handleBlur = useCallback(
      (event: FocusEvent<HTMLInputElement & HTMLTextAreaElement>) => {
        setFocused(false)
        onBlur?.(event)
      },
      [onBlur],
    )

    const handleChange = useCallback(
      (event: ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) => {
        if (!isControlled) {
          setInternalValue(event.target.value)
        }
        onChange?.(event)
      },
      [isControlled, onChange],
    )

    const inputPropsOnInput = inputProps?.onInput as unknown as
      | ((event: InputEvent<HTMLInputElement & HTMLTextAreaElement>) => void)
      | undefined
    // `input` fires for every edit, including ones React's onChange skips
    // because `value` stays '' (partial number input).
    const handleInput = useCallback(
      (event: InputEvent<HTMLInputElement & HTMLTextAreaElement>) => {
        setBadInput(event.currentTarget.validity?.badInput ?? false)
        inputPropsOnInput?.(event)
      },
      [inputPropsOnInput],
    )

    // A value set from outside (controlled update, reset) replaces any
    // partial number input, so re-read the flag rather than keep it stale.
    useEffect(() => {
      const el = internalRef.current
      if (el) setBadInput(el.validity?.badInput ?? false)
    }, [currentValue])

    // Autofill detection (MUI's technique): `.input:-webkit-autofill` runs the
    // no-op `autofillStart` keyframes, and leaving autofill runs
    // `autofillCancel` (TextField.module.css). A native listener, because
    // React may bind a vendor-prefixed animation event name.
    useEffect(() => {
      const el = internalRef.current
      if (!el) return
      const handleAnimationStart = (event: Event) => {
        const { animationName } = event as globalThis.AnimationEvent
        if (animationName === styles.autofillStart) setAutofilled(true)
        else if (animationName === styles.autofillCancel) setAutofilled(false)
      }
      el.addEventListener('animationstart', handleAnimationStart)
      return () => el.removeEventListener('animationstart', handleAnimationStart)
    }, [multiline])

    // Native form reset (#432). The uncontrolled input is natively
    // uncontrolled (`defaultValue`), so the browser restores the default;
    // mirror it in state so the label, counter and `populated` follow.
    // Assigning the value up front (the reset event precedes the reset)
    // also resyncs React's value tracker, so retyping the pre-reset value
    // still fires onChange.
    useFormReset(internalRef, () => {
      const el = internalRef.current
      if (!el) return
      setBadInput(false)
      setAutofilled(false)
      if (isControlled) return
      el.value = el.defaultValue
      setInternalValue(el.defaultValue)
    })

    // Auto-resize textarea
    useEffect(() => {
      if (multiline && internalRef.current) {
        const el = internalRef.current as HTMLTextAreaElement
        el.style.height = 'auto'
        el.style.height = `${el.scrollHeight}px`
      }
    }, [multiline, currentValue])

    const handleContainerClick = useCallback(
      (event: MouseEvent<HTMLDivElement>) => {
        onClick?.(event)
        internalRef.current?.focus()
      },
      [onClick],
    )

    const showError = error && !disabled
    const showSupportingText =
      supportingText || (showError && errorText) || maxLength != null
    const displaySupportingText =
      showError && errorText ? errorText : supportingText
    const counterText =
      maxLength != null ? `${currentValue.length} / ${maxLength}` : undefined
    const showErrorText = showError && !!errorText

    // Prefix/suffix are read with the input (m3 a11y: they need their own
    // ids), followed by the supporting line.
    // Extra ids from `inputProps` are merged after the field's own (#414).
    const describedBy =
      [
        prefixText && prefixId,
        suffixText && suffixId,
        showSupportingText && supportingId,
        inputProps?.['aria-describedby'],
      ]
        .filter(Boolean)
        .join(' ') || undefined

    // The required asterisk is visual only: `required` already exposes
    // aria-required, so keep the `*` out of the accessible name ("Email",
    // not "Email star").
    const labelText = label ? (
      <>
        {label}
        {required && <span aria-hidden="true">*</span>}
      </>
    ) : undefined

    const controlProps = {
      ref: setRefs,
      id: inputId,
      className: styles.input,
      // Uncontrolled stays natively uncontrolled so form.reset() restores
      // `defaultValue` (a React-controlled value would also become the
      // reset default via React's value-attribute syncing).
      ...(isControlled ? { value: controlledValue } : { defaultValue: initialDefaultValue }),
      disabled,
      name,
      placeholder,
      required,
      readOnly,
      autoComplete,
      autoFocus,
      inputMode,
      onChange: handleChange,
      onInput: handleInput,
      onFocus: handleFocus,
      onBlur: handleBlur,
      'aria-invalid': showError || undefined,
      'aria-describedby': describedBy,
      maxLength,
    }

    // `inputProps` (the escape hatch) is spread FIRST on the native control;
    // every entry the component defines here wins over it. Undefined entries
    // are dropped so they don't clobber an `inputProps` key the component
    // isn't actually setting (e.g. `aria-describedby` without supporting
    // text, or `name` without the `name` prop).
    const definedControlProps = Object.fromEntries(
      Object.entries(controlProps).filter(([, v]) => v !== undefined),
    ) as typeof controlProps
    // The value always comes from the component (controlled `value` or
    // uncontrolled `defaultValue`), so an `inputProps` value can't sneak in
    // where the component now leaves the key unset.
    const {
      value: _ignoredValue,
      defaultValue: _ignoredDefaultValue,
      ...passthroughInputProps
    } = (inputProps ?? {}) as InputHTMLAttributes<HTMLInputElement>

    return (
      <div
        {...rest}
        ref={forwardedRef}
        className={clsx(
          styles.textField,
          styles[variant],
          focused && styles.focused,
          populated && styles.populated,
          showError && styles.error,
          disabled && styles.disabled,
          startIcon && styles.hasLeadingIcon,
          endIcon && styles.hasTrailingIcon,
          !label && styles.noLabel,
          className,
        )}
        onClick={handleContainerClick}
      >
        <div className={styles.field}>
          {/* Filled background */}
          {variant === 'filled' && (
            <>
              <span className={styles.background} aria-hidden="true" />
              <span className={styles.stateLayer} aria-hidden="true" />
              <span className={styles.activeIndicator} aria-hidden="true" />
            </>
          )}

          {/* Outlined border (3-part: start / notch / end) */}
          {variant === 'outlined' && (
            <div className={styles.outline} aria-hidden="true">
              <div className={styles.outlineStart} />
              <div className={styles.outlineNotch}>
                {labelText && (
                  <span className={styles.outlineLabel}>{labelText}</span>
                )}
              </div>
              <div className={styles.outlineEnd} />
            </div>
          )}

          {/* Start icon */}
          {startIcon && (
            <span className={styles.leadingIcon}>{startIcon}</span>
          )}

          {/* Middle section: label + content */}
          <div className={styles.middle}>
            {/* Label (positioned absolutely within middle) */}
            {labelText && (
              <label className={styles.label} htmlFor={inputId}>
                {labelText}
              </label>
            )}

            {/* Input content */}
            <div className={styles.content}>
              {prefixText && (
                <span className={styles.prefix} id={prefixId}>
                  {prefixText}
                </span>
              )}
              {multiline ? (
                <textarea
                  {...(passthroughInputProps as TextareaHTMLAttributes<HTMLTextAreaElement>)}
                  {...(definedControlProps as TextareaHTMLAttributes<HTMLTextAreaElement> & { ref: typeof setRefs })}
                  rows={rows}
                />
              ) : (
                <input
                  {...passthroughInputProps}
                  {...(definedControlProps as InputHTMLAttributes<HTMLInputElement> & { ref: typeof setRefs })}
                  type={type}
                />
              )}
              {suffixText && (
                <span className={styles.suffix} id={suffixId}>
                  {suffixText}
                </span>
              )}
            </div>
          </div>

          {/* End icon */}
          {endIcon && (
            <span className={styles.trailingIcon}>{endIcon}</span>
          )}
        </div>

        {/* Supporting text */}
        {showSupportingText && (
          <div className={styles.supportingText} id={supportingId}>
            {/* Only the error message is the alert — the counter updates on
                every keystroke and must not be announced as one. */}
            <span role={showErrorText ? 'alert' : undefined}>
              {displaySupportingText}
            </span>
            {/* Separates the two parts in the accessible description; the
                flex container ignores it visually. */}
            {counterText && ' '}
            {counterText && (
              <span className={styles.counter}>
                <span aria-hidden="true">{counterText}</span>
                <span className={styles.visuallyHidden}>
                  {getCounterLabel(currentValue.length, maxLength!)}
                </span>
              </span>
            )}
          </div>
        )}
      </div>
    )
  },
)
