import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
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
  /** Fires with the native event and the next checked state on toggle. */
  onChange?: (event: ChangeEvent<HTMLInputElement>, checked: boolean) => void
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

    const inputRef = useRef<HTMLInputElement | null>(null)
    const setInputRef = useCallback(
      (node: HTMLInputElement | null) => {
        inputRef.current = node
        if (typeof forwardedRef === 'function') forwardedRef(node)
        else if (forwardedRef) forwardedRef.current = node
      },
      [forwardedRef],
    )

    // Expose the mixed state to assistive tech (spec: docs/specs/checkbox.md
    // Behavior). The IDL property is not an attribute, so it must be set
    // imperatively — re-assert on every render because a user click clears
    // the native flag even when the `indeterminate` prop stays true.
    useEffect(() => {
      if (inputRef.current) inputRef.current.indeterminate = indeterminate
    })

    const handleChange = useCallback(
      (event: ChangeEvent<HTMLInputElement>) => {
        const next = !isChecked
        if (!isControlled) setInternalChecked(next)
        onChange?.(event, next)
      },
      [isChecked, isControlled, onChange],
    )

    const state = indeterminate ? 'indeterminate' : isChecked ? 'checked' : 'unchecked'

    // Previous selection state, exposed as data-prev-state so the CSS can
    // distinguish "draw in from unchecked" (dashoffset animation) from
    // "morph between check and dash" (d transition) and from an initial
    // mount (no animation) — Compose's updateTransition equivalent;
    // material-web uses the same prev-state-class technique.
    const prevStateRef = useRef(state)
    const prevState = prevStateRef.current
    useEffect(() => {
      prevStateRef.current = state
    })

    return (
      <span
        className={clsx(
          styles.checkbox,
          styles[state],
          disabled && styles.disabled,
          error && styles.error,
          className,
        )}
        data-prev-state={prevState}
      >
        <input
          ref={setInputRef}
          {...rest}
          type="checkbox"
          className={styles.input}
          checked={isChecked}
          disabled={disabled}
          onChange={handleChange}
          // Explicit "mixed" for AT (jsdom and some AT read the attribute, not
          // the IDL property); omit entirely otherwise so native checked
          // semantics win (material-web's dual-exposure technique).
          aria-checked={indeterminate ? 'mixed' : undefined}
        />
        <span className={styles.container} aria-hidden="true">
          <span className={styles.outline} />
          <span className={styles.background} />
          <svg className={styles.icon} viewBox="0 0 18 18">
            {/* One 3-point path for both marks so check <-> dash is a shape
                morph (Compose gravitationShiftFraction collapses the check
                onto the centerline), not a crossfade. The attribute is the
                cross-browser baseline; CSS `d` adds the animated morph where
                supported. */}
            <path
              className={styles.mark}
              d={indeterminate ? 'M4 9L9 9L14 9' : 'M3.5 9L7.5 13L14.5 5'}
              fill="none"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className={styles.stateLayer} aria-hidden="true" />
        <span className={styles.focusRing} aria-hidden="true" />
      </span>
    )
  },
)
