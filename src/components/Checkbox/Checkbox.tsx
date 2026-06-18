import {
  forwardRef,
  useCallback,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
} from 'react'
import clsx from 'clsx'
import styles from './Checkbox.module.css'

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange' | 'children'> {
  /** Controlled checked state. */
  checked?: boolean
  /** Uncontrolled initial checked state. @default false */
  defaultChecked?: boolean
  /** Indeterminate (mixed) state. @default false */
  indeterminate?: boolean
  /** Fires with the next checked state and the native event on toggle. */
  onChange?: (checked: boolean, event: ChangeEvent<HTMLInputElement>) => void
  /** Error state. @default false */
  error?: boolean
}

/**
 * Material Design 3 Checkbox.
 *
 * Uses a native `<input type="checkbox">` for proper form integration and
 * accessibility. The visual container, checkmark, and state layer are rendered
 * via CSS on sibling spans. Structure mirrors material-web.
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox(
    {
      checked,
      defaultChecked = false,
      indeterminate = false,
      onChange,
      error = false,
      disabled = false,
      className,
      ...rest
    },
    forwardedRef,
  ) {
    const isControlled = checked !== undefined
    const [internalChecked, setInternalChecked] = useState(defaultChecked)
    const isChecked = isControlled ? checked : internalChecked

    const handleChange = useCallback(
      (event: ChangeEvent<HTMLInputElement>) => {
        const next = !isChecked
        if (!isControlled) setInternalChecked(next)
        onChange?.(next, event)
      },
      [isChecked, isControlled, onChange],
    )

    const state = indeterminate ? 'indeterminate' : isChecked ? 'checked' : 'unchecked'

    return (
      <span
        className={clsx(
          styles.checkbox,
          styles[state],
          disabled && styles.disabled,
          error && styles.error,
          className,
        )}
      >
        <input
          ref={forwardedRef}
          {...rest}
          type="checkbox"
          className={styles.input}
          checked={isChecked}
          disabled={disabled}
          onChange={handleChange}
        />
        <span className={styles.container} aria-hidden="true">
          <span className={styles.outline} />
          <span className={styles.background} />
          <svg className={styles.icon} viewBox="0 0 18 18">
            {indeterminate ? (
              <rect className={styles.mark} x="3" y="8" width="12" height="2" rx="0.5" />
            ) : (
              <polyline
                className={styles.mark}
                points="3.5,9 7.5,13 14.5,5"
                fill="none"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </svg>
        </span>
        <span className={styles.stateLayer} aria-hidden="true" />
        <span className={styles.focusRing} aria-hidden="true" />
      </span>
    )
  },
)
