import {
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
} from 'react'
import clsx from 'clsx'
import { Ripple } from '../../primitives/Ripple/Ripple'
import { FocusRing } from '../../primitives/FocusRing/FocusRing'
import styles from './SegmentedButton.module.css'

export interface SegmentedButtonOption {
  value: string
  label?: ReactNode
  icon?: ReactNode
  disabled?: boolean
}

export interface SegmentedButtonsProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** The segments. */
  options: SegmentedButtonOption[]
  /** Selected value (string) — or an array of values when `multiSelect`. */
  value: string | string[]
  /** Fires with the next selection (string, or string[] when `multiSelect`). */
  onChange: (value: string | string[]) => void
  /** Allow selecting multiple segments. @default false */
  multiSelect?: boolean
  /** Disable the whole group. */
  disabled?: boolean
  /** Show a check icon on selected segments. @default true */
  showSelectedCheck?: boolean
}

const CheckIcon = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
  </svg>
)

/**
 * Material Design 3 Segmented Buttons (single- or multi-select).
 *
 * A 40dp stadium row of outlined segments (Outline 1dp). Selected segments fill
 * with SecondaryContainer / OnSecondaryContainer and show an 18dp check;
 * unselected are transparent with OnSurface content — per Compose
 * OutlinedSegmentedButtonTokens. Segments are toggle buttons (aria-pressed).
 */
export const SegmentedButtons = forwardRef<HTMLDivElement, SegmentedButtonsProps>(
  function SegmentedButtons(
    {
      options,
      value,
      onChange,
      multiSelect = false,
      disabled = false,
      showSelectedCheck = true,
      className,
      ...rest
    },
    ref,
  ) {
    const selectedValues = Array.isArray(value) ? value : [value]
    const isSelected = (v: string) => selectedValues.includes(v)

    const handleClick = (v: string) => {
      if (multiSelect) {
        const set = new Set(selectedValues)
        if (set.has(v)) set.delete(v)
        else set.add(v)
        onChange([...set])
      } else {
        onChange(v)
      }
    }

    return (
      <div
        ref={ref}
        {...rest}
        role="group"
        className={clsx(styles.group, className)}
      >
        {options.map((option) => {
          const selected = isSelected(option.value)
          const segDisabled = disabled || option.disabled
          const showCheck = selected && showSelectedCheck
          const leading = showCheck ? CheckIcon : option.icon

          return (
            <button
              key={option.value}
              type="button"
              disabled={segDisabled}
              aria-pressed={selected}
              data-selected={selected || undefined}
              className={styles.segment}
              onClick={() => handleClick(option.value)}
            >
              {leading != null && (
                <span className={styles.icon} aria-hidden="true">
                  {leading}
                </span>
              )}
              {option.label != null && (
                <span className={styles.label}>{option.label}</span>
              )}
              {!segDisabled && <Ripple />}
              {!segDisabled && <FocusRing />}
            </button>
          )
        })}
      </div>
    )
  },
)
