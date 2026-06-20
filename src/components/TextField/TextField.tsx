import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react'
import clsx from 'clsx'
import styles from './TextField.module.css'

export type TextFieldVariant = 'filled' | 'outlined'

export interface TextFieldProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement>,
    'children'
  > {
  variant?: TextFieldVariant
  label?: string
  supportingText?: string
  errorText?: string
  error?: boolean
  leadingIcon?: ReactNode
  trailingIcon?: ReactNode
  prefixText?: string
  suffixText?: string
  maxLength?: number
  multiline?: boolean
  rows?: number
}

export const TextField = forwardRef<
  HTMLInputElement | HTMLTextAreaElement,
  TextFieldProps
>(function TextField(
  {
    variant = 'filled',
    label,
    supportingText,
    errorText,
    error = false,
    leadingIcon,
    trailingIcon,
    prefixText,
    suffixText,
    maxLength,
    multiline = false,
    rows = 2,
    disabled = false,
    className,
    value: controlledValue,
    defaultValue,
    onChange,
    onFocus,
    onBlur,
    id: providedId,
    ...rest
  },
  forwardedRef,
) {
  const generatedId = useId()
  const inputId = providedId ?? generatedId
  const supportingId = `${inputId}-supporting`

  const [focused, setFocused] = useState(false)
  const [internalValue, setInternalValue] = useState(
    (defaultValue as string) ?? '',
  )
  const isControlled = controlledValue !== undefined
  const currentValue = isControlled
    ? (controlledValue as string)
    : internalValue
  const populated = currentValue.length > 0

  const internalRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  const setRefs = useCallback(
    (el: HTMLInputElement | HTMLTextAreaElement | null) => {
      (internalRef as React.MutableRefObject<typeof el>).current = el
      if (typeof forwardedRef === 'function') {
        forwardedRef(el)
      } else if (forwardedRef) {
        (forwardedRef as React.MutableRefObject<typeof el>).current = el
      }
    },
    [forwardedRef],
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

  // Auto-resize textarea
  useEffect(() => {
    if (multiline && internalRef.current) {
      const el = internalRef.current as HTMLTextAreaElement
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    }
  }, [multiline, currentValue])

  const handleContainerClick = useCallback(() => {
    internalRef.current?.focus()
  }, [])

  const showError = error && !disabled
  const showSupportingText =
    supportingText || (showError && errorText) || maxLength != null
  const displaySupportingText =
    showError && errorText ? errorText : supportingText
  const counterText =
    maxLength != null ? `${currentValue.length} / ${maxLength}` : undefined

  const labelText = label
    ? `${label}${rest.required ? '*' : ''}`
    : undefined

  const inputProps = {
    ref: setRefs,
    id: inputId,
    className: styles.input,
    value: currentValue,
    disabled,
    onChange: handleChange,
    onFocus: handleFocus,
    onBlur: handleBlur,
    'aria-invalid': showError || undefined,
    'aria-describedby': showSupportingText ? supportingId : undefined,
    maxLength,
    ...rest,
  }

  return (
    <div
      className={clsx(
        styles.textField,
        styles[variant],
        focused && styles.focused,
        populated && styles.populated,
        showError && styles.error,
        disabled && styles.disabled,
        leadingIcon && styles.hasLeadingIcon,
        trailingIcon && styles.hasTrailingIcon,
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

        {/* Leading icon */}
        {leadingIcon && (
          <span className={styles.leadingIcon}>{leadingIcon}</span>
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
              <span className={styles.prefix}>{prefixText}</span>
            )}
            {multiline ? (
              <textarea
                {...(inputProps as React.TextareaHTMLAttributes<HTMLTextAreaElement> & { ref: typeof setRefs })}
                rows={rows}
              />
            ) : (
              <input {...(inputProps as React.InputHTMLAttributes<HTMLInputElement> & { ref: typeof setRefs })} />
            )}
            {suffixText && (
              <span className={styles.suffix}>{suffixText}</span>
            )}
          </div>
        </div>

        {/* Trailing icon */}
        {trailingIcon && (
          <span className={styles.trailingIcon}>{trailingIcon}</span>
        )}
      </div>

      {/* Supporting text */}
      {showSupportingText && (
        <div
          className={styles.supportingText}
          id={supportingId}
          role={showError && errorText ? 'alert' : undefined}
        >
          <span>{displaySupportingText}</span>
          {counterText && (
            <span className={styles.counter}>{counterText}</span>
          )}
        </div>
      )}
    </div>
  )
})
