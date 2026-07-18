import {
  forwardRef,
  useCallback,
  useContext,
  type ChangeEvent,
  type InputHTMLAttributes,
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
  /** Fires with the native event when the radio is selected. */
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void
}

/**
 * Material Design 3 Radio Button.
 *
 * Uses a native `<input type="radio">` for proper form integration and
 * accessibility. The visual outer ring, inner dot, and state layer are rendered
 * via CSS on sibling spans. Structure mirrors material-web.
 */
export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  function Radio(
    {
      checked,
      onChange,
      disabled: disabledProp = false,
      value,
      name,
      className,
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
        onChange?.(event)
        if (group != null && value !== undefined) {
          group.onSelect(event, String(value))
        }
      },
      [onChange, group, value],
    )

    return (
      <span
        className={clsx(styles.radio, disabled && styles.disabled, className)}
      >
        <input
          ref={forwardedRef}
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
