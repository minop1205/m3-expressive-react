import {
  forwardRef,
  useCallback,
  useContext,
  type ChangeEvent,
  type InputHTMLAttributes,
  type Ref,
} from 'react'
import clsx from 'clsx'
import { RadioGroupContext } from './RadioGroup'
import styles from './Radio.module.css'

export interface RadioProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange' | 'children'> {
  /** Controlled checked state. */
  checked?: boolean
  /**
   * Uncontrolled initial checked state (native input behavior — the browser
   * manages group exclusivity for radios sharing a `name`).
   */
  defaultChecked?: boolean
  /**
   * Fires with the native event and this radio's `value` (as a string — the
   * same value a wrapping `RadioGroup` reports) when the radio is selected.
   */
  onChange?: (event: ChangeEvent<HTMLInputElement>, value: string) => void
  /** Ref to the native `<input>` element (the forwarded `ref` points at the root). */
  inputRef?: Ref<HTMLInputElement>
}

/**
 * Material Design 3 Radio Button.
 *
 * Uses a native `<input type="radio">` for proper form integration and
 * accessibility. The visual outer ring, inner dot, and state layer are rendered
 * via CSS on sibling spans. Structure mirrors material-web.
 *
 * MUI parity: the forwarded `ref` points at the ROOT `<span>`; `inputRef`
 * reaches the native `<input>`.
 */
export const Radio = forwardRef<HTMLSpanElement, RadioProps>(
  function Radio(
    {
      checked,
      onChange,
      disabled: disabledProp = false,
      value,
      name,
      className,
      inputRef,
      ...rest
    },
    forwardedRef,
  ) {
    // Inside a RadioGroup the group manages name/checked/disabled; standalone
    // radios keep their own props (native uncontrolled behavior included).
    const group = useContext(RadioGroupContext)
    const disabled = disabledProp || (group?.disabled ?? false)
    const groupChecked =
      group != null && value !== undefined ? group.value === String(value) : undefined
    const resolvedChecked = group != null ? (groupChecked ?? false) : checked

    const handleChange = useCallback(
      (event: ChangeEvent<HTMLInputElement>) => {
        onChange?.(event, event.target.value)
        if (group != null && value !== undefined) {
          group.onSelect(event, String(value))
        }
      },
      [onChange, group, value],
    )

    return (
      <span
        ref={forwardedRef}
        className={clsx(styles.radio, disabled && styles.disabled, className)}
      >
        <input
          ref={inputRef}
          {...rest}
          type="radio"
          className={styles.input}
          name={group?.name ?? name}
          value={value}
          checked={resolvedChecked}
          disabled={disabled}
          onChange={handleChange}
        />
        <span className={styles.container} aria-hidden="true">
          <svg className={styles.icon} viewBox="0 0 20 20">
            <circle className={styles.outer} cx="10" cy="10" r="9" fill="none" strokeWidth="2" />
            <circle className={styles.inner} cx="10" cy="10" r="5" />
          </svg>
        </span>
        <span className={styles.stateLayer} aria-hidden="true" />
        <span className={styles.focusRing} aria-hidden="true" />
      </span>
    )
  },
)
